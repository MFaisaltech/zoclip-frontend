import { capacityReview, proposedPackages } from '@/lib/pricing-proposal'

export default function PricingProposal() {
  return <section aria-labelledby="proposal-title" className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7668df]">One-time prepaid packages</p>
    <h1 id="proposal-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">More room for your next ideas.</h1>
    <p role="status" className="mt-5 rounded-xl border border-[#e4defd] bg-[#f2efff] p-4 text-sm leading-6 text-[#6558c8]">Owner-selected pricing targets. Financial projections support these credits under included-cost assumptions. Representative processing capacity is not verified. These packages cannot be purchased or activated.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      {proposedPackages.map(plan=><article key={plan.slug} aria-labelledby={`proposal-${plan.slug}`} className={`rounded-2xl border p-7 ${plan.slug==='pro'?'border-[#b8a8ff] bg-[#f2efff]':'border-[#e8e4de] bg-white'}`}>
        <h2 id={`proposal-${plan.slug}`} className="text-sm font-semibold tracking-wider">{plan.name}</h2>
        <p className="mt-5 text-4xl font-semibold tracking-tight"><span className="text-base font-medium text-[#77736e]">Rs. </span>{(plan.pricePaisa/100).toLocaleString('en-PK')}</p>
        <p className="mt-2 text-sm text-[#77736e]">One-time purchase · No automatic renewal</p>
        <p className="mt-7 text-lg font-semibold">{plan.credits.toLocaleString('en-PK')} proposed credits</p>
        <p className="mt-2 text-sm font-medium text-[#6558c8]">Example allowance: {plan.targetClips} five-minute jobs</p>
        <p className="mt-2 text-sm text-[#77736e]">Up to {plan.targetClips * 3} initial clips if each job successfully produces three selected highlights.</p>
        <p className="mt-3 text-xs leading-6 text-[#77736e]">Calculated at {plan.representativeCredits} credits per job: one clip from a five-minute source, captions and reframe included, no extra edits. The same minimum can cover up to three outputs. Selection depends on your source; clips are not guaranteed. Actual quotes vary with duration and requested outputs.</p>
        <p className="mt-5 text-sm text-[#77736e]">Includes 30 days of processing access. No bonus credits are added to the displayed total.</p>
      </article>)}
    </div>
    <div className="mt-7 overflow-x-auto rounded-2xl border border-[#e8e4de] bg-white p-5">
      <h2 className="font-semibold">Processing capacity acceptance pending</h2>
      <p className="mt-2 text-xs leading-6 text-[#77736e]">Planning projections for the whole server: approximately {capacityReview.projectedOneOutputJobs.toLocaleString('en-PK')} five-minute one-output jobs per month, or {capacityReview.projectedThreeOutputEditJobs.toLocaleString('en-PK')} ten-minute jobs with three outputs and one edit. These are not measured throughput or per-account entitlements. Full redemption by all customers may exceed this VPS.</p>
      <p className="mt-3 text-xs leading-6 text-[#77736e]">Generation is subject to available processing capacity and storage. A rejected request does not consume credits. Existing credits per job remain unchanged. Payments and public AI remain disabled.</p>
    </div>
    <p className="mt-6 text-sm leading-7 text-[#77736e]">Existing trial: one lifetime clip from a source up to five minutes, subject to eligibility and abuse controls. Trial grants and public AI processing remain disabled.</p>
    <p className="mt-3 text-sm leading-7 text-[#77736e]">Clip targets are conditional examples, not a guarantee. Longer source videos and extra edits use more credits. See your exact quote and available balance before confirming generation.</p>
  </section>
}
