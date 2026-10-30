import {test, expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {dirname, resolve, sep} from 'node:path'

const root = resolve('../backend/var/phase8-auth')
const statePath = resolve(process.env.ZOCLIP_AUTH_TEST_STATE || 'missing-state')
if (!statePath.startsWith(root + sep) || !statePath.endsWith(`${sep}state.json`))
  throw Error('Explicit disposable local generation state required')
const state = JSON.parse(readFileSync(statePath, 'utf8')) as {api_origin: string}
if (!/^http:\/\/localhost:\d+$/.test(state.api_origin)) throw Error('Loopback API required')
const fixture = JSON.parse(readFileSync(resolve(dirname(statePath), 'generation-fixture.json'), 'utf8')) as {email: string; password: string}
const api = state.api_origin

for (const mode of ['youtube', 'upload'] as const) test(`connected ${mode} generation, local inference and single charge`, async ({page}) => {
  if (mode === 'upload') await page.setViewportSize({width: 390, height: 844})
  await page.goto('/')
  await page.getByRole('banner').getByRole('button', {name: 'Sign in', exact: true}).click()
  await page.getByLabel('Email address').fill(fixture.email)
  await page.getByLabel('Password', {exact: true}).fill(fixture.password)
  await page.locator('form').getByRole('button', {name: 'Sign in', exact: true}).click()
  const studio = page.getByRole('region', {name: 'Generate clips', exact: true})
  await expect(studio).toBeVisible()
  const wallet = async () => {
    const value = await (await page.request.get(`${api}/api/v1/me/credits`)).json() as {available_credits: number; reserved_credits: number}
    return {available_credits: value.available_credits, reserved_credits: value.reserved_credits}
  }
  const before = await wallet()
  if (mode === 'youtube') await studio.getByLabel('YouTube video link').fill('https://youtu.be/aqz-KE-bpKQ')
  else {
    await studio.getByRole('tab', {name: 'Upload Video'}).click()
    await studio.getByLabel('Video file', {exact: true}).setInputFiles(resolve('../backend/verification-media.mp4'))
  }
  const quoted = page.waitForResponse(r => r.url() === `${api}/api/v1/jobs/quote` && r.request().method() === 'POST')
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  const quote = await (await quoted).json() as {credits: number}
  await expect(studio).toContainText(`${quote.credits} credits`)
  expect(await wallet()).toEqual(before)
  const calls: string[] = []
  let dropped = false
  if (mode === 'youtube') await page.route('**/api/v1/videos/*/generate', async route => {
    calls.push(route.request().headers()['idempotency-key'])
    if (!dropped) {dropped = true; await route.fetch(); await route.abort('failed')}
    else await route.continue()
  })
  await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
  if (mode === 'youtube') {
    await expect(studio.getByRole('alert')).toBeVisible()
    await studio.getByRole('button', {name: 'Generate Clips', exact: true}).click()
    expect(calls.length).toBe(2)
    expect(calls[0]).toBeTruthy()
    expect(calls[1]).toBe(calls[0])
  }
  await expect(studio).toContainText('Your clips are ready.', {timeout: 150000})
  const library = page.getByRole('region', {name: 'Your Clips', exact: true})
  const card = library.locator('article').last()
  await expect(card.getByRole('button', {name: 'Preview', exact: true})).toBeEnabled()
  await card.getByRole('button', {name: 'Preview', exact: true}).click()
  await expect.poll(() => card.locator('video').evaluate(v => (v as HTMLVideoElement).readyState)).toBeGreaterThan(0)
  const download = page.waitForEvent('download')
  await card.getByRole('button', {name: 'Download', exact: true}).click()
  expect((await download).suggestedFilename()).toMatch(/\.mp4$/)
  await expect.poll(wallet).toEqual({available_credits: before.available_credits - quote.credits, reserved_credits: 0})
  const jobs = await (await page.request.get(`${api}/api/v1/jobs?limit=100`)).json() as {kind: string; state: string}[]
  expect(jobs.filter(j => j.kind === 'PROCESS')).toHaveLength(mode === 'youtube' ? 1 : 2)
  expect(jobs.filter(j => j.kind === 'PROCESS').every(j => j.state === 'COMPLETED')).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
