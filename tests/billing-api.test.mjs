import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const modules = new Map()
async function load(name) {
  if (modules.has(name)) return modules.get(name)
  const source = await readFile(
    new URL(`../lib/${name}.ts`, import.meta.url),
    'utf8',
  )
  let code = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText
  const dependencies = [...code.matchAll(/from ['"]\.\/([\w-]+)['"]/g)]
  for (const [statement, dependency] of dependencies)
    code = code.replace(statement, `from '${await load(dependency)}'`)
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  modules.set(name, url)
  return url
}
const {createMediaApi} = await import(await load('media-api'))
const {AuthApiError} = await import(await load('auth-api'))
const {formatPaisa,consumptionRules} = await import(await load('billing'))
const {persistFinancialIntent,readFinancialIntent,sendFinancialIntent} = await import(await load('finance-actions'))
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const json = (value,status=200) => new Response(JSON.stringify(value),{status})
const memory = () => {const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}}
const change = {operation:'adjustCredits',resourceId:id(1),body:{amount:2,reason:'Explicit offline unit test'}}
const transaction = {id:id(2),operation:'ADMIN_ADJUST',available_delta:2,reserved_delta:0,available_after:7,reserved_after:0,reservation_id:null,created_at:'2026-10-14T00:00:00Z'}

test('PKR integer formatting does not round financial amounts',()=>{
  assert.equal(formatPaisa(199),'PKR 1.99')
  assert.equal(formatPaisa(0),'PKR 0.00')
  assert.throws(()=>formatPaisa(1.1));assert.throws(()=>formatPaisa(-1))
})

test('staff price edits preserve lifetime and retired-purchase restrictions',()=>{
  const rules=consumptionRules({minimum_job_credits:'60',credits_per_minute:'5',credits_per_output:'2',
    credits_per_edit:'2',captions_credits:'0',reframe_credits:'0',max_source_seconds:'300',max_outputs:'1',
    max_edits:'0',max_concurrent_jobs:'1',daily_credits:'60',monthly_credits:'60'},
    {purchasable:false,lifetime_output_limit:1})
  assert.equal(rules.purchasable,false)
  assert.equal(rules.lifetime_output_limit,1)
  assert.equal(rules.max_source_seconds,300)
})
test('billing and staff reads use existing cookies, no-store and bounded pagination',async()=>{
  const seen=[]
  const client=createMediaApi({origin:'https://api.example.com',fetch:async(url,options)=>{seen.push({url,...options});return json({items:[],next_cursor:null})}})
  await client.call('reservations',{query:{limit:20,cursor:id(1)}})
  await client.call('customers',{query:{limit:20,search:'name@example.com'}})
  assert.match(seen[0].url,/me\/credit-reservations/)
  assert.match(seen[1].url,/admin\/customers/)
  assert.equal(seen[0].credentials,'include');assert.equal(seen[0].cache,'no-store')
  await assert.rejects(client.call('customers',{query:{limit:101}}))
  await assert.rejects(client.call('customers',{query:{cursor:'invalid'}}))
})
test('backend permission denial and expiry never produce administrative data',async()=>{
  let expired=0
  for (const status of [401,403]) {
    const client=createMediaApi({origin:'https://api.example.com',onUnauthorized:()=>expired++,fetch:async()=>json({code:status===403?'forbidden':'authentication_required'},status)})
    await assert.rejects(client.call('adminOverview'),error=>error.status===status)
  }
  assert.equal(expired,1)
})
test('malformed or negative reservation amounts fail closed',async()=>{
  const client=createMediaApi({origin:'https://api.example.com',fetch:async()=>json({items:[{id:id(1),job_id:id(2),credits:-1,state:'HELD',created_at:'2026-10-14T00:00:00Z',updated_at:'2026-10-14T00:00:00Z'}],next_cursor:null})})
  await assert.rejects(client.call('reservations'),error=>error.code==='invalid_response')
})
test('uncertain financial mutations retain the identical payload and key through reload',async()=>{
  const storage=memory(), intent=persistFinancialIntent(id(99),change,storage),calls=[]
  const api={call:async(name,args)=>{calls.push({name,...args});throw new AuthApiError(0,'timeout')}}
  await assert.rejects(sendFinancialIntent(id(99),intent,storage,api))
  const reloaded=readFinancialIntent(id(99),storage)
  await assert.rejects(sendFinancialIntent(id(99),reloaded,storage,api))
  assert.deepEqual(calls[0],calls[1])
  assert.throws(()=>persistFinancialIntent(id(99),change,storage))
  assert.equal(readFinancialIntent(id(98),storage),null)
})
test('audited successful response clears only the matching administrator intent',async()=>{
  const storage=memory(),intent=persistFinancialIntent(id(99),change,storage)
  let csrf=0
  const api=createMediaApi({origin:'https://api.example.com',authorize:async fn=>{csrf++;return fn('token')},fetch:async(url,args)=>{
    assert.equal(args.headers['Idempotency-Key'],intent.key)
    assert.equal(args.headers['X-CSRF-Token'],'token')
    assert.deepEqual(JSON.parse(args.body),change.body)
    return json(transaction)
  }})
  await sendFinancialIntent(id(99),intent,storage,api)
  assert.equal(csrf,1);assert.equal(readFinancialIntent(id(99),storage),null)
})
test('malformed success remains unresolved instead of manufacturing a successful change',async()=>{
  const storage=memory(),intent=persistFinancialIntent(id(99),change,storage)
  const api=createMediaApi({origin:'https://api.example.com',authorize:fn=>fn('token'),fetch:async()=>json({ok:true})})
  await assert.rejects(sendFinancialIntent(id(99),intent,storage,api),error=>error.code==='invalid_response')
  assert.deepEqual(readFinancialIntent(id(99),storage),{...intent,uncertain:true})
})
test('conclusive validation rejection allows correction without an uncertain duplicate',async()=>{
  const storage=memory(),intent=persistFinancialIntent(id(99),change,storage)
  await assert.rejects(sendFinancialIntent(id(99),intent,storage,{call:async()=>{throw new AuthApiError(422,'validation_failed')}}))
  assert.equal(readFinancialIntent(id(99),storage),null)
})
test('blocked browser storage prevents a financial write',()=>{
  assert.throws(()=>persistFinancialIntent(id(99),change,{getItem:()=>null,setItem:()=>{throw Error('blocked')},removeItem:()=>{}}))
})
test('financial transport exposes no checkout, refund, AI or policy-opening operation',async()=>{
  const source=await readFile(new URL('../scripts/generate-media-api.mjs',import.meta.url),'utf8')
  assert.ok(!source.includes("['post', '/api/v1/billing/orders']"))
  assert.ok(!source.includes("['post', '/api/v1/admin/limits/versions']"))
  assert.ok(!source.includes('/refund'))
})

test('a later auth rejection cannot erase an earlier uncertain financial effect',async()=>{
  const storage=memory(),intent=persistFinancialIntent(id(99),change,storage)
  await assert.rejects(sendFinancialIntent(id(99),intent,storage,{call:async()=>{throw new AuthApiError(0,'timeout')}}))
  await assert.rejects(sendFinancialIntent(id(99),intent,storage,{call:async()=>{throw new AuthApiError(401,'authentication_required')}}))
  assert.equal(readFinancialIntent(id(99),storage).key,intent.key)
  assert.equal(readFinancialIntent(id(99),storage).uncertain,true)
})
