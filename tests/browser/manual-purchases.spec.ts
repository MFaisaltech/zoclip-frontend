import {expect,test} from '@playwright/test'

const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const now='2026-10-30T00:00:00Z'
test('admin searches by email and verifies a purchase before one activation',async({page})=>{
  let activations=0
  const rules={credits_per_minute:0,credits_per_output:50,credits_per_edit:50,captions_credits:0,reframe_credits:0,max_source_seconds:7200,max_outputs:3,max_edits:1,max_concurrent_jobs:1,daily_credits:10000,monthly_credits:10000,minimum_job_credits:0,purchasable:true,lifetime_output_limit:null}
  await page.route('**/api/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname
    let body:unknown=[]
    if(path==='/api/v1/me')body={id:id(1),email:'staff@example.com',verified:true,role:'admin',created_at:now}
    else if(path==='/api/v1/auth/csrf')body={csrf_token:'T'.repeat(43)}
    else if(path==='/api/v1/me/credits')body={available_credits:0,reserved_credits:0,credit_expiry:'disabled'}
    else if(path==='/api/v1/plans')body=[{id:id(10),slug:'creator',kind:'plan',enabled:true,currency:'PKR',auto_renews:false,credit_expiry:'disabled',price:{id:id(11),price_paisa:100000,included_credits:10000,valid_days:0,approved:true,rules}}]
    else if(path==='/api/v1/admin/manual-payments/users'){
      expect(url.searchParams.get('email')).toBe('buyer@example.com')
      body=[{id:id(2),email:'buyer@example.com',verified:true,status:'active',available_credits:activations?10000:0,reserved_credits:0}]
    }else if(path.endsWith('/activate')){
      activations++
      expect(request.headers()['x-csrf-token']).toBe('T'.repeat(43))
      expect(request.headers()['idempotency-key']).toBeTruthy()
      expect(request.postDataJSON()).toMatchObject({amount_paisa:100000,independently_verified:true,payment_reference:'BANK123456'})
      body={order:{id:id(3),price_version_id:id(11),provider:'manual',amount_paisa:100000,currency:'PKR',credits:10000,valid_days:0,state:'PAID',expires_at:'2099-01-01T00:00:00Z',paid_at:now,created_at:now,sandbox:false,auto_renews:false},user_id:id(2),reference:'BANK123456',refund:null}
    }
    await route.fulfill({json:body})
  })
  await page.goto('/admin')
  await page.getByRole('button',{name:'Purchases',exact:true}).click()
  await page.getByLabel('Registered email',{exact:true}).fill('buyer@example.com')
  await page.getByRole('button',{name:'Find user'}).click()
  await expect(page.getByText('buyer@example.com',{exact:false})).toBeVisible()
  await page.getByLabel('Purchased package').selectOption(id(11))
  await page.getByLabel('Verified amount received (PKR)').fill('1000')
  await page.getByLabel('Bank/wallet transaction reference',{exact:true}).fill('BANK123456')
  await page.getByLabel('Verification notes').fill('Bank receipt independently verified')
  const activate=page.getByRole('button',{name:'Activate purchased package',exact:true})
  await expect(activate).toBeDisabled()
  await page.getByRole('checkbox').check()
  await activate.click()
  await expect(page.getByRole('status')).toContainText('Verified transaction recorded')
  expect(activations).toBe(1)
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
