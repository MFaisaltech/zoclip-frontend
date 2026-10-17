import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, {compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
}}).outputText
const data = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const auth = data(compile(await readFile(new URL('../lib/auth-api.ts', import.meta.url), 'utf8')))
const source = compile(await readFile(new URL('../lib/staging-access.ts', import.meta.url), 'utf8'))
const {verifyPrivateApiAccess} = await import(data(source.replace("'./auth-api'", JSON.stringify(auth))))
const options = {appOrigin: 'https://app.staging.example.com', apiOrigin: 'https://api.staging.example.com:8443', currentOrigin: 'https://app.staging.example.com'}
test('private access probes readiness once from browser using exact TLS origin', async () => {
  const calls = []
  await verifyPrivateApiAccess({...options, fetch: async (url, init) => {
    calls.push({url, init})
    return Response.json({status: 'ready'})
  }})
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, options.apiOrigin + '/health/ready')
  assert.equal(calls[0].init.method, 'GET')
  assert.equal(calls[0].init.redirect, 'error')
  assert.equal(calls[0].init.credentials, 'include')
  assert.equal(calls[0].init.body, undefined)
})
test('generated frontend URL and insecure API cannot trigger a request', async () => {
  let calls = 0
  const fetch = async () => {calls++; return Response.json({status: 'ready'})}
  await assert.rejects(verifyPrivateApiAccess({...options, fetch, currentOrigin: 'https://generated.vercel.app'}))
  await assert.rejects(verifyPrivateApiAccess({...options, fetch, apiOrigin: 'http://127.0.0.1:8443'}))
  assert.equal(calls, 0)
})
for (const [name, fetch] of [
  ['permission or connection denied', async () => {throw Error('denied')}],
  ['dependency outage', async () => Response.json({status: 'ready'}, {status: 503})],
  ['unexpected service', async () => Response.json({status: 'alive'})],
  ['timeout', async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Error('timeout'))))],
]) test(`private access fails closed without retry on ${name}`, async () => {
  let calls = 0
  await assert.rejects(verifyPrivateApiAccess({...options, timeoutMs: 5, fetch: (...args) => {calls++; return fetch(...args)}}))
  assert.equal(calls, 1)
})
