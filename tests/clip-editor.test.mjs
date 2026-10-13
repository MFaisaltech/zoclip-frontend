import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
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
const {clipOptions, validPreferences, timestamp, captionWords} = await import(await load('clip-editor'))
const {createMediaApi} = await import(await load('media-api'))
const id='00000000-0000-4000-8000-000000000001'
const prefs={start_ms:0,end_ms:2500,title:'Example',hashtags:[],captions:true,preset:'karaoke',font:'DejaVu Sans',placement:'bottom',frame:'pad',focal_x:500,focal_y:500,words:null}
const clip={id,video_id:id,job_id:id,revision:2,preferences:prefs,created_at:'2026-10-13T00:00:00Z'}
test('caption and framing enums exactly match implemented backend values',()=>{
  assert.deepEqual(clipOptions.preset,['classic','bold','karaoke'])
  assert.deepEqual(clipOptions.frame,['track','center','pad','manual'])
  assert.equal(timestamp(3661.125),'01:01:01.125')
})
test('trim and edited caption validation rejects invalid and overlapping absolute intervals',()=>{
  assert.equal(validPreferences(prefs,3000),true)
  for(const patch of [{end_ms:3001},{end_ms:249},{preset:'neon'},{frame:'16:9'},{start_ms:0.5},{hashtags:Array(11).fill('#x')},{words:[{text:'x',start_ms:0,end_ms:0}]},{words:[{text:'x',start_ms:0,end_ms:500},{text:'y',start_ms:499,end_ms:600}]}])assert.equal(validPreferences({...prefs,...patch},3000),false)
  assert.equal(validPreferences({...prefs,words:[]},3000),true)
})
test('caption text stays literal; transcript words intersect the saved source trim',()=>{
  const t={data:{words:[{punctuated_word:'{literal}\\text',start:0,end:1},{punctuated_word:'next',start:1,end:2}]}}
  assert.deepEqual(captionWords(t,{...prefs,start_ms:500,end_ms:1500}),[{text:'{literal}\\text',start_ms:500,end_ms:1000},{text:'next',start_ms:1000,end_ms:1500}])
})
test('revision PATCH uses quoted If-Match, serialized CSRF and the complete preference body',async()=>{
  let call
  const api=createMediaApi({origin:'http://localhost:8008',authorize:operation=>operation('csrf'),fetch:async(url,args)=>{call={url,...args};return new Response(JSON.stringify(clip),{status:200})}})
  await api.call('editClip',{params:{clip_id:id},revision:1,body:prefs})
  assert.equal(call.headers['If-Match'],'"1"');assert.equal(call.headers['X-CSRF-Token'],'csrf');assert.equal(call.method,'PATCH');assert.deepEqual(JSON.parse(call.body),prefs)
  await assert.rejects(api.call('editClip',{params:{clip_id:id},body:prefs}),{code:'invalid_request'})
})
test('transcript job selection is an encoded query parameter and invalid resource IDs never dispatch',async()=>{
  let url,calls=0
  const api=createMediaApi({origin:'http://localhost:8008',fetch:async(value)=>{url=value;calls++;return new Response(JSON.stringify({code:'transcript_unavailable'}),{status:404})}})
  await assert.rejects(api.call('transcript',{params:{video_id:id},query:{job_id:id}}),{code:'transcript_unavailable'})
  assert.ok(url.endsWith(`?job_id=${id}`))
  await assert.rejects(api.call('outputs',{params:{clip_id:'../admin'}}),{code:'invalid_request'});assert.equal(calls,1)
})
test('private MP4 download validates MIME, uses cookies and explicit revision, and propagates session expiry',async()=>{
  let call,expired=0
  const api=createMediaApi({origin:'http://localhost:8008',onUnauthorized:()=>expired++,fetch:async(url,args)=>{call={url,...args};return new Response(new Uint8Array([0,0,0,24,102,116,121,112]),{headers:{'Content-Type':'video/mp4'}})}})
  const blob=await api.call('download',{params:{clip_id:id},query:{revision:2}})
  assert.equal(blob.type,'video/mp4');assert.equal(blob.size,8);assert.equal(call.credentials,'include');assert.ok(call.url.endsWith('/download?revision=2'))
  const bad=createMediaApi({origin:'http://localhost:8008',fetch:async()=>new Response('fake success',{headers:{'Content-Type':'application/json'}})})
  await assert.rejects(bad.call('download',{params:{clip_id:id}}),{code:'invalid_response'})
  const denied=createMediaApi({origin:'http://localhost:8008',onUnauthorized:()=>expired++,fetch:async()=>new Response(JSON.stringify({code:'authentication_required'}),{status:401})})
  await assert.rejects(denied.call('download',{params:{clip_id:id}}),{status:401});assert.equal(expired,1)
})
