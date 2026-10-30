import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFile} from 'node:fs/promises'
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
const {canonicalYouTubeUrl} = await import(await load('youtube-url'))
const {quoteForVideo, confirmGeneration} = await import(await load('generation-flow'))
const {createMediaApi} = await import(await load('media-api'))
const id = '10000000-0000-4000-8000-000000000001'
const body = {source_seconds: 180, output_count: 2, edit_count: 0, captions: true, reframe: true}
const quote = {id, price_version_id: id, credits: 60, request: body, expires_at: '2099-01-01T00:00:00Z'}

test('shared YouTube formats normalize to an HTTPS watch URL and drop tracking/redirect fragments', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=42s', 'https://youtu.be/aqz-KE-bpKQ?si=shared',
    'https://m.youtube.com/watch?v=aqz-KE-bpKQ', 'https://music.youtube.com/watch?v=aqz-KE-bpKQ',
    'https://www.youtube.com/shorts/aqz-KE-bpKQ', 'https://youtube.com/live/aqz-KE-bpKQ',
    'https://youtube.com/embed/aqz-KE-bpKQ', ' https://youtu.be/aqz-KE-bpKQ#t=30 ',
  ]) assert.equal(canonicalYouTubeUrl(url), 'https://www.youtube.com/watch?v=aqz-KE-bpKQ')
  for (const url of ['https://127.0.0.1/watch?v=aqz-KE-bpKQ', 'https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ',
    'http://youtube.com/watch?v=aqz-KE-bpKQ', 'https://user:pass@youtube.com/watch?v=aqz-KE-bpKQ',
    'https://youtube.com:8443/watch?v=aqz-KE-bpKQ', 'https://youtu.be/short', 'https://youtube.com/channel/aqz-KE-bpKQ',
    'https://youtube.com\\@127.0.0.1/watch?v=aqz-KE-bpKQ', 'https://youtube.com/watch?v=aqz-KE-bpKQ\n',
    'https://youtube.com/watch?v=aqz-KE-bpKQ%0A'])
    assert.throws(() => canonicalYouTubeUrl(url), {code: 'unsupported_youtube_url'})
})

test('YouTube contract targets import-link and retains rights, CSRF and idempotency', async () => {
  const seen = []
  const job = {id, video_id: id, kind: 'IMPORT', state: 'QUEUED', error_code: null, attempts: 0,
    created_at: '2026-10-28T00:00:00Z', updated_at: '2026-10-28T00:00:00Z', stage: 'QUEUED',
    progress_percent: null, estimated_credits: null, heartbeat_at: null, reservation_id: null}
  const api = createMediaApi({origin: 'http://localhost:8008', authorize: operation => operation('csrf-token'),
    fetch: async (url, options) => {seen.push({url, options}); return new Response(JSON.stringify(job), {status: 202})}})
  await api.call('importLink', {body: {url: canonicalYouTubeUrl('https://youtu.be/aqz-KE-bpKQ?si=x'), rights_attested: true}, key: 'import-key'})
  assert.equal(seen[0].url, 'http://localhost:8008/api/v1/videos/import-link')
  assert.equal(seen[0].options.headers['X-CSRF-Token'], 'csrf-token')
  assert.equal(seen[0].options.headers['Idempotency-Key'], 'import-key')
  assert.equal(JSON.parse(seen[0].options.body).rights_attested, true)
})

test('price uses validated server duration and does not start generation', async () => {
  const calls = []
  const api = {call: async (name, args) => {
    calls.push({name, args})
    if (name === 'video') return {state: 'READY', metadata_json: {duration_seconds: 180}}
    if (name === 'billingOverview') return {plan: null}
    if (name === 'quote') {assert.deepEqual(args.body, body); return quote}
    assert.fail('unexpected generation before consent')
  }}
  const result = await quoteForVideo(id, 2, new AbortController().signal, api, async () => ({available_credits: 80}))
  assert.equal(result.quote.credits, 60); assert.equal(result.balance, 80)
  assert.deepEqual(calls.map(call => call.name).sort(), ['billingOverview', 'quote', 'video'])
})

test('insufficient balance and expired quotes never dispatch a chargeable job', async () => {
  const api = {call: () => assert.fail('must not submit')}, signal = new AbortController().signal
  await assert.rejects(confirmGeneration(id, {quote, key: 'same-key', confirmed: false}, signal, api,
    async () => ({available_credits: 59})), {code: 'insufficient_credits'})
  await assert.rejects(confirmGeneration(id, {quote: {...quote, expires_at: '2020-01-01T00:00:00Z'}, key: 'same-key', confirmed: false}, signal, api), {code: 'quote_expired'})
})

test('confirmation and uncertain retries use the same quote, render flag and idempotency key', async () => {
  const seen = [], signal = new AbortController().signal
  const api = {call: async (name, args) => {seen.push({name, args}); return {id}}}
  await confirmGeneration(id, {quote, key: 'confirmed-once', confirmed: false}, signal, api, async () => ({available_credits: 60}))
  await confirmGeneration(id, {quote, key: 'confirmed-once', confirmed: true}, signal, api, () => assert.fail('a hold may already exist'))
  for (const call of seen) {
    assert.equal(call.name, 'generate'); assert.equal(call.args.key, 'confirmed-once')
    assert.deepEqual(call.args.body, {quote_id: id, auto_render: true})
  }
})
