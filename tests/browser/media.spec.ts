import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
const root = resolve('../backend/var/phase8-auth')
const statePath = resolve(process.env.ZOCLIP_AUTH_TEST_STATE || 'missing-state')
if (!statePath.startsWith(root + sep) || !statePath.endsWith(`${sep}state.json`)) throw Error('Use disposable M3 auth_dev state')
const state = JSON.parse(readFileSync(statePath, 'utf8')) as {api_origin: string}
if (!/^http:\/\/localhost:\d+$/.test(state.api_origin)) throw Error('Loopback only')
const fixture = JSON.parse(readFileSync(resolve(dirname(statePath), 'media-fixture.json'), 'utf8')) as {password: string; users: Record<'alice'|'bob', {email: string; id: string}>}
const api = state.api_origin
const source = resolve('../backend/tests/fixtures/source.mp4')
const nav = (page: Page, name: string) => page.getByRole('navigation', {name:'Workspace',exact:true}).getByRole('button',{name,exact:true})
const add = (page: Page) => page.getByRole('region',{name:'Add video',exact:true})
const live = (page: Page) => page.getByRole('region',{name:'Live job',exact:true})
const quote = (page: Page) => page.getByRole('region',{name:'Processing quote',exact:true})
async function login(page: Page, name: 'alice'|'bob' = 'alice') {
  await page.goto('/')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await page.getByLabel('Email address').fill(fixture.users[name].email)
  await page.getByLabel('Password',{exact:true}).fill(fixture.password)
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect(page.getByRole('status').filter({hasText:'Signed in as'})).toContainText(fixture.users[name].email)
  await nav(page,'Videos').click()
}
async function prepareFile(page: Page) {
  await add(page).getByLabel('I own this video',{exact:false}).check()
  await add(page).getByLabel('Video file',{exact:true}).setInputFiles(source)
}
async function upload(page: Page) {
  await prepareFile(page)
  const admitted = page.waitForResponse(response => response.url() === api+'/api/v1/uploads' && response.request().method()==='POST')
  await add(page).getByRole('button',{name:'Upload video',exact:true}).click()
  const session = await (await admitted).json() as {id:string;video_id:string}
  await expect(live(page).getByRole('status')).toContainText('COMPLETED',{timeout:30000})
  return session
}
async function review(page: Page, videoId: string) {
  const article = page.getByRole('region',{name:'Videos',exact:true}).locator('article').filter({hasText:videoId})
  await article.getByRole('button',{name:'Review processing quote',exact:true}).click()
}
async function balance(page: Page) {return (await page.request.get(api+'/api/v1/me/credits')).json() as Promise<{available_credits:number;reserved_credits:number}>}
async function cleanupSources(page: Page) {
  const csrfResponse=await page.request.get(api+'/api/v1/auth/csrf')
  if(!csrfResponse.ok()) return
  const csrf=await csrfResponse.json()
  const response=await page.request.get(api+'/api/v1/videos?limit=100')
  if(!response.ok()) return
  for(const video of await response.json()) await page.request.delete(`${api}/api/v1/videos/${video.id}`,{headers:{Origin:'http://localhost:3000','X-CSRF-Token':csrf.csrf_token}})
}
test.afterEach(async ({page})=>{await cleanupSources(page)})

test('real upload, quote without charge, lost generation acknowledgment/reload recovery, simulated AI, events and cancellation', async ({page}) => {
  await login(page)
  const before = await balance(page), session=await upload(page)
  expect(await balance(page)).toEqual(before)
  await review(page,session.video_id)
  await quote(page).getByRole('button',{name:'Get processing quote',exact:true}).click()
  await expect(quote(page)).toContainText('1 credits to reserve')
  expect(await balance(page)).toEqual(before)
  let dropped=false
  await page.route(`**/api/v1/videos/${session.video_id}/generate`,async route=>{
    if (!dropped) {dropped=true;await route.fetch();await route.abort('failed')}
    else await route.continue()
  })
  await quote(page).getByRole('button',{name:'Confirm and reserve 1 credits',exact:true}).click()
  await expect(quote(page).getByRole('button',{name:'Recover confirmed request',exact:true})).toBeVisible()
  expect((await balance(page)).reserved_credits).toBe(1)
  await page.reload(); await nav(page,'Videos').click();await review(page,session.video_id)
  await quote(page).getByRole('button',{name:'Recover confirmed request',exact:true}).click()
  await expect(live(page).getByRole('status')).toContainText('SUGGESTIONS READY',{timeout:30000})
  await expect(live(page)).toContainText('Progress unavailable')
  await expect(live(page)).toContainText('Rendering and editing are a later milestone')
  await live(page).getByRole('button',{name:'Load recent events',exact:true}).click()
  await expect(live(page).getByRole('list',{name:'Recent job events'})).toContainText('analyzing')
  await live(page).getByRole('button',{name:'Cancel job',exact:true}).click()
  await expect(live(page).getByRole('status')).toContainText('CANCELED')
  expect(await balance(page)).toEqual(before)
})

