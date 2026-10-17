import { pricingPackages } from '@/lib/pricing-catalog'

export default function Pricing() {
  return <section id="pricing" aria-labelledby="pricing-title" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
    <div className="mb-9 max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7668df]">Simple credits. Clear prices.</p>
      <h2 id="pricing-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Know the price before you create.</h2>
      <p className="mt-4 text-sm leading-7 text-[#77736e]">Choose a credit package for your next videos. No automatic renewals and no credit charge for uploading.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {pricingPackages.map(plan=><article key={plan.slug} aria-labelledby={`plan-${plan.slug}`} className={`rounded-2xl border p-6 ${plan.slug==='creator'?'border-[#b8a8ff] bg-[#f2efff]':'border-[#e8e4de] bg-white'}`}>
        <h3 id={`plan-${plan.slug}`} className="text-sm font-semibold tracking-wider">{plan.name}</h3>
        <p className="mt-5 text-3xl font-semibold tracking-tight"><span className="text-sm font-medium text-[#77736e]">PKR </span>{(plan.pricePaisa/100).toLocaleString('en-PK')}</p>
        {plan.slug==='free'?<>
          <p className="mt-5 font-semibold">1 lifetime trial clip</p>
          <p className="mt-2 text-sm text-[#77736e]">Sources up to {plan.trialMaxMinutes} minutes</p>
          <p className="mt-3 text-xs leading-6 text-[#77736e]">One trial per account. Paid packages give you more credits when you need them.</p>
        </>:<>
          <p className="mt-5 font-semibold">{plan.credits.toLocaleString('en-PK')} credits</p>
          <p className="mt-2 text-sm font-medium text-[#6558c8]">Target: {plan.targetClips} generated clips</p>
          <p className="mt-3 text-xs leading-6 text-[#77736e]">{plan.bonusCredits?`Includes ${plan.bonusCredits} bonus credits`:'All credits included in the price'}</p>
        </>}
      </article>)}
    </div>
    <div className="mt-6 max-w-3xl space-y-3 text-sm leading-7 text-[#77736e]">
      <p><strong className="font-semibold text-[#28253a]">Clip targets are estimates.</strong> Longer source videos and extra edits use more credits, so your package may cover fewer clips. See the exact duration-based quote and your balance before you confirm generation.</p>
      <p>Credit purchases and free trials are coming soon. Generation remains subject to account access, available credits and spending limits.</p>
    </div>
  </section>
}
