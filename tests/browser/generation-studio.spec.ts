import {test, expect, type Page} from '@playwright/test'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {readFileSync} from 'node:fs'

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const now = '2026-10-28T00:00:00Z'
const job = (kind: string, state = 'QUEUED') => ({id: id(kind === 'PROCESS' ? 3 : 2), video_id: id(1), kind, state,
  error_code: null, attempts: 0, created_at: now, updated_at: now, stage: state, progress_percent: null,
  estimated_credits: kind === 'PROCESS' ? 60 : 0, heartbeat_at: null, reservation_id: null})
const clip = (n: number, title: string) => ({id: id(n), video_id: id(1), job_id: id(3), revision: 1,
  preferences: {start_ms: 0, end_ms: 20000, title}, created_at: now})

async function fixture(page: Page, balance = 500) {
  const calls: {path: string; body: Record<string, unknown>; key?: string}[] = []
  let generated = false
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    let body: unknown = []
    if (request.method() === 'POST') calls.push({path, body: request.postDataJSON() ?? {}, key: request.headers()['idempotency-key']})
    if (path === '/api/v1/me') body = {id: id(90), email: 'preview@example.com', verified: true, role: 'customer', created_at: now}
    else if (path === '/api/v1/auth/csrf') body = {csrf_token: 'T'.repeat(43)}
    else if (path === '/api/v1/me/credits') body = {available_credits: balance, reserved_credits: 0, credit_expiry: 'disabled'}
    else if (path === '/api/v1/me/billing') body = {plan: null, access_source: 'unconfigured', access_ends_at: null,
      day_starts_at: now, month_starts_at: now, daily_used_credits: 0, monthly_used_credits: 0,
      held_credits: 0, held_reservations: 0, settled_credits: 0, released_credits: 0}
    else if (path === '/api/v1/videos') body = []
    else if (path === `/api/v1/videos/${id(1)}`) body = {id: id(1), project_id: id(1), state: 'READY', metadata_json: {duration_seconds: 60}, created_at: now, expires_at: '2099-01-01T00:00:00Z'}
    else if (path === '/api/v1/videos/import-link') return route.fulfill({status: 202, json: job('IMPORT')})
    else if (path === '/api/v1/uploads' && request.method() === 'POST') body = {id: id(4), video_id: id(1), state: 'OPEN', expected_bytes: request.postDataJSON().size_bytes, part_bytes: 65536, expires_at: '2099-01-01T00:00:00Z', received_parts: []}
    else if (/\/parts\/\d+$/.test(path)) {
      const data = request.postDataBuffer()!
      body = {number: Number(path.split('/').at(-1)), size_bytes: data.length, sha256: createHash('sha256').update(data).digest('hex')}
    } else if (path.endsWith('/complete')) return route.fulfill({status: 202, json: job('VALIDATE')})
    else if (path === '/api/v1/jobs/quote') body = {id: id(5), price_version_id: id(6), credits: 60, request: request.postDataJSON(), expires_at: '2099-01-01T00:00:00Z'}
    else if (path.endsWith('/generate')) {generated = true; return route.fulfill({status: 202, json: job('PROCESS')})}
    else if (path === `/api/v1/jobs/${id(2)}`) body = job('IMPORT', 'COMPLETED')
    else if (path === `/api/v1/jobs/${id(3)}`) body = job('PROCESS', 'COMPLETED')
    else if (path === '/api/v1/clips') body = [clip(10, 'The moment it clicked'), ...(generated ? [clip(11, 'A fresh perspective')] : [])]
    else if (path.endsWith('/renders')) body = [{id: id(20), clip_id: path.split('/')[4], revision: 1, job_id: id(3), state: 'COMPLETE', metadata: {}, created_at: now}]
    else if (path.endsWith('/download')) return route.fulfill({status: 200, contentType: 'video/mp4', body: readFileSync(resolve('../backend/tests/fixtures/source.mp4'))})
    else if (!['/api/v1/jobs', '/api/v1/plans'].includes(path)) throw Error(`Unexpected test API ${request.method()} ${path}`)
    return route.fulfill({status: request.method() === 'POST' ? 201 : 200, json: body})
  })
  await page.goto('/')
  await expect(page.getByRole('region', {name: 'Generate clips', exact: true})).toBeVisible()
  return calls
}

