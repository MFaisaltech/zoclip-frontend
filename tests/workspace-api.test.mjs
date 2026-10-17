import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import './customer-copy.test.mjs'

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
const { createWorkspaceApi, validWorkspaceResponse } = await import(
  await load('workspace-api')
)
const { createWorkspaceResource } = await import(
  await load('workspace-resource')
)
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const now = '2026-10-13T00:00:00Z'
const video = (n) => ({
  id: id(n),
  project_id: id(999),
  state: 'READY',
  metadata_json: {},
  created_at: now,
  expires_at: now,
})
const wallet = {
  available_credits: 25,
  reserved_credits: 3,
  credit_expiry: 'disabled',
}
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers })
const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('all seven workspace reads use documented endpoints, cookies, no caching and the correct cursor convention', async () => {
  const calls = []
  const client = createWorkspaceApi({
    origin: 'https://api.example.com',
    fetch: async (url, options) => {
      calls.push({ url: new URL(url), ...options })
      return json(
        url.includes('/credits')
          ? wallet
          : url.includes('credit-transactions')
            ? { items: [], next_cursor: null }
            : [],
      )
    },
  })
  for (const name of [
    'videos',
    'jobs',
    'clips',
    'wallet',
    'transactions',
    'entitlements',
    'plans',
  ])
    await client.read(name)
  assert.deepEqual(
    calls.map((call) => call.url.pathname),
    [
      '/api/v1/videos',
      '/api/v1/jobs',
      '/api/v1/clips',
      '/api/v1/me/credits',
      '/api/v1/me/credit-transactions',
      '/api/v1/me/entitlements',
      '/api/v1/plans',
    ],
  )
  for (const call of calls) {
    assert.equal(call.method, 'GET')
    assert.equal(call.credentials, 'include')
    assert.equal(call.cache, 'no-store')
    assert.equal(call.headers, undefined)
    assert.equal(call.body, undefined)
  }
  for (const name of [
    'videos',
    'jobs',
    'clips',
    'transactions',
    'entitlements',
  ])
    await client.read(name, id(12))
  assert.deepEqual(
    calls.slice(7).map((call) => call.url.search),
    [
      `?limit=20&before=${id(12)}`,
      `?limit=20&before=${id(12)}`,
      `?limit=20&before=${id(12)}`,
      `?limit=20&cursor=${id(12)}`,
      `?limit=20&cursor=${id(12)}`,
    ],
  )
  assert.equal(calls[3].url.search, '')
  assert.equal(calls[6].url.search, '')
  await assert.rejects(
    client.read('videos', '../foreign'),
    (error) => error.code === 'invalid_response',
  )
  await assert.rejects(client.read('wallet', id(1)))
  assert.equal(calls.length, 12)
})

test('schema validation rejects malformed lists, unsafe/fractional money, missing fields and unknown fixed policies', () => {
  assert.equal(validWorkspaceResponse('videos', [video(1)]), true)
  assert.equal(
    validWorkspaceResponse('videos', [{ ...video(1), id: 'bad-id' }]),
    false,
  )
  assert.equal(validWorkspaceResponse('videos', { items: [] }), false)
  assert.equal(validWorkspaceResponse('wallet', wallet), true)
  for (const amount of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '5', null])
    assert.equal(
      validWorkspaceResponse('wallet', {
        ...wallet,
        available_credits: amount,
      }),
      false,
    )
  assert.equal(
    validWorkspaceResponse('wallet', { available_credits: 0 }),
    false,
  )
  assert.equal(
    validWorkspaceResponse('wallet', { ...wallet, credit_expiry: 'enabled' }),
    false,
  )
  assert.equal(
    validWorkspaceResponse('plans', [
      { id: id(1), slug: 'free', kind: 'plan', enabled: true, price: null },
    ]),
    true,
  )
  assert.equal(
    validWorkspaceResponse('transactions', { items: [], next_cursor: 'bad' }),
    false,
  )
  assert.equal(
    validWorkspaceResponse('transactions', {
      items: [
        {
          id: id(1),
          operation: 'ADMIN_ADJUST',
          available_delta: -1,
          reserved_delta: 0,
          available_after: -1,
          reserved_after: 0,
          reservation_id: null,
          created_at: now,
        },
      ],
      next_cursor: null,
    }),
    false,
  )
  assert.equal(
    validWorkspaceResponse('clips', [
      {
        id: id(1),
        video_id: id(2),
        job_id: id(3),
        revision: 1,
        created_at: now,
        preferences: { start_ms: 1000, end_ms: 500 },
      },
    ]),
    false,
  )
})

