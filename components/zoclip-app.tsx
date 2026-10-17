'use client'

import { useState } from 'react'
import Landing from './landing'
import AuthView, { type AuthMode } from '@/components/auth-view'
import { authApi, authErrorMessage } from '@/lib/auth-api'
import { useAuth } from '@/lib/use-auth'
import type { WorkspaceSection } from '@/components/workspace-view'
import Workspace from '@/components/customer-workspace'
import { Scissors } from 'lucide-react'

function Brand() { return <div className="flex items-center gap-2.5 text-[#201f28]"><div className="grid size-8 place-items-center rounded-[10px] bg-[#28253a] text-white shadow-sm"><Scissors size={16} strokeWidth={2.5} /></div><span className="text-[19px] font-semibold tracking-[-0.04em]">zoclip</span></div> }
function Button({ children, variant = 'dark', onClick, className = '' }: { children: React.ReactNode; variant?: 'dark' | 'light' | 'outline' | 'violet'; onClick?: () => void; className?: string }) { const styles = { dark: 'bg-[#28253a] text-white hover:bg-[#3a3650]', light: 'bg-white text-[#28253a] hover:bg-[#f4f1ed]', outline: 'border border-[#d9d5d0] bg-white text-[#28253a] hover:bg-[#faf9f7]', violet: 'bg-[#7668df] text-white hover:bg-[#6658d0]' }; return <button onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${styles[variant]} ${className}`}>{children}</button> }



export default function ZoClipApp({ initialMode, initialSection = 'Overview' }: { initialMode?: AuthMode; initialSection?: WorkspaceSection }) {
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
  if (view === 'landing' && (auth.status === 'loading' || auth.status === 'unavailable' || auth.status === 'anonymous') && !auth.expired) return <Landing onEnter={() => setView('auth')} />
  if (auth.status === 'loading' || auth.status === 'unavailable') return <div className="grid min-h-screen place-items-center bg-[#f7f5f1] p-5 text-[#28253a]"><div className="w-full max-w-md rounded-3xl border border-[#e8e4de] bg-white p-9 text-center shadow-sm"><Brand />{auth.status === 'loading' ? <p role="status" className="mt-6 text-sm text-[#77736e]">Checking your session…</p> : <><p role="alert" className="my-6 text-sm text-red-800">{authErrorMessage(auth.error)}</p><Button variant="violet" onClick={() => { void auth.revalidate() }}>Try again</Button></>}</div></div>
  const tokenFlow = initialMode && !completedTokenFlow
  if (auth.status === 'authenticated' && !tokenFlow) return <Workspace key={auth.user.id} active={workspaceSection?.userId === auth.user.id ? workspaceSection.section : initialSection} onNavigate={(section) => setWorkspaceSection({ userId: auth.user.id, section })} onRefreshProfile={auth.revalidate} user={auth.user} loggingOut={loggingOut} logoutError={logoutError} onLogout={() => { void logout() }} />
  if (view === 'auth' || auth.expired) return <AuthView initialMode={initialMode} expired={auth.expired} onBack={() => { auth.dismissExpiry(); setCompletedTokenFlow(true); setView('landing') }} onComplete={(user) => { auth.acceptUser(user); setCompletedTokenFlow(true) }} onPasswordReset={() => { auth.clearUser(); setCompletedTokenFlow(true) }} />
  return <Landing onEnter={() => setView('auth')} />
}
