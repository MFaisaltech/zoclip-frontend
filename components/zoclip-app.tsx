'use client'

import { useState } from 'react'
import AuthView, { type AuthMode } from '@/components/auth-view'
import { authApi, authErrorMessage } from '@/lib/auth-api'
import { useAuth } from '@/lib/use-auth'
import Workspace, { type WorkspaceSection } from '@/components/workspace-view'
import { ArrowRight, Play, Scissors, Sparkles } from 'lucide-react'

function Brand() { return <div className="flex items-center gap-2.5 text-[#201f28]"><div className="grid size-8 place-items-center rounded-[10px] bg-[#28253a] text-white shadow-sm"><Scissors size={16} strokeWidth={2.5} /></div><span className="text-[19px] font-semibold tracking-[-0.04em]">zoclip</span></div> }
function Button({ children, variant = 'dark', onClick, className = '' }: { children: React.ReactNode; variant?: 'dark' | 'light' | 'outline' | 'violet'; onClick?: () => void; className?: string }) { const styles = { dark: 'bg-[#28253a] text-white hover:bg-[#3a3650]', light: 'bg-white text-[#28253a] hover:bg-[#f4f1ed]', outline: 'border border-[#d9d5d0] bg-white text-[#28253a] hover:bg-[#faf9f7]', violet: 'bg-[#7668df] text-white hover:bg-[#6658d0]' }; return <button onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${styles[variant]} ${className}`}>{children}</button> }
function Landing({ onEnter }: { onEnter: () => void }) { return <div className="min-h-screen bg-[#fbfaf8] text-[#28253a]"><header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 md:px-8"><Brand /><nav className="hidden items-center gap-8 text-sm text-[#77736e] md:flex"><a href="#how">Product preview</a></nav><div className="flex items-center gap-3"><button onClick={onEnter} className="hidden text-sm font-medium text-[#5f596c] sm:block">Sign in</button><Button onClick={onEnter}>Try ZoClip <ArrowRight size={15} /></Button></div></header><main><section className="mx-auto grid max-w-[1180px] items-center gap-14 px-5 pb-20 pt-16 md:grid-cols-[1fr_0.9fr] md:px-8 md:pb-28 md:pt-24"><div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e4defd] bg-[#f2efff] px-3 py-1.5 text-xs font-medium text-[#6558c8]"><Sparkles size={13} /> The smarter way to make short-form</div><h1 className="max-w-xl text-[3.4rem] font-semibold leading-[0.97] tracking-[-0.075em] sm:text-[4.7rem]">Your best content is already <span className="text-[#7668df]">in the footage.</span></h1><p className="mt-7 max-w-md text-base leading-7 text-[#77736e]">ZoClip finds the moments your audience will care about, turns them into polished short-form videos, and gets you back to creating.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Button onClick={onEnter} variant="violet" className="px-5 py-3">Open your workspace <ArrowRight size={16} /></Button><Button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} variant="outline" className="px-5 py-3"><Play size={15} fill="currentColor" /> See product preview</Button></div><div className="mt-8 flex items-center gap-3 text-xs text-[#8a857f]"><div className="flex -space-x-2"><div className="grid size-7 place-items-center rounded-full border-2 border-[#fbfaf8] bg-[#d9b8a0] text-[9px] font-bold">AK</div><div className="grid size-7 place-items-center rounded-full border-2 border-[#fbfaf8] bg-[#a9c8c3] text-[9px] font-bold">MR</div><div className="grid size-7 place-items-center rounded-full border-2 border-[#fbfaf8] bg-[#d1c5e9] text-[9px] font-bold">JL</div></div> Product preview. Illustration only.</div></div><div id="how" className="relative rounded-[28px] border border-[#e8e4de] bg-[#f1eee9] p-4 shadow-[0_24px_70px_rgba(40,37,58,0.12)]"><div className="rounded-[20px] bg-[#28253a] p-5 text-white"><div className="flex items-center justify-between text-xs text-[#bab4d0]"><span>PRODUCT ILLUSTRATION</span><span className="rounded-full bg-[#4f9d78]/20 px-2 py-1 text-[#8fd3ad]">Preview</span></div><div className="mt-20 rounded-xl bg-gradient-to-br from-[#bcaaff] to-[#6255d5] p-5"><div className="max-w-[210px] text-3xl font-semibold leading-[0.95] tracking-[-0.06em]">Make content people remember.</div><div className="mt-12 flex items-center justify-between text-xs text-white/75"><span>00:42</span><span>9:16</span></div></div><div className="mt-4 flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-white/20"><div className="h-full w-[62%] rounded-full bg-[#b4a8ff]" /></div><span className="text-[10px] text-[#aaa4c6]">62%</span></div></div></div></section></main></div> }


export default function ZoClipApp({ initialMode }: { initialMode?: AuthMode }) {
  const auth = useAuth()
  const [view, setView] = useState<'landing' | 'auth'>(initialMode ? 'auth' : 'landing')
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [completedTokenFlow, setCompletedTokenFlow] = useState(false)
  const [workspaceSection, setWorkspaceSection] = useState<{ userId: string; section: WorkspaceSection } | null>(null)
  async function logout() {
    if (loggingOut) return
    setLoggingOut(true); setLogoutError('')
    try {
      await authApi.logout()
      auth.clearUser()
      setWorkspaceSection(null)
      setCompletedTokenFlow(true)
      setView('landing')
    } catch (error) {
      setLogoutError(authErrorMessage(error))
      await auth.revalidate()
    } finally {
      setLoggingOut(false)
    }
  }
  if (auth.status === 'loading' || auth.status === 'unavailable') return <div className="grid min-h-screen place-items-center bg-[#f7f5f1] p-5 text-[#28253a]"><div className="w-full max-w-md rounded-3xl border border-[#e8e4de] bg-white p-9 text-center shadow-sm"><Brand />{auth.status === 'loading' ? <p role="status" className="mt-6 text-sm text-[#77736e]">Checking your session…</p> : <><p role="alert" className="my-6 text-sm text-red-800">{authErrorMessage(auth.error)}</p><Button variant="violet" onClick={() => { void auth.revalidate() }}>Try again</Button></>}</div></div>
  const tokenFlow = initialMode && !completedTokenFlow
  if (auth.status === 'authenticated' && !tokenFlow) return <Workspace key={auth.user.id} active={workspaceSection?.userId === auth.user.id ? workspaceSection.section : 'Overview'} onNavigate={(section) => setWorkspaceSection({ userId: auth.user.id, section })} onRefreshProfile={auth.revalidate} user={auth.user} loggingOut={loggingOut} logoutError={logoutError} onLogout={() => { void logout() }} />
  if (view === 'auth' || auth.expired) return <AuthView initialMode={initialMode} expired={auth.expired} onBack={() => { auth.dismissExpiry(); setCompletedTokenFlow(true); setView('landing') }} onComplete={(user) => { auth.acceptUser(user); setCompletedTokenFlow(true) }} onPasswordReset={() => { auth.clearUser(); setCompletedTokenFlow(true) }} />
  return <Landing onEnter={() => setView('auth')} />
}
