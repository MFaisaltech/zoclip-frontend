import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../lib/auth-api.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { createAuthClient, AuthApiError, authErrorMessage } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const token = 'a'.repeat(43)
const rotated = 'b'.repeat(43)
const user = { id: '6bc0d395-9a21-434d-a3f6-bb6c1fc6446b', email: 'local@example.com', verified: true, role: 'customer', created_at: '2026-10-13T00:00:00Z' }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } })
function fixture(handler) {
  const calls = []
  const client = createAuthClient({ origin: 'https://api.example.com', fetch: async (url, options) => {
    calls.push({ path: new URL(url).pathname, ...options })
    return handler(new URL(url).pathname, options, calls)
  } })
  return { client, calls }
}

test('all authentication mutations use the real endpoints, cookies and CSRF; login rotates the token', async () => {
  const { client, calls } = fixture((path) => path.endsWith('/csrf') ? json({ csrf_token: token }) : path.endsWith('/login') ? json({ user, csrf_token: rotated }) : json({ message: 'Done' }))
  await client.register({ email: user.email, password: 'long test password' })
  await client.verifyEmail({ token })
  assert.deepEqual(await client.login({ email: user.email, password: 'long test password' }), { user, csrf_token: rotated })
  await client.forgotPassword({ email: user.email })
  await client.resetPassword({ token, password: 'new long password' })
  await client.logout()
  assert.deepEqual(calls.map((call) => call.path), ['/api/v1/auth/csrf', '/api/v1/auth/register', '/api/v1/auth/verify-email', '/api/v1/auth/login', '/api/v1/auth/password/forgot', '/api/v1/auth/password/reset', '/api/v1/auth/csrf', '/api/v1/auth/logout'])
  for (const call of calls) {
    assert.equal(call.credentials, 'include')
    assert.equal(call.cache, 'no-store')
    assert.equal(call.headers.Origin, undefined) // The browser supplies its real Origin.
    assert.equal(call.headers.Authorization, undefined)
  }
  assert.equal(calls[1].headers['X-CSRF-Token'], token)
  assert.equal(calls[4].headers['X-CSRF-Token'], rotated)
  assert.deepEqual(JSON.parse(calls[1].body), { email: user.email, password: 'long test password' })
})

test('refresh restores identity with GET /me without minting CSRF or storing a bearer token', async () => {
  const { client, calls } = fixture(() => json(user))
  assert.deepEqual(await client.me(), user)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/api/v1/me')
  assert.equal(calls[0].method, 'GET')
  assert.equal(calls[0].headers['X-CSRF-Token'], undefined)
})

test('CSRF failure is not replayed; a user retry obtains a fresh token', async () => {
  let attempt = 0
  const { client, calls } = fixture((path) => path.endsWith('/csrf') ? json({ csrf_token: token }) : ++attempt === 1 ? json({ code: 'csrf_failed' }, 403) : json({ message: 'Done' }))
  await assert.rejects(client.logout(), (error) => error.status === 403)
  assert.equal(calls.length, 2)
  await client.logout()
  assert.equal(calls.length, 4)
})

test('simultaneous mutations serialize the CSRF bootstrap and login rotation', async () => {
  const { client, calls } = fixture(async (path) => {
    await new Promise((resolve) => setTimeout(resolve, 5))
    if (path.endsWith('/csrf')) return json({ csrf_token: token })
    if (path.endsWith('/login')) return json({ user, csrf_token: rotated })
    return json({ message: 'Done' })
  })
  await Promise.all([client.login({ email: user.email, password: 'long test password' }), client.logout()])
  assert.equal(calls.length, 3)
  assert.equal(calls[2].headers['X-CSRF-Token'], rotated)
})

test('expired session remains unauthorized, with a safe user-facing message', async () => {
  const { client } = fixture(() => json({ code: 'authentication_required', detail: 'never echo sensitive backend text' }, 401))
  await assert.rejects(client.me(), (error) => error.status === 401 && authErrorMessage(error).includes('expired'))
})

