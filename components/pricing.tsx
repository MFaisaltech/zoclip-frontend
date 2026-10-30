import { pricingPackages } from '@/lib/pricing-catalog'
import { whatsappPurchase } from '@/lib/whatsapp-purchase'

export default function Pricing() {
  return <section id="pricing" aria-labelledby="pricing-title" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
    <div className="mb-9 max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7668df]">Simple credits. Clear prices.</p><h2 id="pricing-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">50 credits per generated clip.</h2><p className="mt-4 text-sm leading-7 text-[#77736e]">Choose a prepaid credit package. Uploading and preparing a video are free. Review the exact quote before generating.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{pricingPackages.map(plan => <article key={plan.slug} aria-labelledby={`plan-${plan.slug}`} className="rounded-2xl border border-[#e8e4de] bg-white p-6">
      <h3 id={`plan-${plan.slug}`} className="text-lg font-semibold">{plan.name}</h3><p className="mt-5 text-3xl font-semibold">PKR {(plan.pricePaisa / 100).toLocaleString('en-PK')}</p><p className="mt-4 font-semibold">{plan.credits.toLocaleString('en-PK')} credits</p><p className="mt-2 text-sm text-[#77736e]">{plan.targetClips} clips at 50 credits each</p>
      <a href={whatsappPurchase(plan.slug)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex rounded-xl bg-[#7668df] px-5 py-3 text-sm font-semibold text-white">Buy via WhatsApp<span className="sr-only"> — {plan.name}</span></a>
    </article>)}</div>
    <p className="mt-6 text-sm leading-7 text-[#77736e]">Ask for verified payment instructions before sending money. Share your registered email, payment screenshot and transaction reference in WhatsApp. An administrator activates credits only after independently verifying payment. No automatic renewals; credits do not expire. Generation still requires available credits and account and spending authorization.</p>
  </section>
}
