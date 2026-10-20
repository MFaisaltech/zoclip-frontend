import {expect,test} from '@playwright/test'

test('proposal route stays closed without an explicit local preview flag',async({page})=>{
  test.skip(process.env.ZOCLIP_PRICING_PROPOSAL_PREVIEW==='1','Preview flag intentionally enabled')
  const response=await page.goto('/pricing/proposal')
  expect(response?.status()).toBe(404)
})

test('inactive two-card proposal is accurate and responsive',async({page})=>{
  test.skip(process.env.ZOCLIP_PRICING_PROPOSAL_PREVIEW!=='1','Local operator preview only')
  await page.goto('/pricing/proposal')
  await expect(page.getByRole('status')).toContainText('cannot be purchased or activated')
  await expect(page.getByRole('article')).toHaveCount(2)
  for(const [name,price,credits,target] of [
    ['CREATOR','2,000','3,700','61'],['PRO','5,000','9,500','158'],
  ]){
    const card=page.getByRole('article').filter({has:page.getByRole('heading',{name,exact:true})})
    await expect(card).toContainText(`Rs. ${price}`)
    await expect(card).toContainText(`${credits} proposed credits`)
    await expect(card).toContainText(`Example allowance: ${target} five-minute jobs`)
    await expect(card).toContainText('one clip from a five-minute source')
  }
  await expect(page.getByRole('heading',{name:'STARTER',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:/buy|purchase|activate|claim/i})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Processing capacity acceptance pending'})).toBeVisible()
  await expect(page.getByRole('article').first()).toContainText('Up to 183 initial clips')
  await expect(page.getByRole('article').last()).toContainText('Up to 474 initial clips')
  await expect(page.getByText(/These are not measured throughput/)).toBeVisible()
  await page.setViewportSize({width:390,height:844})
  await expect(page.getByRole('heading',{name:'PRO',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
