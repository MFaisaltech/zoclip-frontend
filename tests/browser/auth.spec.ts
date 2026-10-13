import { expect, test, type Page } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { randomUUID } from 'node:crypto'

// Only the explicitly started disposable harness is accepted. Never read .env or
// point these tests at an existing deployment database/mailbox.
const root = resolve('../backend/var/phase8-auth')
const statePath = resolve(process.env.ZOCLIP_AUTH_TEST_STATE || 'missing-state')
if (!statePath.startsWith(root + sep) || !statePath.endsWith(`${sep}state.json`)) {
  throw Error('Set ZOCLIP_AUTH_TEST_STATE to the disposable auth_dev.py state.json')
}
const state = JSON.parse(readFileSync(statePath, 'utf8')) as { api_origin: string; mailbox: string }
const api = state.api_origin
if (!/^http:\/\/localhost:\d+$/.test(api) || !resolve(state.mailbox).startsWith(root + sep)) {
  throw Error('Browser tests require isolated loopback auth services')
}
const password = 'Local browser test password 47!'
const workspace = (page: Page) => page.getByRole('status').filter({ hasText: 'Signed in as' })

async function mailToken(email: string, purpose: string) {
  let found = ''
  await expect.poll(async () => {
    for (const name of await readdir(state.mailbox)) {
      if (!name.endsWith('.json')) continue
      const mail = JSON.parse(await readFile(resolve(state.mailbox, name), 'utf8'))
      if (mail.recipient === email && mail.purpose === purpose) found = mail.token
    }
    return Boolean(found)
  }, { message: 'Expected local development email' }).toBe(true)
  return found
}

async function openLogin(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
}

