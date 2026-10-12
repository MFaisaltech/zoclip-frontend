import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'

const root = resolve('../backend/var/phase8-auth')
const statePath = resolve(process.env.ZOCLIP_AUTH_TEST_STATE || 'missing-state')
if (
  !statePath.startsWith(root + sep) ||
  !statePath.endsWith(`${sep}state.json`)
) {
  throw Error(
    'Use a disposable auth_dev.py state, seeded with seed_workspace_test.py',
  )
}
const state = JSON.parse(readFileSync(statePath, 'utf8')) as {
  api_origin: string
}
const fixture = JSON.parse(
  readFileSync(resolve(dirname(statePath), 'workspace-fixture.json'), 'utf8'),
) as {
  password: string
  users: Record<
    'alice' | 'bob',
    {
      email: string
      id: string
      available_credits: number
      videos: string[]
      jobs: string[]
      clips: string[]
    }
  >
}
const api = state.api_origin
if (!/^http:\/\/localhost:\d+$/.test(api))
  throw Error('Only disposable loopback services are accepted')
const signedIn = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Signed in as' })
const nav = (page: Page, label: string) =>
  page
    .getByRole('navigation', { name: 'Workspace', exact: true })
    .getByRole('button', { name: label, exact: true })
const section = (page: Page, label: string) =>
  page.getByRole('region', { name: label, exact: true })
