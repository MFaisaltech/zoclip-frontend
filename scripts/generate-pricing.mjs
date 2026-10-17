import {readFile, writeFile} from 'node:fs/promises'

// Backend versioned terms are authoritative. No runtime dependency on the API.
const catalog=JSON.parse(await readFile(new URL('../../backend/deploy/staging-catalog.json',import.meta.url),'utf8'))
const packages=Object.entries(catalog.plans).map(([slug,terms])=>({
  slug,name:catalog.display[slug].name,pricePaisa:terms.price_paisa,
  credits:terms.included_credits,bonusCredits:catalog.display[slug].bonus_credits,
  targetClips:catalog.display[slug].target_clips,
  trialMaxMinutes:slug==='free'?terms.rules.max_source_seconds/60:null,
}))
const output='// Generated from backend/deploy/staging-catalog.json; run pnpm pricing:generate.\n'+
  'export const pricingPackages = '+JSON.stringify(packages,null,2)+' as const\n'
const target=new URL('../lib/pricing-catalog.ts',import.meta.url)
if(process.argv.includes('--check')) {
  if(await readFile(target,'utf8')!==output)throw Error('Pricing display differs from backend catalog')
} else await writeFile(target,output)