async function signIn(page: Page, email: string, value = password) {
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('real registration, verification, login, reload, cross-tab logout and password recovery', async ({ page, context }) => {
  const email = `auth-${randomUUID()}@example.com`
  await openLogin(page)
  await page.getByRole('button', { name: 'Create an account', exact: true }).click()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password + 'different')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.locator('p[role=alert]')).toHaveText('Your passwords do not match.')
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
  await page.getByLabel('Verification token').fill(await mailToken(email, 'verify-email'))
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await signIn(page, email, password + 'wrong')
  await expect(page.locator('p[role=alert]')).toContainText('Check your email and password')
  await signIn(page, email)
  await expect(workspace(page)).toContainText(email)
  await expect(page.getByTestId('available-credits')).toHaveText('0')
  await expect(page.getByText('No videos in this account. Add your footage from the Videos tab.', { exact: true })).toBeVisible()
  await expect(page.getByText('No jobs in this account.', { exact: true })).toBeVisible()
  await expect(page.getByText('No clips in this account.', { exact: true })).toBeVisible()
  const session = (await context.cookies(api)).find((cookie) => cookie.name === 'zoclip_session')
  // Test booleans only: never put a session cookie's value in assertion output.
  expect(Boolean(session?.httpOnly && session.sameSite === 'Lax' && session.path === '/')).toBe(true)
  expect(await page.evaluate(() => !document.cookie.includes('zoclip_session='))).toBe(true)
  expect(await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0)).toBe(true)
  await expect(page.getByRole('button', { name: 'Admin panel', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(workspace(page)).toContainText(email)
  const other = await context.newPage()
  await other.goto('/')
  await expect(workspace(other)).toContainText(email)
  await page.getByRole('button', { name: 'Log out', exact: true }).first().click()
  await expect(workspace(page)).toHaveCount(0)
  await expect(workspace(other)).toHaveCount(0)
  await other.close()
  await openLogin(page)
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send recovery link' }).click()
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  const reset = await mailToken(email, 'password-reset')
  await page.goto(`/reset-password#token=${encodeURIComponent(reset)}`)
  await expect(page.getByLabel('Recovery token')).not.toHaveValue('')
  expect(new URL(page.url()).hash === '').toBe(true)
  const nextPassword = password + ' updated'
  await page.getByLabel('New password').fill(nextPassword)
  await page.getByLabel('Confirm password').fill(nextPassword)
  await page.getByRole('button', { name: 'Reset password', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await signIn(page, email) // Old password no longer works.
  await expect(page.locator('p[role=alert]')).toContainText('Check your email and password')
  await signIn(page, email, nextPassword)
  await expect(workspace(page)).toContainText(email)
  // Revoke a real server session externally, then exercise focus revalidation.
  const csrfResponse = await context.request.get(`${api}/api/v1/auth/csrf`)
  const csrf = (await csrfResponse.json()).csrf_token
  const revoked = await context.request.post(`${api}/api/v1/auth/logout`, { headers: {
    Origin: 'http://localhost:3000', 'X-CSRF-Token': csrf,
  } })
  expect(revoked.status()).toBe(200)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('Your session has expired. Please sign in again.', { exact: true })).toBeVisible()
  await expect(workspace(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to home' }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
})

test('real backend denies missing CSRF, forged Origin and anonymous workspace access', async ({ page, context }) => {
  const anonymous = await context.request.get(`${api}/api/v1/me`)
  expect(anonymous.status()).toBe(401)
  const csrf = (await (await context.request.get(`${api}/api/v1/auth/csrf`)).json()).csrf_token
  const missing = await context.request.post(`${api}/api/v1/auth/logout`, { headers: { Origin: 'http://localhost:3000' } })
  expect(missing.status()).toBe(403)
  const forged = await context.request.post(`${api}/api/v1/auth/logout`, { headers: {
    Origin: 'https://attacker.example', 'X-CSRF-Token': csrf,
  } })
  expect(forged.status()).toBe(403)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(workspace(page)).toHaveCount(0)
})

test('verification links remove fragments and show invalid/replayed token errors', async ({ page }) => {
  await page.goto(`/verify-email#token=${'x'.repeat(43)}`)
  await expect(page.getByLabel('Verification token')).toHaveValue('x'.repeat(43))
  expect(new URL(page.url()).hash).toBe('')
  await page.getByRole('button', { name: 'Verify email', exact: true }).click()
  await expect(page.locator('p[role=alert]')).toContainText('invalid, expired, or already used')
  await expect(workspace(page)).toHaveCount(0)
})

test('session service outages and malformed identities fail closed and allow retry', async ({ page }) => {
  await page.route(`${api}/api/v1/me`, (route) => route.fulfill({ status: 503, json: { code: 'dependency_unavailable' } }))
  await page.goto('/')
  await expect(page.locator('p[role=alert]')).toContainText('temporarily unavailable')
  await expect(workspace(page)).toHaveCount(0)
  await page.unroute(`${api}/api/v1/me`)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await page.route(`${api}/api/v1/me`, (route) => route.fulfill({ json: {} }))
  await page.reload()
  await expect(page.locator('p[role=alert]')).toContainText('unexpected response')
  await expect(workspace(page)).toHaveCount(0)
})

test('pending forms prevent duplicate submissions; rate limits and CSRF errors stay actionable', async ({ page }) => {
  await openLogin(page)
  let requests = 0
  let release!: () => void
  const held = new Promise<void>((done) => { release = done })
  await page.route(`${api}/api/v1/auth/login`, async (route) => {
    requests++
    await held
    await route.fulfill({ status: 429, headers: {
      'Retry-After': '60', 'Access-Control-Expose-Headers': 'Retry-After',
    }, json: { code: 'rate_limited' } })
  })
  await signIn(page, 'rate-check@example.com')
  await expect(page.getByRole('button', { name: 'Please wait…' })).toBeDisabled()
  await expect(page.getByLabel('Email address')).toBeDisabled()
  await expect.poll(() => requests).toBe(1)
  release()
  await expect(page.locator('p[role=alert]')).toContainText('60 seconds')
  await page.unroute(`${api}/api/v1/auth/login`)
  await page.route(`${api}/api/v1/auth/login`, (route) => route.fulfill({ status: 403, json: { code: 'csrf_failed' } }))
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('p[role=alert]')).toContainText('security session changed or expired')
  await expect(workspace(page)).toHaveCount(0)
})
