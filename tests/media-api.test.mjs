import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
import ts from 'typescript'
const modules = new Map()
async function load(name) {
  if (modules.has(name)) return modules.get(name)
  let code = ts.transpileModule(await readFile(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022},
  }).outputText
  for (const [statement, dep] of code.matchAll(/from ['"]\.\/([\w-]+)['"]/g)) code = code.replace(statement, `from '${await load(dep)}'`)
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(name, url); return url
}
const {Sha256, hashFile, hashBlockBytes} = await import(await load('file-hash'))
const {createMediaApi} = await import(await load('media-api'))
const {createAuthClient, AuthApiError} = await import(await load('auth-api'))
const {runUpload, readUpload, uploadStorageKey, retryUpload, uploadProgressLabel} = await import(await load('resumable-upload'))
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const json = (data, status = 200) => new Response(JSON.stringify(data), {status})
const job = {id:id(1),video_id:id(2),kind:'VALIDATE',state:'QUEUED',error_code:null,attempts:0,created_at:'2026-10-13T00:00:00Z',updated_at:'2026-10-13T00:00:00Z',stage:'QUEUED',progress_percent:null,estimated_credits:0,heartbeat_at:null,reservation_id:null}

test('incremental SHA-256 agrees with native crypto at padding and block boundaries', async () => {
  for (const size of [0,1,55,56,63,64,65,127,128,129,1048599]) {
    const data = randomBytes(size), hash = new Sha256()
    for (let i=0;i<size;i+=37) hash.update(data.subarray(i,i+37))
    const expected = createHash('sha256').update(data).digest('hex')
    assert.equal(hash.digest(),expected)
    assert.equal(await hashFile(new Blob([data])),expected)
  }
})
test('file hashing reads bounded slices, reports real bytes and aborts promptly', async () => {
  const data = randomBytes(hashBlockBytes * 3 + 7), blob = new Blob([data]), sizes = [], progress = []
  const file = {size: blob.size, arrayBuffer: () => assert.fail('whole-file read'), slice(start,end) {sizes.push(end-start); return blob.slice(start,end)}}
  assert.equal(await hashFile(file, undefined, bytes => progress.push(bytes)),createHash('sha256').update(data).digest('hex'))
  assert.ok(sizes.every(size => size <= hashBlockBytes)); assert.equal(progress.at(-1), data.length)
  const controller = new AbortController()
  await assert.rejects(hashFile(file, controller.signal, () => controller.abort()), {name:'AbortError'})
})
test('generated contracts drive cookies, CSRF, keys, binary parts and real response validation', async () => {
  const calls = [], digest = 'a'.repeat(64)
  const api = createMediaApi({origin:'http://localhost:8008', authorize: operation => operation('security-token'), fetch: async (url, options) => {
    calls.push({url, ...options})
    if (options.method === 'PUT') return json({number:0,size_bytes:3,sha256:digest})
    return json(job, 202)
  }})
  await api.call('generate',{params:{video_id:id(2)},body:{quote_id:id(3)},key:'confirmed-request'})
  const part = new Blob(['abc'])
  await api.call('part',{params:{upload_id:id(4),part_number:0},binary:part,sha256:digest})
  assert.equal(calls[0].url,`http://localhost:8008/api/v1/videos/${id(2)}/generate`)
  assert.equal(calls[0].headers['Idempotency-Key'],'confirmed-request')
  assert.deepEqual(JSON.parse(calls[0].body),{quote_id:id(3)})
  assert.equal(calls[1].body,part); assert.equal(calls[1].headers['X-Content-SHA256'],digest)
  assert.equal(calls[1].headers['Content-Type'],'application/octet-stream')
  for (const call of calls) {assert.equal(call.credentials,'include'); assert.equal(call.cache,'no-store'); assert.equal(call.headers['X-CSRF-Token'],'security-token')}
  await assert.rejects(api.call('initiate',{body:{size_bytes:3,sha256:digest,rights_attested:false},key:'test'}),{code:'invalid_request'})
  await assert.rejects(api.call('generate',{params:{video_id:'../../admin'},body:{quote_id:id(3)},key:'test'}),{code:'invalid_request'})
  assert.equal(calls.length,2)
})
test('unexpected progress/unsafe credit integers fail; actual errors never become success', async () => {
  for (const response of [{...job,progress_percent:101},{...job,estimated_credits:Number.MAX_SAFE_INTEGER+1}]) {
    const api = createMediaApi({origin:'http://localhost:8008',fetch:async()=>json(response)})
    await assert.rejects(api.call('job',{params:{job_id:id(1)}}),{code:'invalid_response'})
  }
  let unauthorized = 0
  const api = createMediaApi({origin:'http://localhost:8008', onUnauthorized:()=>unauthorized++,fetch:async()=>json({code:'authentication_required'},401)})
  await assert.rejects(api.call('job',{params:{job_id:id(1)}}),{status:401}); assert.equal(unauthorized,1)
  const controller = new AbortController()
  const late = createMediaApi({origin:'http://localhost:8008',onUnauthorized:()=>unauthorized++,fetch:async()=>{controller.abort();return json({code:'authentication_required'},401)}})
  await assert.rejects(late.call('job',{params:{job_id:id(1)},signal:controller.signal}),{name:'AbortError'}); assert.equal(unauthorized,1)
})
test('CSRF and media mutations serialize with authentication; aborted queued requests do not send', async () => {
  let release, requests = 0
  const auth = createAuthClient({origin:'http://localhost:8008',fetch:async()=>json({csrf_token:'a'.repeat(43)})})
  const first = auth.withCsrf(async token=>{assert.equal(token,'a'.repeat(43));await new Promise(resolve=>{release=resolve})})
  const controller = new AbortController()
  const second = auth.withCsrf(async()=>{requests++},controller.signal)
  while (!release) await new Promise(resolve=>setTimeout(resolve,0))
  controller.abort(); release(); await first
  await assert.rejects(second,{name:'AbortError'});assert.equal(requests,0)
})
function uploadSimulator() {
  const accepted = new Set(), calls = [], file = new Blob([randomBytes(140001)])
  let uploaded = 0, complete = 0, losePart = true, loseComplete = true
  const api = {async call(name,args) {
    calls.push({name,...args})
    if (name === 'upload' || name === 'initiate') return {id:id(8),video_id:id(9),state:'OPEN',expected_bytes:file.size,part_bytes:65536,expires_at:'2099-01-01T00:00:00Z',received_parts:[...accepted]}
    if (name === 'part') {
      uploaded++; const number=args.params.part_number
      const expected = createHash('sha256').update(Buffer.from(await args.binary.arrayBuffer())).digest('hex')
      assert.equal(args.sha256,expected);accepted.add(number)
      if (losePart) {losePart=false;throw new AuthApiError(0,'network_error')}
      return {number,size_bytes:args.binary.size,sha256:expected}
    }
    if (name === 'complete') {complete++;if (loseComplete){loseComplete=false;throw new AuthApiError(0,'network_error')}return job}
    assert.fail(name)
  }}
  return {api,file,calls,accepted,counts:()=>({uploaded,complete})}
}
test('upload retries lost acknowledgments with unchanged keys/checksums and confirmed-byte progress', async () => {
  const sim=uploadSimulator(), progress=[], saved=[]
  const result=await runUpload({api:sim.api,file:sim.file,record:null,signal:new AbortController().signal,save:r=>saved.push(r),progress:p=>progress.push(p)})
  assert.equal(result.id,job.id);assert.equal(sim.counts().uploaded,4);assert.equal(sim.counts().complete,2)
  assert.ok(saved[0].initiateKey);assert.equal(saved[0].uploadId,undefined)
  assert.equal(sim.calls.filter(c=>c.name==='complete')[0].key,sim.calls.filter(c=>c.name==='complete')[1].key)
  assert.equal(progress.filter(p=>p.stage==='uploading').at(-1).bytes,sim.file.size)
})
test('resume trusts server received parts; wrong reselected file sends no requests', async () => {
  const sim=uploadSimulator(), record={sha256:await hashFile(sim.file),size:sim.file.size,initiateKey:'init',completeKey:'done',uploadId:id(8)}
  sim.accepted.add(0)
  await runUpload({api:sim.api,file:sim.file,record,signal:new AbortController().signal,save:()=>{},progress:()=>{}})
  assert.equal(sim.calls[0].name,'upload');assert.ok(sim.calls.filter(c=>c.name==='part').every(c=>c.params.part_number!==0))
  const before=sim.calls.length
  await assert.rejects(runUpload({api:sim.api,file:new Blob([randomBytes(sim.file.size)]),record,signal:new AbortController().signal,save:()=>{},progress:()=>{}}),{code:'file_mismatch'})
  assert.equal(sim.calls.length,before)
})
test('reload recovery of finalizing upload replays completion without any part writes', async () => {
  const file=new Blob(['abc']),record={sha256:await hashFile(file),size:3,initiateKey:'init',completeKey:'done',uploadId:id(8)},names=[]
  const api={async call(name,args){names.push(name);if(name==='upload')return {id:id(8),state:'FINALIZING',expected_bytes:3,part_bytes:65536,received_parts:[],expires_at:'2000-01-01T00:00:00Z'};assert.equal(args.key,'done');return job}}
  assert.equal((await runUpload({api,file,record,signal:new AbortController().signal,save:()=>{},progress:()=>{}})).id,job.id)
  assert.deepEqual(names,['upload','complete'])
})
test('retry attempts are bounded, rights/auth/credit errors never retry, and backoff is cancelable', async () => {
  for (const error of [new AuthApiError(401,'authentication_required'),new AuthApiError(409,'insufficient_credits'),new AuthApiError(422,'integrity_failed')]) {
    let calls=0
    await assert.rejects(retryUpload(async()=>{calls++;throw error},new AbortController().signal));assert.equal(calls,1)
  }
  let attempts=0
  await assert.rejects(retryUpload(async()=>{attempts++;throw new AuthApiError(503,'unavailable')},new AbortController().signal,2));assert.equal(attempts,2)
  const controller=new AbortController()
  const pending=retryUpload(async()=>{setTimeout(()=>controller.abort(),5);throw new AuthApiError(0,'network_error')},controller.signal)
  await assert.rejects(pending,{name:'AbortError'})
})
test('resume storage is per account, bounded and contains no media bytes, URL or auth token', () => {
  const data=new Map(),storage={getItem:key=>data.get(key)??null}
  data.set(uploadStorageKey(id(1)),JSON.stringify({sha256:'b'.repeat(64),size:3,initiateKey:'init',completeKey:'done',uploadId:id(8)}))
  assert.equal(readUpload(storage,id(1)).uploadId,id(8));assert.equal(readUpload(storage,id(2)),null)
  data.set(uploadStorageKey(id(2)),JSON.stringify({size:4}));assert.equal(readUpload(storage,id(2)),null)
})
test('definitively rejected initiation discards local resume intent, while an uncertain admission keeps its key', async () => {
  for (const [error, expected] of [[new AuthApiError(413,'media_too_large'),1],[new AuthApiError(0,'network_error'),0]]) {
    let discarded=0,saved=null
    const api={async call(){throw error}}
    const controller=new AbortController()
    // Stop an uncertain attempt during backoff; it must remain recoverable.
    if(error.status===0)setTimeout(()=>controller.abort(),100)
    await assert.rejects(runUpload({api,file:new Blob(['abc']),record:null,signal:controller.signal,save:record=>{saved=record},discard:()=>discarded++,progress:()=>{}}))
    assert.equal(discarded,expected);assert.ok(saved.initiateKey)
  }
})

test('100 percent checksum is followed by zero-byte initiation; a missing catalog never reports transfer or finalization', async () => {
  const progress = [], calls = []
  const api = {async call(name) {calls.push(name); throw new AuthApiError(503, 'plan_unconfigured')}}
  await assert.rejects(runUpload({api, file: new Blob(['abc']), record: null,
    signal: new AbortController().signal, save: () => {}, progress: p => progress.push(p)}), {code:'plan_unconfigured'})
  assert.deepEqual(calls, ['initiate'])
  assert.ok(progress.some(p => p.stage === 'hashing' && p.bytes === 3))
  assert.deepEqual(progress.at(-1), {stage:'initiating',bytes:0,total:3})
  assert.match(uploadProgressLabel(progress.at(-1)), /Starting your upload/)
  assert.ok(!progress.some(p => ['uploading','finalizing'].includes(p.stage)))
})

test('confirmed bytes are distinct from an accepted finalization response', async () => {
  const simulator = uploadSimulator(), progress = []
  const api = {async call(name, args) {
    if (name === 'complete') throw new AuthApiError(409, 'upload_closed')
    return simulator.api.call(name,args)
  }}
  await assert.rejects(runUpload({api,file:simulator.file,record:null,
    signal:new AbortController().signal,save:()=>{},progress:p=>progress.push(p)}), {code:'upload_closed'})
  assert.equal(progress.at(-1).stage,'finalizing')
  assert.match(uploadProgressLabel(progress.at(-1)), /Finishing your upload/)
})

test('private preview accepts honest unavailable pricing and never returns a redeemable quote', async () => {
  const body = {source_seconds:26,output_count:1,edit_count:0,captions:true,reframe:true}
  const preview = {preview_only:true,processing_enabled:false,pricing_status:'unconfigured',price_version_id:null,credits:null,request:body}
  const calls = []
  const client = createMediaApi({origin:'https://api.example.com',authorize:op=>op('test-csrf'),fetch:async (url,options)=>{
    calls.push({url,options});return json(preview)
  }})
  const result = await client.call('quotePreview',{body})
  assert.deepEqual(result,preview)
  assert.equal(calls.length,1)
  assert.equal(calls[0].url,'https://api.example.com/api/v1/jobs/quote-preview')
  assert.equal(calls[0].options.headers['X-CSRF-Token'],'test-csrf')
  assert.equal(calls[0].options.headers['Idempotency-Key'],undefined)
  assert.equal('id' in result,false)
  const bad = createMediaApi({origin:'https://api.example.com',authorize:op=>op('test-csrf'),fetch:async()=>json({...preview,processing_enabled:true})})
  await assert.rejects(bad.call('quotePreview',{body}),{code:'invalid_response'})
})
