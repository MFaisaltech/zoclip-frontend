import { notFound } from 'next/navigation'
import PricingProposal from '@/components/pricing-proposal'

// Operator-local preview only. Existing production pricing is not switched.
export const dynamic='force-dynamic'

export default function PricingProposalPage() {
  if(process.env.ZOCLIP_PRICING_PROPOSAL_PREVIEW!=='1')notFound()
  return <main><PricingProposal/></main>
}
