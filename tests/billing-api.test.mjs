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
const {whatsappPurchase} = await import(await load('whatsapp-purchase'))
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const json = (value,status=200) => new Response(JSON.stringify(value),{status})
const memory = () => {const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}}
const change = {operation:'adjustCredits',resourceId:id(1),body:{amount:2,reason:'Explicit offline unit test'}}
const transaction = {id:id(2),operation:'ADMIN_ADJUST',available_delta:2,reserved_delta:0,available_after:7,reserved_after:0,reservation_id:null,created_at:'2026-10-14T00:00:00Z'}

test('WhatsApp purchase uses the selected current package and asks for verified instructions',()=>{
  for(const [slug,price,credits] of [['creator','1000','10,000'],['pro','2000','21,000']]) {
    const url=new URL(whatsappPurchase(slug))
    assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/923189753773')
    const text=url.searchParams.get('text')
    for(const value of [price,credits,'50 credits','verified bank/wallet','registered ZoClip email','payment screenshot','independently verify'])assert.ok(text.includes(value),value)
  }
  assert.throws(()=>whatsappPurchase('starter'))
})

test('manual account lookup encodes exact email and rejects invalid email before transport',async()=>{
  const seen=[]
  const api=createMediaApi({origin:'http://localhost:8000',fetch:async url=>{seen.push(url);return json([])}})
  await api.call('manualUsers',{query:{email:'buyer+receipt@example.com'}})
  assert.equal(new URL(seen[0]).searchParams.get('email'),'buyer+receipt@example.com')
  await assert.rejects(api.call('manualUsers',{query:{email:'not-an-email'}}))
  assert.equal(seen.length,1)
})

test('manual activation retries the original key after a lost response and uses CSRF',async()=>{
  const storage=memory(),admin=id(9),seen=[]
  const input={operation:'manualActivate',resourceId:id(1),body:{price_version_id:id(3),amount_paisa:100000,customer_name:'Alice Example',payment_reference:'BANK123456',independently_verified:true,reason:'Independently verified bank receipt'}}
  const intent=persistFinancialIntent(admin,input,storage)
  let offline=true
  const order={id:id(4),price_version_id:id(3),provider:'manual',amount_paisa:100000,currency:'PKR',credits:10000,valid_days:30,state:'PAID',expires_at:'2099-01-01T00:00:00Z',paid_at:'2026-10-30T00:00:00Z',created_at:'2026-10-30T00:00:00Z',sandbox:false,auto_renews:false}
  const api=createMediaApi({origin:'http://localhost:8000',authorize:fn=>fn('csrf-token'),fetch:async(url,options)=>{seen.push({url,options});if(offline)throw new Error('Lost response');return json({order,user_id:id(1),customer_email:'alice@example.com',customer_name:'Alice Example',plan_slug:'creator',access_starts_at:'2026-10-30T00:00:00Z',access_ends_at:'2026-11-29T00:00:00Z',reference:'BANK123456',refund:null})}})
  await assert.rejects(sendFinancialIntent(admin,intent,storage,api))
  assert.equal(readFinancialIntent(admin,storage).key,intent.key)
  assert.throws(()=>persistFinancialIntent(admin,input,storage))
  offline=false
  await sendFinancialIntent(admin,readFinancialIntent(admin,storage),storage,api)
  assert.equal(readFinancialIntent(admin,storage),null)
  for(const request of seen){assert.ok(request.url.endsWith(`/admin/manual-payments/users/${id(1)}/activate`));assert.equal(request.options.headers['Idempotency-Key'],intent.key);assert.equal(request.options.headers['X-CSRF-Token'],'csrf-token')}
})

test('manual refund binds the order path and never initiates an external transfer',async()=>{
  const storage=memory(),admin=id(9),seen=[]
  const intent=persistFinancialIntent(admin,{operation:'manualRefund',resourceId:id(4),body:{payment_reference:'REFUND123456',independently_verified:true,reason:'Verified completed external refund'}},storage)
  await sendFinancialIntent(admin,intent,storage,{call:async(name,args)=>{seen.push({name,args});return {}}})
  assert.deepEqual(seen[0].args.params,{order_id:id(4)})
  assert.equal(seen[0].name,'manualRefund')
})

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
test('financial transport exposes no gateway checkout, gateway refund or policy-opening operation',async()=>{
  const source=await readFile(new URL('../scripts/generate-media-api.mjs',import.meta.url),'utf8')
  assert.ok(!source.includes("['post', '/api/v1/billing/orders']"))
  assert.ok(!source.includes("['post', '/api/v1/admin/limits/versions']"))
  assert.ok(!source.includes('/admin/payments/{order_id}/refund'))
  assert.ok(source.includes('/admin/manual-payments/{order_id}/refund'))
})

test('a later auth rejection cannot erase an earlier uncertain financial effect',async()=>{
  const storage=memory(),intent=persistFinancialIntent(id(99),change,storage)
  await assert.rejects(sendFinancialIntent(id(99),intent,storage,{call:async()=>{throw new AuthApiError(0,'timeout')}}))
  await assert.rejects(sendFinancialIntent(id(99),intent,storage,{call:async()=>{throw new AuthApiError(401,'authentication_required')}}))
  assert.equal(readFinancialIntent(id(99),storage).key,intent.key)
  assert.equal(readFinancialIntent(id(99),storage).uncertain,true)
})
