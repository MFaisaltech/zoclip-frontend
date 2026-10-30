import { expect, test } from '@playwright/test'

test('current packages use exact per-clip pricing and safe WhatsApp links on desktop and mobile',async({page})=>{
  await page.goto('/pricing')
  for(const [name,price,credits,clips] of [['Creator','1,000','10,000','200'],['Pro','2,000','21,000','420']]) {
    const card=page.getByRole('article').filter({has:page.getByRole('heading',{name,exact:true})})
    await expect(card).toContainText(`PKR ${price}`)
    await expect(card).toContainText(`${credits} credits`)
    await expect(card).toContainText(`${clips} clips at 50 credits each`)
    const link=card.getByRole('link',{name:/Buy via WhatsApp/})
    const url=new URL((await link.getAttribute('href'))!)
    expect(url.origin).toBe('https://wa.me');expect(url.pathname).toBe('/923189753773')
    expect(url.searchParams.get('text')).toContain('payment screenshot')
  }
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.setViewportSize({width:390,height:844})
  await expect(page.getByRole('heading',{name:'Pro',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('landing and pricing share the same two packages',async({page})=>{
  await page.route('**/api/v1/me',route=>route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'Creator',exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Pricing',exact:true}).click()
  await expect(page).toHaveURL(/\/pricing$/)
})