for (const mobile of [false, true]) test(`YouTube-first generation, quote consent and automatic clip library ${mobile ? 'mobile' : 'desktop'}`, async ({page}) => {
  if (mobile) await page.setViewportSize({width: 390, height: 844})
  const calls = await fixture(page)
  const studio = page.getByRole('region', {name: 'Generate clips', exact: true})
  await expect(studio.getByRole('tab', {name: 'Paste YouTube Link'})).toHaveAttribute('aria-selected', 'true')
  await expect(studio.getByRole('tab', {name: 'Upload Video'})).toBeVisible()
  await expect(studio.getByRole('checkbox')).toHaveCount(0)
  const library = page.getByRole('region', {name: 'Your Clips', exact: true})
  await expect(library.getByRole('heading', {name: 'The moment it clicked'})).toBeVisible()
  await page.screenshot({path: resolve(`test-results/generation-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true})
  await studio.getByLabel('YouTube video link').fill('https://youtu.be/aqz-KE-bpKQ?si=share#t=30')
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  await expect(studio).toContainText('60 credits')
  expect(calls.filter(c => c.path.endsWith('/generate'))).toHaveLength(0)
  const imported = calls.find(c => c.path.endsWith('/import-link'))!
  expect(imported.body).toEqual({url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', rights_attested: true})
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  await expect(library.getByRole('heading', {name: 'A fresh perspective'})).toBeVisible()
  expect(calls.filter(c => c.path.endsWith('/generate'))).toHaveLength(1)
  expect(calls.find(c => c.path.endsWith('/generate'))!.body).toEqual({quote_id: id(5), auto_render: true})
  await library.getByRole('button', {name: 'Preview', exact: true}).first().click()
  await expect(library.locator('video').first()).toBeVisible()
  await expect.poll(() => library.locator('video').first().evaluate(video => (video as HTMLVideoElement).readyState)).toBeGreaterThan(0)
  const download = page.waitForEvent('download')
  await library.getByRole('button', {name: 'Download', exact: true}).first().click()
  expect((await download).suggestedFilename()).toBe('The moment it clicked.mp4')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({path: resolve(`test-results/generation-${mobile ? 'mobile' : 'desktop'}-complete.png`), fullPage: true})
})

test('upload follows the same preparation, exact quote and generation path', async ({page}) => {
  const calls = await fixture(page)
  const studio = page.getByRole('region', {name: 'Generate clips', exact: true})
  await studio.getByRole('tab', {name: 'Upload Video'}).click()
  await studio.getByLabel('Video file', {exact: true}).setInputFiles({name: 'owned-video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('fixture upload')})
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  await expect(studio).toContainText('60 credits')
  expect(calls.find(c => c.path === '/api/v1/uploads')!.body.rights_attested).toBe(true)
  expect(calls.filter(c => c.path.endsWith('/generate'))).toHaveLength(0)
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  await expect(page.getByRole('region', {name: 'Your Clips', exact: true})).toContainText('A fresh perspective')
})

test('insufficient exact balance prevents processing after free preparation', async ({page}) => {
  const calls = await fixture(page, 5)
  const studio = page.getByRole('region', {name: 'Generate clips', exact: true})
  await studio.getByLabel('YouTube video link').fill('https://youtu.be/aqz-KE-bpKQ')
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  await expect(studio).toContainText('You need 55 more credits')
  await expect(studio.getByRole('button', {name: 'Generate Clips', exact: true})).toBeDisabled()
  expect(calls.filter(c => c.path.endsWith('/generate'))).toHaveLength(0)
})

test('unsafe and invalid video links never reach either importer', async ({page}) => {
  const calls = await fixture(page)
  const studio = page.getByRole('region', {name: 'Generate clips', exact: true})
  await studio.getByLabel('YouTube video link').fill('https://youtube.com.evil.example/watch?v=aqz-KE-bpKQ')
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  await expect(studio.getByRole('alert')).toContainText('Paste a valid HTTPS YouTube')
  expect(calls).toHaveLength(0)
})
