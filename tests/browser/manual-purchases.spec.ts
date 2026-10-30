import {expect,test} from '@playwright/test'

const id=(n:number)=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const now='2026-10-30T00:00:00Z'
test('admin enters four purchase details, then verifies before one activation',async({page})=>{
  let activations=0
  const rules={credits_per_minute:0,credits_per_output:50,credits_per_edit:50,captions_credits:0,reframe_credits:0,max_source_seconds:7200,max_outputs:6,max_edits:1,max_concurrent_jobs:1,daily_credits:10000,monthly_credits:10000,minimum_job_credits:0,purchasable:true,lifetime_output_limit:null}
  await page.route('**/api/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname
    let body:unknown=[]
    if(path==='/api/v1/me')body={id:id(1),email:'staff@example.com',verified:true,role:'admin',created_at:now}
    else if(path==='/api/v1/auth/csrf')body={csrf_token:'T'.repeat(43)}
    else if(path==='/api/v1/me/credits')body={available_credits:0,reserved_credits:0,credit_expiry:'disabled'}
    else if(path==='/api/v1/plans')body=[{id:id(10),slug:'creator',kind:'plan',enabled:true,currency:'PKR',auto_renews:false,credit_expiry:'disabled',price:{id:id(11),price_paisa:100000,included_credits:10000,valid_days:30,approved:true,rules}}]
    else if(path==='/api/v1/admin/manual-payments/users'){
      expect(url.searchParams.get('email')).toBe('buyer@example.com')
      body=[{id:id(2),email:'buyer@example.com',verified:true,status:'active',available_credits:activations?10000:0,reserved_credits:0}]
    }else if(path.endsWith('/activate')){
      activations++
      expect(request.headers()['x-csrf-token']).toBe('T'.repeat(43))
      expect(request.headers()['idempotency-key']).toBeTruthy()
      expect(request.postDataJSON()).toMatchObject({amount_paisa:100000,customer_name:'Alice Buyer',independently_verified:true,payment_reference:'BANK123456'})
      body={order:{id:id(3),price_version_id:id(11),provider:'manual',amount_paisa:100000,currency:'PKR',credits:10000,valid_days:30,state:'PAID',expires_at:'2099-01-01T00:00:00Z',paid_at:now,created_at:now,sandbox:false,auto_renews:false},user_id:id(2),customer_email:'buyer@example.com',customer_name:'Alice Buyer',plan_slug:'creator',access_starts_at:now,access_ends_at:'2026-11-29T00:00:00Z',reference:'BANK123456',refund:null}
    }
    await route.fulfill({json:body})
  })
  await page.goto('/admin')
  await page.getByRole('button',{name:'Purchases',exact:true}).click()
  await page.getByLabel('Customer Name').fill('Alice Buyer')
  await page.getByLabel('Registered Email').fill('buyer@example.com')
  await page.getByLabel('Plan').selectOption('creator')
  await page.getByLabel('Amount Received (PKR)').fill('1000')
  await page.getByRole('button',{name:'Activate Plan',exact:true}).click()
  await expect(page.getByText('Payment verification')).toBeVisible()
  await expect(page.getByText('Alice Buyer · buyer@example.com')).toBeVisible()
  await page.getByLabel('Bank/wallet transaction reference',{exact:true}).fill('BANK123456')
  await page.getByLabel('Verification notes').fill('Bank receipt independently verified')
  const confirm=page.getByRole('button',{name:'Confirm activation',exact:true})
  await expect(confirm).toBeDisabled()
  await page.getByRole('checkbox').check()
  await confirm.click()
  await expect(page.getByRole('status')).toContainText('Plan activated')
  expect(activations).toBe(1)
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