test('interrupted multipart upload survives reload, verifies original checksum, skips confirmed parts and isolates another account', async ({page}) => {
  await login(page);await prepareFile(page)
  let session:{id:string;video_id:string}|null=null,failed=0
  await page.route('**/api/v1/uploads/*/parts/1',async route=>{failed++;await route.abort('failed')})
  const admitted=page.waitForResponse(r=>r.url()===api+'/api/v1/uploads' && r.request().method()==='POST')
  await add(page).getByRole('button',{name:'Upload video',exact:true}).click()
  session=await (await admitted).json()
  await expect(add(page).getByRole('alert')).toContainText('Connection interrupted')
  expect(failed).toBe(3)
  expect((await (await page.request.get(`${api}/api/v1/uploads/${session!.id}`)).json()).received_parts).toEqual([0])
  await page.getByRole('button',{name:'Log out',exact:true}).click()
  await login(page,'bob')
  await expect(add(page)).not.toContainText('A resumable upload is saved')
  expect((await page.request.get(`${api}/api/v1/uploads/${session!.id}`)).status()).toBe(404)
  expect((await page.request.get(`${api}/api/v1/videos/${session!.video_id}`)).status()).toBe(404)
  await page.getByRole('button',{name:'Log out',exact:true}).click()
  await login(page);await page.reload();await nav(page,'Videos').click()
  await expect(add(page)).toContainText('A resumable upload is saved')
  await add(page).getByLabel('I own this video',{exact:false}).check()
  await add(page).getByLabel('Video file',{exact:true}).setInputFiles({name:'wrong.mp4',mimeType:'video/mp4',buffer:Buffer.alloc(readFileSync(source).length)})
  await add(page).getByRole('button',{name:'Resume upload',exact:true}).click()
  await expect(add(page).getByRole('alert')).toContainText('Reselect the exact original file')
  await page.unroute('**/api/v1/uploads/*/parts/1')
  let resentFirst=0
  page.on('request',request=>{if(request.method()==='PUT'&&request.url().endsWith('/parts/0'))resentFirst++})
  await add(page).getByLabel('Video file',{exact:true}).setInputFiles(source)
  await add(page).getByRole('button',{name:'Resume upload',exact:true}).click()
  await expect(live(page).getByRole('status')).toContainText('COMPLETED',{timeout:30000})
  expect(resentFirst).toBe(0)
})

test('rights attestation, supported direct URL import and unsupported platform/private URLs',async ({page})=>{
  await login(page)
  await add(page).getByLabel('Direct video URL',{exact:true}).fill('https://youtube.com/watch?v=fixture')
  await expect(add(page).getByRole('button',{name:'Import video URL',exact:true})).toBeDisabled()
  await add(page).getByLabel('I own this video',{exact:false}).check()
  await add(page).getByLabel('Maximum import size (MiB)',{exact:true}).fill('1')
  for(const url of ['https://youtube.com/watch?v=fixture','https://127.0.0.1/source.mp4']) {
    await add(page).getByLabel('Direct video URL',{exact:true}).fill(url)
    await add(page).getByRole('button',{name:'Import video URL',exact:true}).click()
    await expect(add(page).getByRole('alert')).toContainText('This URL is unsupported')
  }
  await add(page).getByLabel('Direct video URL',{exact:true}).fill('https://media.example.com/source.mp4')
  await add(page).getByRole('button',{name:'Import video URL',exact:true}).click()
  await expect(live(page).getByRole('status')).toContainText('COMPLETED',{timeout:30000})
})

