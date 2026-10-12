'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ChevronLeft, LockKeyhole, Scissors } from 'lucide-react'
import { authApi, authErrorMessage, type User } from '@/lib/auth-api'
import { authFieldLimits } from '@/lib/auth-schema'

export type AuthMode = 'login' | 'signup' | 'recover' | 'verify' | 'reset'
const copy: Record<AuthMode, { title: string; text: string; action: string }> = {
  login: { title: 'Welcome back', text: 'Sign in to keep your content moving.', action: 'Sign in' },
  signup: { title: 'Create your account', text: 'Create an account, then verify your email to get started.', action: 'Create account' },
  recover: { title: 'Reset your password', text: 'We will send a recovery message if your account is eligible.', action: 'Send recovery link' },
  verify: { title: 'Verify your email', text: 'Enter the token from your verification message.', action: 'Verify email' },
  reset: { title: 'Choose a new password', text: 'Enter the recovery token and your new password.', action: 'Reset password' },
}
const inputStyle = 'mt-2 w-full rounded-xl border border-[#dedad4] bg-[#fbfaf8] px-3.5 py-3 text-sm outline-none focus:border-[#7668df] disabled:opacity-60'
const linkStyle = 'font-medium text-[#7668df] disabled:opacity-50'

export default function AuthView({ onBack, onComplete, onPasswordReset, initialMode = 'login', expired = false }: {
  onBack: () => void; onComplete: (user: User) => void; onPasswordReset: () => void;
  initialMode?: AuthMode; expired?: boolean
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [token, setToken] = useState('')
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    // Fragments stay out of HTTP requests and access logs. Never auto-consume tokens.
    if (initialMode !== 'verify' && initialMode !== 'reset') return
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const value = fragment.get('token')
    if (value) {
      setToken(value)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [initialMode])
  function switchMode(next: AuthMode) {
    setMode(next); setError(''); setMessage(''); setPassword(''); setConfirmation(''); setToken('')
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    setError(''); setMessage('')
    if ((mode === 'signup' || mode === 'reset') && password !== confirmation) {
      setError('Your passwords do not match.'); return
    }
    busy.current = true; setPending(true)
    try {
      if (mode === 'login') {
        const result = await authApi.login({ email: email.trim(), password })
        setPassword('')
        onComplete(result.user)
      } else if (mode === 'signup') {
        await authApi.register({ email: email.trim(), password })
        setMode('verify'); setPassword(''); setConfirmation('')
        setMessage('If eligible, check your email for the next step. Verify your email before signing in.')
      } else if (mode === 'recover') {
        await authApi.forgotPassword({ email: email.trim() })
        setMode('reset')
        setMessage('If eligible, check your email for the next step.')
      } else if (mode === 'verify') {
        await authApi.verifyEmail({ token: token.trim() })
        setMode('login'); setToken('')
        setMessage('Email verified. You can now sign in.')
      } else {
        await authApi.resetPassword({ token: token.trim(), password })
        setMode('login'); setToken(''); setPassword(''); setConfirmation('')
        onPasswordReset()
        setMessage('Password reset. Please sign in with your new password.')
      }
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally {
      busy.current = false; setPending(false)
    }
  }
  const hasEmail = mode === 'login' || mode === 'signup' || mode === 'recover'
  const hasPassword = mode === 'login' || mode === 'signup' || mode === 'reset'
  const hasToken = mode === 'verify' || mode === 'reset'
  return <div className="grid min-h-screen place-items-center bg-[#f7f5f1] p-5 text-[#28253a]">
    <div className="w-full max-w-[440px]">
      <button disabled={pending} onClick={onBack} className="mb-8 flex items-center gap-2 text-sm text-[#77736e]"><ChevronLeft size={16} /> Back to home</button>
      <div className="rounded-3xl border border-[#e8e4de] bg-white p-7 shadow-[0_20px_60px_rgba(40,37,58,0.08)] sm:p-9">
        <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-[10px] bg-[#28253a] text-white"><Scissors size={16} /></div><span className="text-[19px] font-semibold tracking-[-0.04em]">zoclip</span></div>
        <h1 className="mt-9 text-3xl font-semibold tracking-[-0.06em]">{copy[mode].title}</h1>
        <p className="mt-2 text-sm text-[#77736e]">{copy[mode].text}</p>
        {expired && <p role="status" className="mt-4 text-sm text-[#77736e]">Your session has expired. Please sign in again.</p>}
        <form onSubmit={submit} aria-busy={pending} className="mt-6">
          <fieldset disabled={pending}>
            <legend className="sr-only">{copy[mode].title}</legend>
            {hasEmail && <label htmlFor="auth-email" className="block text-xs font-medium text-[#5f596c]">Email address<input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={authFieldLimits.email.maxLength} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={inputStyle} /></label>}
            {hasToken && <label className="block text-xs font-medium text-[#5f596c]">{mode === 'verify' ? 'Verification token' : 'Recovery token'}<input name="token" autoComplete="off" spellCheck={false} required minLength={authFieldLimits.token.minLength} maxLength={authFieldLimits.token.maxLength} value={token} onChange={(event) => setToken(event.target.value)} className={inputStyle} /></label>}
            {hasPassword && <label className="mt-4 block text-xs font-medium text-[#5f596c]">{mode === 'reset' ? 'New password' : 'Password'}<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={authFieldLimits.password.minLength} maxLength={authFieldLimits.password.maxLength} value={password} onChange={(event) => setPassword(event.target.value)} className={inputStyle} /></label>}
            {(mode === 'signup' || mode === 'reset') && <><p className="mt-2 text-xs text-[#8a857f]">Use {authFieldLimits.password.minLength}–{authFieldLimits.password.maxLength} characters.</p><label htmlFor="auth-confirm-password" className="mt-4 block text-xs font-medium text-[#5f596c]">Confirm password<input id="auth-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={authFieldLimits.password.minLength} maxLength={authFieldLimits.password.maxLength} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={inputStyle} /></label></>}
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {message && <p role="status" className="mt-4 rounded-xl bg-[#eef7f1] p-3 text-sm text-[#366e51]">{message}</p>}
            <button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7668df] px-4 py-3 text-sm font-medium text-white hover:bg-[#6658d0] disabled:cursor-wait disabled:opacity-60">{pending ? 'Please wait…' : copy[mode].action}{!pending && <ArrowRight size={15} />}</button>
          </fieldset>
        </form>
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-3 text-center text-xs">
          {mode === 'login' && <><button disabled={pending} onClick={() => switchMode('recover')} className={linkStyle}>Forgot password?</button><button disabled={pending} onClick={() => switchMode('verify')} className={linkStyle}>Verify email</button></>}
          {mode === 'verify' && <button disabled={pending} onClick={() => switchMode('signup')} className={linkStyle}>Request a new verification message</button>}
          {mode === 'reset' && <button disabled={pending} onClick={() => switchMode('recover')} className={linkStyle}>Request a new recovery message</button>}
        </div>
        <div className="mt-7 border-t border-[#eeeae4] pt-6 text-center text-sm text-[#77736e]">{mode === 'login' ? <>New to ZoClip? <button disabled={pending} onClick={() => switchMode('signup')} className={linkStyle}>Create an account</button></> : <button disabled={pending} onClick={() => switchMode('login')} className={linkStyle}>Back to sign in</button>}</div>
      </div>
      <p className="mt-5 flex items-center justify-center gap-1 text-xs text-[#aaa49c]"><LockKeyhole size={12} /> Your content stays private and secure</p>
    </div>
  </div>
}
