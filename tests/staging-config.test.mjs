import test from 'node:test'
import assert from 'node:assert/strict'
import {validateStagingConfig} from '../scripts/check-staging-config.mjs'

const env = {
  NEXT_PUBLIC_PRIVATE_STAGING: 'true', NEXT_PUBLIC_ENABLE_REGISTRATION: 'false',
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'false', NEXT_PUBLIC_STAGING_SITE_DOMAIN: 'example.com',
  NEXT_PUBLIC_APP_ORIGIN: 'https://app.staging.example.com',
  NEXT_PUBLIC_API_ORIGIN: 'https://api.staging.example.com:8443',
}
test('same-site tunnel origins validate without connecting', () => {
  assert.deepEqual(validateStagingConfig(env), {appOrigin: env.NEXT_PUBLIC_APP_ORIGIN,
    apiOrigin: env.NEXT_PUBLIC_API_ORIGIN})
})
for (const [key, value] of [
  ['NEXT_PUBLIC_PRIVATE_STAGING', 'false'], ['NEXT_PUBLIC_ENABLE_REGISTRATION', 'true'],
  ['NEXT_PUBLIC_ENABLE_ANALYTICS', 'true'], ['NEXT_PUBLIC_STAGING_SITE_DOMAIN', 'vercel.app'],
  ['NEXT_PUBLIC_STAGING_SITE_DOMAIN', '*.example.com'],
  ['NEXT_PUBLIC_STAGING_SITE_DOMAIN', '-invalid.example.com'],
  ['NEXT_PUBLIC_API_ORIGIN', 'https://app.staging.example.com:8443'],
  ['NEXT_PUBLIC_API_ORIGIN', 'https://-invalid.staging.example.com'],
  ['NEXT_PUBLIC_APP_ORIGIN', 'https://app.vercel.app'],
  ['NEXT_PUBLIC_API_ORIGIN', 'http://api.staging.example.com:8443'],
  ['NEXT_PUBLIC_API_ORIGIN', 'https://api.staging.example.com/path'],
  ['NEXT_PUBLIC_APP_ORIGIN', 'https://app.staging.example.com/'],
  ['NEXT_PUBLIC_API_ORIGIN', 'https://API.staging.example.com:8443'],
  ['NEXT_PUBLIC_API_ORIGIN', 'https://api.staging.example.com?query=1'],
  ['NEXT_PUBLIC_API_ORIGIN', 'https://user:password@api.staging.example.com'],
  ['NEXT_PUBLIC_API_ORIGIN', 'https://evilexample.com'],
]) test(`reject unsafe ${key}=${value}`, () => assert.throws(() => validateStagingConfig({...env, [key]: value})))

test('staging headers permit only the exact API connect origin', async () => {
  Object.assign(process.env, env)
  const {default: config} = await import('../next.config.mjs')
  const [rule] = await config.headers()
  const headers = Object.fromEntries(rule.headers.map(({key, value}) => [key, value]))
  assert.equal(headers['X-Frame-Options'], 'DENY')
  assert.match(headers['X-Robots-Tag'], /noindex/)
  assert.ok(headers['Content-Security-Policy'].includes(`connect-src 'self' ${env.NEXT_PUBLIC_API_ORIGIN};`))
  assert.ok(!headers['Content-Security-Policy'].includes('https://*'))
})
