import {expect,test} from '@playwright/test'

const id='10000000-0000-4000-8000-000000000001'
const now='2026-10-18T00:00:00Z'
const video={id,project_id:id,state:'READY',metadata_json:{duration_seconds:1800},created_at:now,expires_at:'2026-10-25T00:00:00Z'}

for(const mobile of [false,true])test(`quote settings, spending history and account failures ${mobile?'mobile':'desktop'}`,async({page})=>{
  if(mobile)await page.setViewportSize({width:390,height:844})
  let quotes=0,paid=0
  await page.route('**/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname
    let body:unknown=[]
    if(path==='/api/v1/me')body={id,email:'offline@example.com',verified:true,role:'customer',created_at:now}
    else if(path==='/api/v1/auth/csrf')body={csrf_token:'T'.repeat(43)}
    else if(path==='/api/v1/auth/password/forgot')return route.fulfill({status:503,json:{code:'email_unconfigured',detail:'Unavailable'}})
    else if(path==='/api/v1/me/credits')body={available_credits:500,reserved_credits:0,credit_expiry:'disabled'}
    else if(path==='/api/v1/videos')body=[video]
    else if(path===`/api/v1/videos/${id}`)body=video
    else if(path==='/api/v1/me/billing')body={plan:null,access_source:'unconfigured',access_ends_at:null,day_starts_at:now,month_starts_at:now,daily_used_credits:0,monthly_used_credits:0,held_credits:0,held_reservations:0,settled_credits:0,released_credits:0}
    else if(path==='/api/v1/jobs/quote-preview'){
      quotes++
      const request=route.request().postDataJSON()
      body={preview_only:true,processing_enabled:false,pricing_status:'configured',price_version_id:id,credits:150+request.output_count*2,request}
    }else if(path.includes('transactions'))body={items:[{id,operation:'SETTLE',available_delta:0,reserved_delta:-60,available_after:440,reserved_after:0,reservation_id:id,created_at:now}],next_cursor:null}
    else if(path.endsWith('/generate'))paid++
    await route.fulfill({json:body})
  })
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Turn your videos into short clips.'})).toBeVisible()
  await page.getByRole('button',{name:'Generate clips',exact:true}).click()
  const section=page.getByRole('region',{name:'Generate clips'})
  await expect(section.getByLabel('Number of clips')).toBeVisible()
  await expect(section).toContainText('156 credits')
  await section.getByLabel('Number of clips').fill('2')
  await expect(section).toContainText('Update the price to apply your settings.')
  await section.getByRole('button',{name:'Update price',exact:true}).click()
  await expect(section).toContainText('154 credits')
  await section.getByText('Advanced settings',{exact:true}).click()
  await section.getByLabel('Add captions').uncheck()
  await expect(section).toContainText('Update the price to apply your settings.')
  await section.getByRole('button',{name:'Update price',exact:true}).click()
  await expect(section.getByText('Update the price to apply your settings.')).toHaveCount(0)
  expect(quotes).toBe(3)
  expect(paid).toBe(0)
  const nav=page.getByRole('navigation',{name:mobile?'Mobile workspace':'Workspace',exact:true})
  await nav.getByRole('button',{name:'Credits & plans',exact:true}).click()
  await expect(page.getByText('60 spent',{exact:true})).toBeVisible()
  await nav.getByRole('button',{name:'Account',exact:true}).click()
  await page.getByRole('button',{name:'Request password reset',exact:true}).click()
  await expect(page.locator('p[role="alert"]')).toContainText('Email delivery is unavailable.')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
