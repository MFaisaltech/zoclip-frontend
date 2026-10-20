import {readFile, writeFile} from 'node:fs/promises'

// Review-only module: it never replaces lib/pricing-catalog.ts or active terms.
const catalog=JSON.parse(await readFile(new URL('../../backend/deploy/pricing-proposal-20261020.json',import.meta.url),'utf8'))
if(catalog.release_status!=='proposal')throw Error('This generator accepts inactive proposals only')
const packages=Object.entries(catalog.plans).filter(([slug])=>slug!=='free').map(([slug,terms])=>({
  slug,name:catalog.display[slug].name,pricePaisa:terms.price_paisa,
  credits:terms.included_credits,targetClips:catalog.display[slug].target_clips,
  representativeCredits:catalog.display[slug].representative_quote_credits,
}))
const review=JSON.parse(await readFile(new URL('../../backend/docs/evidence/final-pricing-review-20261020.json',import.meta.url),'utf8'))
if(review.activation_allowed!==false)throw Error('Review module must not authorize activation')
const capacityReview={
  activationAllowed:false,
  projectedOneOutputJobs:review.capacities.expected['5m_1out_0edit'].projected_jobs_month,
  projectedThreeOutputEditJobs:review.capacities.expected['10m_3out_1edit'].projected_jobs_month,
  creditsPerJobChanged:review.pricing_rules_changed,
}
if(packages.length!==2||packages.some(p=>!['creator','pro'].includes(p.slug)))throw Error('Expected exactly Creator and Pro')
const output='// Generated review-only proposal; never active purchase terms.\n'+
  'export const proposedPackages = '+JSON.stringify(packages,null,2)+' as const\n'+
  'export const capacityReview = '+JSON.stringify(capacityReview,null,2)+' as const\n'
const target=new URL('../lib/pricing-proposal.ts',import.meta.url)
if(process.argv.includes('--check')) {
  if(await readFile(target,'utf8')!==output)throw Error('Pricing proposal differs from backend')
} else await writeFile(target,output)