test('invalid imported media reports the actual failed validation job',async ({page})=>{
  await login(page)
  await add(page).getByLabel('I own this video',{exact:false}).check()
  await add(page).getByLabel('Maximum import size (MiB)',{exact:true}).fill('1')
  await add(page).getByLabel('Direct video URL',{exact:true}).fill('https://media.example.com/invalid.mp4')
  await add(page).getByRole('button',{name:'Import video URL',exact:true}).click()
  await expect(live(page).getByRole('status')).toContainText('FAILED',{timeout:30000})
  await expect(live(page)).toContainText('invalid_media')
})

test('insufficient credits rejects confirmation without a paid job; mobile UI does not overflow',async ({page})=>{
  await login(page,'bob')
  const session=await upload(page)
  await review(page,session.video_id)
  await quote(page).getByRole('button',{name:'Get processing quote',exact:true}).click()
  await quote(page).getByRole('button',{name:'Confirm and reserve 1 credits',exact:true}).click()
  await expect(quote(page).getByRole('alert')).toContainText('not have enough available credits')
  expect((await balance(page)).reserved_credits).toBe(0)
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('upload pause and cancellation use the server; expired quotes and upload limits stay actionable',async ({page})=>{
  await login(page);await prepareFile(page)
  await page.route('**/api/v1/uploads/*/parts/0',async route=>{await new Promise(resolve=>setTimeout(resolve,2500));await route.abort('failed').catch(()=>undefined)})
  await add(page).getByRole('button',{name:'Upload video',exact:true}).click()
  await expect(add(page)).toContainText('Server-confirmed upload')
  await add(page).getByRole('button',{name:'Pause transfer',exact:true}).click()
  await expect(add(page)).toContainText('Upload paused')
  await add(page).getByRole('button',{name:'Cancel saved upload',exact:true}).click()
  await expect(add(page)).toContainText('Server confirmed upload cancellation')
  await page.unroute('**/api/v1/uploads/*/parts/0')
  await page.route('**/api/v1/uploads',route=>route.fulfill({status:413,contentType:'application/problem+json',body:JSON.stringify({code:'media_too_large'})}))
  await prepareFile(page);await add(page).getByRole('button',{name:'Upload video',exact:true}).click()
  await expect(add(page).getByRole('alert')).toContainText('exceeds the server upload limit')
  await page.unroute('**/api/v1/uploads')
  // A definitive 413 leaves no resumable server session or local request.
  await expect(add(page).getByRole('button',{name:'Cancel saved upload',exact:true})).toHaveCount(0)
  // Await the disposable maintenance worker's asynchronous deletion tick.
  await page.waitForTimeout(1200)
  const session=await upload(page)
  await review(page,session.video_id)
  await page.route('**/api/v1/jobs/quote',async route=>{const response=await route.fetch();const data=await response.json();await route.fulfill({response,json:{...data,expires_at:'2000-01-01T00:00:00Z'}})})
  await quote(page).getByRole('button',{name:'Get processing quote',exact:true}).click()
  await quote(page).getByRole('button',{name:'Confirm and reserve 1 credits',exact:true}).click()
  await expect(quote(page).getByRole('alert')).toContainText('quote expired')
})

test('job polling outage recovers and an expired job session clears all private data',async ({page})=>{
  await login(page)
  let failing=true
  await page.route('**/api/v1/jobs/*',async route=>{
    if(route.request().method()==='GET'&&!route.request().url().includes('/events')&&failing) await route.fulfill({status:503,contentType:'application/problem+json',body:JSON.stringify({code:'temporarily_unavailable'})})
    else await route.continue()
  })
  await add(page).getByLabel('I own this video',{exact:false}).check()
  await add(page).getByLabel('Maximum import size (MiB)',{exact:true}).fill('1')
  await add(page).getByLabel('Direct video URL',{exact:true}).fill('https://media.example.com/source.mp4')
  await add(page).getByRole('button',{name:'Import video URL',exact:true}).click()
  await expect(live(page).getByRole('alert')).toContainText('temporarily unavailable')
  failing=false
  await live(page).getByRole('button',{name:'Refresh job',exact:true}).click()
  await expect(live(page).getByRole('status')).toContainText('COMPLETED',{timeout:30000})
  await page.unroute('**/api/v1/jobs/*')
  await page.route('**/api/v1/jobs/*',route=>route.fulfill({status:401,contentType:'application/problem+json',body:JSON.stringify({code:'authentication_required'})}))
  await live(page).getByRole('button',{name:'Refresh job',exact:true}).click()
  await expect(page.getByText('Your session has expired. Please sign in again.',{exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'Live job',exact:true})).toHaveCount(0)
})
