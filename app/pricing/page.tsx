import Link from 'next/link'
import Pricing from '@/components/pricing'

export const metadata = { title: 'Pricing · ZoClip' }

export default function PricingPage() {
  return <main className="min-h-screen bg-[#fbfaf8] text-[#28253a]">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-7 sm:px-8">
      <Link href="/" className="text-xl font-semibold tracking-tight">zoclip</Link>
      <Link href="/" className="rounded-xl border border-[#dedad4] px-4 py-2.5 text-sm font-medium">Go to ZoClip</Link>
    </header>
    <h1 className="mx-auto max-w-6xl px-5 pb-10 pt-10 text-4xl font-semibold tracking-tight sm:px-8">Make room for your next great clip.</h1>
    <Pricing/>
  </main>
}