async function login(page: Page, name: 'alice' | 'bob') {
  await page.goto('/')
  const signIn = page.getByRole('button', { name: 'Sign in', exact: true })
  if (await signIn.isVisible()) await signIn.click()
  else
    await page.getByRole('button', { name: 'Try ZoClip', exact: true }).click()
  await page.getByLabel('Email address').fill(fixture.users[name].email)
  await page.getByLabel('Password', { exact: true }).fill(fixture.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(signedIn(page)).toContainText(fixture.users[name].email)
}

test('real profile, owned videos/jobs/clips, ledger, entitlements, integer prices and all cursor conventions', async ({
  page,
}) => {
  await login(page, 'alice')
  await expect(page.getByTestId('available-credits')).toHaveText('1,506')
  await expect(section(page, 'Videos').locator('article')).toHaveCount(20)
  await expect(
    page.getByText('Loaded records · not an all-time total'),
  ).toHaveCount(3)
  await expect(page.getByText('Virality score', { exact: true })).toHaveCount(0)
  await expect(
    page.getByText('Workspace fixture Bob 00', { exact: true }),
  ).toHaveCount(0)
  for (const [label, count] of [
    ['Videos', 21],
    ['Jobs', 23],
    ['Clips', 21],
  ] as const) {
    await nav(page, label).click()
    await section(page, label)
      .getByRole('button', { name: 'Load more', exact: true })
      .click()
    await expect(section(page, label).locator('article')).toHaveCount(count)
    await expect(
      section(page, label).getByText('All available records loaded.'),
    ).toBeVisible()
  }
  await expect(
    section(page, 'Clips').getByText('Workspace fixture Alice 20', {
      exact: true,
    }),
  ).toBeVisible()
  await nav(page, 'Credits & plans').click()
  const ledger = section(page, 'Credit transactions')
  await expect(ledger.locator('tbody tr')).toHaveCount(20)
  await ledger.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(ledger.locator('tbody tr')).toHaveCount(40)
  await ledger.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(ledger.locator('tbody tr')).toHaveCount(42)
  const entitlements = section(page, 'Entitlements')
  await expect(entitlements.locator('article')).toHaveCount(20)
  await entitlements
    .getByRole('button', { name: 'Load more', exact: true })
    .click()
  await expect(entitlements.locator('article')).toHaveCount(21)
  await expect(
    section(page, 'Plans').getByText('PKR 123.45', { exact: true }),
  ).toBeVisible()
  await expect(
    section(page, 'Plans').getByText('Pricing is not configured.', {
      exact: true,
    }),
  ).toHaveCount(4)
  for (const button of await section(page, 'Plans')
    .getByRole('button', { name: 'Purchases unavailable' })
    .all())
    await expect(button).toBeDisabled()
  await nav(page, 'Account').click()
  await expect(section(page, 'Profile')).toContainText(fixture.users.alice.id)
  await expect(section(page, 'Profile')).toContainText('Verified')
  await page
    .getByRole('button', { name: 'Refresh workspace', exact: true })
    .click()
  await expect(section(page, 'Profile')).toContainText(fixture.users.alice.id)
})

test('logout, another login and refresh clear the previous account data', async ({
  page,
}) => {
  await login(page, 'alice')
  await expect(
    page.getByText('Workspace fixture Alice 00', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(signedIn(page)).toHaveCount(0)
  await login(page, 'bob')
  await expect(page.getByTestId('available-credits')).toHaveText('47')
  await expect(
    page.getByText('Workspace fixture Bob 00', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Workspace fixture Alice 00', { exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await expect(signedIn(page)).toContainText(fixture.users.bob.email)
  await expect(page.getByTestId('available-credits')).toHaveText('47')
  await nav(page, 'Credits & plans').click()
  await expect(
    section(page, 'Credit transactions').locator('tbody tr'),
  ).toHaveCount(1)
  await expect(section(page, 'Entitlements')).toContainText(
    'No entitlements in this account.',
  )
})

test('independent loading, API failure, retry and malformed balance never fabricate a zero balance', async ({
  page,
}) => {
  let release!: () => void
  const held = new Promise<void>((done) => {
    release = done
  })
  await page.route(`${api}/api/v1/videos?**`, async (route) => {
    await held
    await route.continue()
  })
  await page.route(`${api}/api/v1/me/credits`, (route) =>
    route.fulfill({ status: 503, json: { code: 'dependency_unavailable' } }),
  )
  await login(page, 'alice')
  await expect(section(page, 'Videos').getByRole('status')).toHaveText(
    'Loading videos…',
  )
  await expect(
    section(page, 'Credit balance').getByRole('alert'),
  ).toContainText('temporarily unavailable')
  await expect(page.getByTestId('available-credits')).toHaveCount(0)
  await expect(section(page, 'Jobs').locator('article')).toHaveCount(20)
  release()
  await expect(section(page, 'Videos').locator('article')).toHaveCount(20)
  await page.unroute(`${api}/api/v1/videos?**`)
  await page.unroute(`${api}/api/v1/me/credits`)
  await section(page, 'Credit balance')
    .getByRole('button', { name: 'Try again' })
    .click()
  await expect(page.getByTestId('available-credits')).toHaveText('1,506')
  await page.route(`${api}/api/v1/me/credits`, (route) =>
    route.fulfill({ json: { available_credits: -1, reserved_credits: 0 } }),
  )
  await page
    .getByRole('button', { name: 'Refresh Credit balance', exact: true })
    .click()
  await expect(
    section(page, 'Credit balance').getByRole('alert'),
  ).toContainText('unexpected response')
  await expect(page.getByTestId('available-credits')).toHaveCount(0)
})

test('a real expired session on a listing immediately hides all workspace data', async ({
  page,
  context,
}) => {
  await login(page, 'alice')
  await expect(
    page.getByText('Workspace fixture Alice 00', { exact: true }),
  ).toBeVisible()
  const csrf = (
    await (await context.request.get(`${api}/api/v1/auth/csrf`)).json()
  ).csrf_token
  const result = await context.request.post(`${api}/api/v1/auth/logout`, {
    headers: { Origin: 'http://localhost:3000', 'X-CSRF-Token': csrf },
  })
  expect(result.status()).toBe(200)
  await page
    .getByRole('button', { name: 'Refresh Videos', exact: true })
    .click()
  await expect(
    page.getByText('Your session has expired. Please sign in again.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(signedIn(page)).toHaveCount(0)
  await expect(
    page.getByText('Workspace fixture Alice 00', { exact: true }),
  ).toHaveCount(0)
  await expect(page.getByTestId('available-credits')).toHaveCount(0)
})

test('cross-tab logout and account switching replace identity and all account resources', async ({
  page,
  context,
}) => {
  await login(page, 'alice')
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByTestId('available-credits')).toHaveText('1,506')
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(signedIn(other)).toHaveCount(0)
  await login(page, 'bob')
  await expect(signedIn(other)).toContainText(fixture.users.bob.email)
  await expect(other.getByTestId('available-credits')).toHaveText('47')
  await expect(
    other.getByText('Workspace fixture Alice 00', { exact: true }),
  ).toHaveCount(0)
  await other.close()
})

test('mobile navigation, empty states and disabled purchases remain usable without page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'bob')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  const mobileNav = page.getByRole('navigation', {
    name: 'Mobile workspace',
    exact: true,
  })
  await mobileNav
    .getByRole('button', { name: 'Credits & plans', exact: true })
    .click()
  await expect(
    section(page, 'Entitlements').getByText(
      'No entitlements in this account.',
      { exact: false },
    ),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await mobileNav.getByRole('button', { name: 'Account', exact: true }).click()
  await expect(section(page, 'Profile')).toContainText(fixture.users.bob.email)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await expect(
    page.getByRole('button', { name: 'Log out', exact: true }),
  ).toBeVisible()
})
