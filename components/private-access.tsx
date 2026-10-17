'use client'

import {useState} from 'react'
import {verifyPrivateApiAccess} from '@/lib/staging-access'

export default function PrivateAccess() {
  const [state, setState] = useState<'idle' | 'checking' | 'ready' | 'failed'>('idle')
  async function check() {
    if (state === 'checking') return
    setState('checking')
    try {
      await verifyPrivateApiAccess({appOrigin: process.env.NEXT_PUBLIC_APP_ORIGIN ?? '',
        apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN ?? '', currentOrigin: window.location.origin})
      setState('ready')
    } catch {setState('failed')}
  }
  return <main className="grid min-h-screen place-items-center bg-[#f7f5f1] p-5 text-[#28253a]">
    <section className="w-full max-w-lg rounded-3xl border border-[#e8e4de] bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Connect to private staging</h1>
      <p className="mt-4 text-sm leading-6 text-[#77736e]">Connect your owner-approved WireGuard VPN, then check access from this browser. If prompted, allow local network access for this trusted staging site.</p>
      <button disabled={state === 'checking'} onClick={() => {void check()}} className="mt-6 rounded-xl bg-[#7668df] px-5 py-3 text-sm font-medium text-white disabled:opacity-60">{state === 'checking' ? 'Checking access…' : 'Check private access'}</button>
      {state === 'ready' && <p role="status" className="mt-5 text-sm text-green-800">The private API is reachable from this browser. Sign in to verify your account permissions.</p>}
      {state === 'failed' && <p role="alert" className="mt-5 text-sm text-red-800">Access could not be verified. Use the approved staging address and check your private connection, browser permission and certificate with the owner.</p>}
      <p className="mt-6 text-sm"><a href="/" className="font-medium text-[#7668df]">Back to sign in</a><span className="mx-3 text-[#aaa49c]">·</span><a href="/accept-invite" className="font-medium text-[#7668df]">Accept an invitation</a></p>
    </section>
  </main>
}