test('rate limits expose bounded Retry-After and do not retry automatically', async () => {
  const { client, calls } = fixture(() => json({ code: 'rate_limited' }, 429, { 'Retry-After': '60' }))
  await assert.rejects(client.register({ email: user.email, password: 'long test password' }), (error) => error.retryAfter === 60 && authErrorMessage(error).includes('60 seconds'))
  assert.equal(calls.length, 1)
})

test('server failures and non-JSON responses are safe and retryable by the user', async () => {
  const { client } = fixture(() => new Response('<html>private server stack</html>', { status: 503 }))
  await assert.rejects(client.me(), (error) => authErrorMessage(error).includes('temporarily unavailable') && !authErrorMessage(error).includes('private'))
  const malformed = fixture(() => json(null))
  await assert.rejects(malformed.client.me(), (error) => error.code === 'invalid_response')
})

test('network failures and timeouts report uncertain outcomes without replay', async () => {
  const client = createAuthClient({ origin: 'https://api.example.com', fetch: async () => { throw Error('private connection details') } })
  await assert.rejects(client.me(), (error) => error.code === 'network_error' && !authErrorMessage(error).includes('private'))
  const slow = createAuthClient({ origin: 'https://api.example.com', timeoutMs: 5, fetch: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted')))) })
  await assert.rejects(slow.me(), (error) => error.code === 'timeout')
})

test('API origin rejects paths, credentials, queries, insecure external URLs and missing production config', async () => {
  for (const origin of ['https://api.example.com/path', 'https://user:pass@api.example.com', 'https://api.example.com?secret=x', 'http://api.example.com', 'file:///etc/passwd']) {
    const client = createAuthClient({ origin, fetch: async () => { assert.fail('Must reject before fetching') } })
    await assert.rejects(client.me(), (error) => error.code === 'api_unconfigured')
  }
  const previous = process.env.NODE_ENV
  const previousOrigin = process.env.NEXT_PUBLIC_API_ORIGIN
  try {
    process.env.NODE_ENV = 'production'
    delete process.env.NEXT_PUBLIC_API_ORIGIN
    await assert.rejects(createAuthClient().me(), (error) => error instanceof AuthApiError && error.code === 'api_unconfigured')
    await assert.rejects(createAuthClient({ origin: 'http://localhost:8000' }).me(), (error) => error.code === 'api_unconfigured')
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous
    if (previousOrigin === undefined) delete process.env.NEXT_PUBLIC_API_ORIGIN; else process.env.NEXT_PUBLIC_API_ORIGIN = previousOrigin
  }
})

test('session rotation updates CSRF; clearing it forces the next mutation to bootstrap', async () => {
  const { client, calls } = fixture((path) => json({ csrf_token: path.endsWith('/rotate') ? rotated : token }))
  await client.rotate()
  client.clearCsrf()
  await client.rotate()
  assert.deepEqual(calls.map((call) => call.path), ['/api/v1/auth/csrf', '/api/v1/auth/session/rotate', '/api/v1/auth/csrf', '/api/v1/auth/session/rotate'])
})

test('malformed success responses never establish a session or claim a mutation succeeded', async () => {
  for (const value of [{}, [], { ...user, verified: false }, { ...user, role: 'owner' }, { ...user, created_at: 'bad date' }]) {
    await assert.rejects(fixture(() => json(value)).client.me(), (error) => error.code === 'invalid_response')
  }
  const malformed = fixture((path) => path.endsWith('/csrf') ? json({ csrf_token: token }) : json({ user, csrf_token: 'bad' }))
  await assert.rejects(malformed.client.login({ email: user.email, password: 'long test password' }), (error) => error.code === 'invalid_response')
  await assert.rejects(fixture(() => json({ csrf_token: '<invalid csrf token>' })).client.logout(), (error) => error.code === 'invalid_response')
  await assert.rejects(fixture((path) => path.endsWith('/csrf') ? json({ csrf_token: token }) : json({})).client.register({ email: user.email, password: 'long test password' }), (error) => error.code === 'invalid_response')
})
