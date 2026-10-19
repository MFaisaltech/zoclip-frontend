import {readFile, writeFile} from 'node:fs/promises'

// Review-only module: it never replaces lib/pricing-catalog.ts or active terms.
const catalog=JSON.parse(await readFile(new URL('../../backend/deploy/pricing-proposal-20261020.json',import.meta.url),'utf8'))
if(catalog.release_status!=='proposal')throw Error('This generator accepts inactive proposals only')
const packages=Object.entries(catalog.plans).filter(([slug])=>slug!=='free').map(([slug,terms])=>({
  slug,name:catalog.display[slug].name,pricePaisa:terms.price_paisa,
  credits:terms.included_credits,targetClips:catalog.display[slug].target_clips,
  representativeCredits:catalog.display[slug].representative_quote_credits,
}))
const review=JSON.parse(await readFile(new URL('../../backend/deploy/pricing-economics-20261020.json',import.meta.url),'utf8'))
if(review.activation_allowed!==false)throw Error('Review module must not authorize activation')
const alternatives=Object.entries(review.profiles).map(([profile,plans])=>({
  profile,creator:plans.creator.conditional_max_credits_for_target,
  pro:plans.pro.conditional_max_credits_for_target,
}))
if(packages.length!==2||packages.some(p=>!['creator','pro'].includes(p.slug)))throw Error('Expected exactly Creator and Pro')
const output='// Generated review-only proposal; never active purchase terms.\n'+
  'export const proposedPackages = '+JSON.stringify(packages,null,2)+' as const\n'+
  'export const lowerAllocationOptions = '+JSON.stringify(alternatives,null,2)+' as const\n'
const target=new URL('../lib/pricing-proposal.ts',import.meta.url)
if(process.argv.includes('--check')) {
  if(await readFile(target,'utf8')!==output)throw Error('Pricing proposal differs from backend')
} else await writeFile(target,output)
