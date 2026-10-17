import { expect, test } from '@playwright/test'

test('pricing shows exact package totals, bonus inclusion and conditional clip targets',async({page})=>{
  await page.goto('/pricing')
  const free=page.getByRole('article').filter({has:page.getByRole('heading',{name:'FREE',exact:true})})
  await expect(free).toContainText('PKR 0')
  await expect(free).toContainText('1 lifetime trial clip')
  await expect(free).toContainText('Sources up to 5 minutes')
  for(const [name,price,credits,target,bonus] of [
    ['STARTER','299','500','7',null],['CREATOR','699','1,300','20','100'],['PRO','1,299','2,400','38','150'],
  ]) {
    const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:name!,exact:true})})
    await expect(card).toContainText(`PKR ${price}`)
    await expect(card).toContainText(`${credits} credits`)
    await expect(card).toContainText(`Target: ${target} generated clips`)
    if(bonus) await expect(card).toContainText(`Includes ${bonus} bonus credits`)
  }
  await expect(page.getByText('Clip targets are estimates.',{exact:true})).toBeVisible()
  await expect(page.getByText(/Longer source videos and extra edits use more credits/)).toBeVisible()
  await expect(page.getByText(/Credit purchases and free trials are coming soon/)).toBeVisible()
  await expect(page.getByRole('button',{name:/buy|purchase|activate|claim/i})).toHaveCount(0)
  await page.setViewportSize({width:390,height:844})
  await expect(page.getByRole('heading',{name:'PRO',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('landing shares the same pricing and links to the pricing page',async({page})=>{
  await page.route('**/api/v1/me',route=>route.abort())
  await page.goto('/')
  await expect(page.getByRole('heading',{name:'STARTER',exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Pricing',exact:true}).click()
  await expect(page).toHaveURL(/\/pricing$/)
})
