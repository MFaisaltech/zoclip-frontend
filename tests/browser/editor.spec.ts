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

const highlights=(page:Page)=>page.getByRole('region',{name:'AI highlights',exact:true})
const editor=(page:Page)=>page.getByRole('region',{name:'Clip editor',exact:true})
async function createDraft(page:Page, edits=0) {
  await login(page)
  const session=await upload(page)
  await review(page,session.video_id)
  await quote(page).getByLabel('Included re-exports',{exact:true}).fill(String(edits))
  await quote(page).getByRole('button',{name:'Get processing quote',exact:true}).click()
  await quote(page).getByRole('button',{name:'Confirm and reserve 1 credits',exact:true}).click()
  await expect(live(page).getByRole('status')).toContainText('SUGGESTIONS READY',{timeout:30000})
  await page.getByRole('region',{name:'Videos',exact:true}).locator('article').filter({hasText:session.video_id}).getByRole('button',{name:'View AI highlights',exact:true}).click()
  await highlights(page).getByRole('button',{name:'Load highlights',exact:true}).click()
  await expect(highlights(page)).toContainText('AI score: 85/100')
  await expect(highlights(page)).toContainText('00:00:00.000 – 00:00:02.500')
  await highlights(page).getByRole('button',{name:'Load transcript',exact:true}).click()
  await expect(highlights(page).getByRole('list',{name:'Transcript words'})).toContainText('Useful')
  await highlights(page).getByRole('button',{name:'Create / open draft',exact:true}).click()
  await editor(page).getByRole('button',{name:'Reload server revision',exact:true}).click()
  await expect(editor(page)).toContainText('Revision 1')
  return session
}
test('real highlights, captions, trim, selection, private MP4 download and prepaid re-render',async({page})=>{
  const before=await (async()=>{await login(page);return balance(page)})()
  await page.getByRole('button',{name:'Log out',exact:true}).click()
  await createDraft(page,1)
  await editor(page).getByLabel('Title',{exact:true}).fill('My edited highlight')
  await editor(page).getByLabel('End (absolute source milliseconds)',{exact:true}).fill('2000')
  await editor(page).getByLabel('Caption preset',{exact:true}).selectOption('classic')
  await editor(page).getByLabel('Framing mode',{exact:true}).selectOption('pad')
  await editor(page).getByRole('button',{name:'Edit transcript caption words',exact:true}).click()
  await editor(page).getByLabel('Word 1 text',{exact:true}).fill('Useful!')
  await editor(page).getByRole('button',{name:'Save new revision',exact:true}).click()
  await expect(editor(page)).toContainText('Saved revision 2')
  await highlights(page).locator('input[type=checkbox]').check()
  await highlights(page).getByRole('button',{name:'Confirm selected exports',exact:true}).click()
  await expect(highlights(page).getByRole('region',{name:'Live job'}).getByRole('status')).toContainText('COMPLETED',{timeout:40000})
  await editor(page).getByRole('button',{name:'Refresh exports',exact:true}).click()
  const downloaded=page.waitForEvent('download')
  await editor(page).getByRole('button',{name:'Download revision 2 MP4',exact:true}).click()
  expect((await downloaded).suggestedFilename()).toMatch(/-r2\.mp4$/)
  await expect(editor(page).getByLabel('Downloaded MP4 preview',{exact:true})).toBeVisible()
  const settled=await balance(page);expect(settled.reserved_credits).toBe(0);expect(settled.available_credits).toBe(before.available_credits-1)
  await editor(page).getByLabel('Title',{exact:true}).fill('Prepaid revision')
  await editor(page).getByRole('button',{name:'Save new revision',exact:true}).click()
  await expect(editor(page)).toContainText('Saved revision 3')
  await editor(page).getByRole('button',{name:'Request prepaid re-render',exact:true}).click()
  await expect(editor(page).getByRole('region',{name:'Live job'}).getByRole('status')).toContainText('COMPLETED',{timeout:40000})
  expect(await balance(page)).toEqual(settled)
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('stale edits preserve local text; paid re-export requires confirmation and recovers lost response',async({page})=>{
  await createDraft(page)
  await page.route('**/api/v1/clips/*',async route=>{
    if(route.request().method()==='PATCH') {
      await route.fetch({postData:JSON.stringify({...route.request().postDataJSON(),title:'Other session title'})})
      await route.continue()
    }else await route.continue()
  })
  await editor(page).getByLabel('Title',{exact:true}).fill('My unsaved text')
  await editor(page).getByRole('button',{name:'Save new revision',exact:true}).click()
  await expect(editor(page).getByRole('alert')).toContainText('changed in another request')
  await expect(editor(page).getByLabel('Title',{exact:true})).toHaveValue('My unsaved text')
  await expect(editor(page).getByRole('button',{name:'Save new revision',exact:true})).toBeDisabled()
  await page.unroute('**/api/v1/clips/*')
  await editor(page).getByRole('button',{name:'Reload server revision',exact:true}).click()
  await expect(editor(page).getByLabel('Title',{exact:true})).toHaveValue('Other session title')
  await highlights(page).locator('input[type=checkbox]').check()
  await highlights(page).getByRole('button',{name:'Confirm selected exports',exact:true}).click()
  await expect(highlights(page).getByRole('region',{name:'Live job'}).getByRole('status')).toContainText('COMPLETED',{timeout:40000})
  await editor(page).getByLabel('Title',{exact:true}).fill('Paid edited revision')
  await editor(page).getByRole('button',{name:'Save new revision',exact:true}).click()
  await expect(editor(page)).toContainText('Saved revision 3')
  await editor(page).getByRole('button',{name:'Request prepaid re-render',exact:true}).click()
  await expect(editor(page).getByRole('alert')).toContainText('prepaid edit allowance is exhausted')
  const before=await balance(page)
  await editor(page).getByRole('button',{name:'Get paid export quote',exact:true}).click()
  await expect(editor(page).getByRole('button',{name:'Confirm paid export: 1 credits',exact:true})).toBeVisible()
  expect(await balance(page)).toEqual(before)
  let lost=false
  await page.route('**/api/v1/clips/*/render',async route=>{if(!lost){lost=true;await route.fetch();await route.abort('failed')}else await route.continue()})
  await editor(page).getByRole('button',{name:'Confirm paid export: 1 credits',exact:true}).click()
  await expect(editor(page).getByRole('button',{name:'Recover confirmed render request',exact:true})).toBeVisible()
  await editor(page).getByRole('button',{name:'Recover confirmed render request',exact:true}).click()
  await expect(editor(page).getByRole('region',{name:'Live job'}).getByRole('status')).toContainText('COMPLETED',{timeout:40000})
  expect((await balance(page)).available_credits).toBe(before.available_credits-1)
})

test('malformed trim is blocked; quota and expired editor session stay actionable',async({page})=>{
  await createDraft(page)
  await editor(page).getByLabel('End (absolute source milliseconds)',{exact:true}).fill('100')
  await expect(editor(page).getByRole('button',{name:'Save new revision',exact:true})).toBeDisabled()
  await editor(page).getByLabel('End (absolute source milliseconds)',{exact:true}).fill('2500')
  await page.route('**/api/v1/jobs/*/renders',route=>route.fulfill({status:409,contentType:'application/problem+json',body:JSON.stringify({code:'export_limit'})}))
  await highlights(page).locator('input[type=checkbox]').check()
  await highlights(page).getByRole('button',{name:'Confirm selected exports',exact:true}).click()
  await expect(highlights(page).getByRole('alert')).toContainText('quota has been reached')
  await page.route('**/api/v1/clips/*',route=>route.fulfill({status:401,contentType:'application/problem+json',body:JSON.stringify({code:'authentication_required'})}))
  await editor(page).getByRole('button',{name:'Reload server revision',exact:true}).click()
  await expect(page.getByText('Your session has expired. Please sign in again.',{exact:true})).toBeVisible()
  await expect(editor(page)).toHaveCount(0)
})