test('HTTP errors remain actionable and unauthorized reads invalidate the session without retrying', async () => {
  let unauthorized = 0
  let calls = 0
  const client = createWorkspaceApi({
    origin: 'https://api.example.com',
    onUnauthorized: () => unauthorized++,
    fetch: async () => {
      calls++
      return json(
        { code: 'unauthorized', detail: 'private server details' },
        401,
      )
    },
  })
  await assert.rejects(
    client.read('videos'),
    (error) => error.status === 401 && !error.message.includes('private'),
  )
  assert.equal(unauthorized, 1)
  assert.equal(calls, 1)
  const rate = createWorkspaceApi({
    origin: 'https://api.example.com',
    fetch: async () => json({}, 429, { 'Retry-After': '45' }),
  })
  await assert.rejects(
    rate.read('wallet'),
    (error) => error.status === 429 && error.retryAfter === 45,
  )
  const malformed = createWorkspaceApi({
    origin: 'https://api.example.com',
    fetch: async () => json({}),
  })
  await assert.rejects(
    malformed.read('wallet'),
    (error) => error.code === 'invalid_response',
  )
})

test('canceled previous-account responses cannot invalidate the next session', async () => {
  const pending = deferred()
  const controller = new AbortController()
  let invalidated = 0
  const client = createWorkspaceApi({
    origin: 'https://api.example.com',
    onUnauthorized: () => invalidated++,
    fetch: () => pending.promise,
  })
  const request = client.read('videos', undefined, controller.signal)
  controller.abort()
  pending.resolve(json({}, 401))
  await assert.rejects(request, (error) => error.name === 'AbortError')
  assert.equal(invalidated, 0)
})

test('timeouts and network failures are distinguished', async () => {
  const network = createWorkspaceApi({
    origin: 'https://api.example.com',
    fetch: async () => {
      throw Error('offline')
    },
  })
  await assert.rejects(
    network.read('plans'),
    (error) => error.code === 'network_error',
  )
  const timeout = createWorkspaceApi({
    origin: 'https://api.example.com',
    timeoutMs: 1,
    fetch: (_url, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener('abort', () =>
          reject(Error('aborted')),
        ),
      ),
  })
  await assert.rejects(
    timeout.read('plans'),
    (error) => error.code === 'timeout',
  )
})

test('refresh discards older responses and clears old data while loading or on error', async () => {
  const first = deferred()
  const second = deferred()
  const third = deferred()
  let n = 0
  const resource = createWorkspaceResource('wallet', {
    read: () => [first, second, third][n++].promise,
  })
  const a = resource.refresh()
  const b = resource.refresh()
  second.resolve(wallet)
  await b
  first.resolve({ ...wallet, available_credits: 999 })
  await a
  assert.equal(resource.getSnapshot().data.available_credits, 25)
  const c = resource.refresh()
  assert.equal(resource.getSnapshot().data, null)
  third.reject(Error('offline'))
  await c
  assert.equal(resource.getSnapshot().status, 'error')
  assert.equal(resource.getSnapshot().data, null)
})

test('list pagination keeps data after a page error, retries the same cursor, and deduplicates records', async () => {
  const calls = []
  let attempt = 0
  const initial = Array.from({ length: 20 }, (_, i) => video(i + 1))
  const resource = createWorkspaceResource('videos', {
    read: async (_name, cursor) => {
      calls.push(cursor)
      if (!cursor) return initial
      if (++attempt === 1) throw Error('offline')
      return [video(20), video(21)]
    },
  })
  await resource.refresh()
  assert.equal(resource.getSnapshot().cursor, id(20))
  await resource.loadMore()
  assert.equal(resource.getSnapshot().data.length, 20)
  assert.ok(resource.getSnapshot().moreError)
  await resource.loadMore()
  assert.equal(resource.getSnapshot().data.length, 21)
  assert.equal(resource.getSnapshot().cursor, null)
  assert.deepEqual(calls, [undefined, id(20), id(20)])
})

test('transaction pagination follows explicit next_cursor even for a short page', async () => {
  const resource = createWorkspaceResource('transactions', {
    read: async (_name, cursor) =>
      cursor
        ? { items: [{ id: id(2) }], next_cursor: null }
        : { items: [{ id: id(1) }], next_cursor: id(1) },
  })
  await resource.refresh()
  await resource.loadMore()
  assert.deepEqual(
    resource.getSnapshot().data.items.map((item) => item.id),
    [id(1), id(2)],
  )
  assert.equal(resource.getSnapshot().cursor, null)
})

test('dispose aborts pending reads, clears data, ignores late results, and permits a strict-mode remount', async () => {
  const pending = deferred()
  let signal
  let n = 0
  const resource = createWorkspaceResource('videos', {
    read: (_name, _cursor, value) => {
      signal = value
      return ++n === 1 ? pending.promise : Promise.resolve([])
    },
  })
  const task = resource.refresh()
  resource.dispose()
  assert.equal(signal.aborted, true)
  pending.resolve([video(1)])
  await task
  assert.equal(resource.getSnapshot().data, null)
  await resource.refresh()
  assert.deepEqual(resource.getSnapshot().data, [])
})

test('non-advancing pagination surfaces an error instead of silently looping', async () => {
  const rows = Array.from({ length: 20 }, (_, i) => video(i + 1))
  const resource = createWorkspaceResource('videos', { read: async () => rows })
  await resource.refresh()
  await resource.loadMore()
  assert.ok(resource.getSnapshot().moreError)
  assert.equal(resource.getSnapshot().data.length, 20)
})
