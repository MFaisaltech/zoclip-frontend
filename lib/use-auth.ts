'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { authApi, AuthApiError, type User } from './auth-api'

type AuthState =
  | { status: 'loading'; user: null; error: null; expired: false }
  | { status: 'authenticated'; user: User; error: null; expired: false }
  | { status: 'anonymous'; user: null; error: null; expired: boolean }
  | { status: 'unavailable'; user: null; error: unknown; expired: false }

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, error: null, expired: false })
  const version = useRef(0)
  const channel = useRef<BroadcastChannel | null>(null)
  const revalidate = useCallback(async () => {
    const current = ++version.current
    try {
      const user = await authApi.me()
      if (current === version.current) setState({ status: 'authenticated', user, error: null, expired: false })
    } catch (error) {
      if (current !== version.current) return
      if (error instanceof AuthApiError && error.status === 401) {
        setState((previous) => ({ status: 'anonymous', user: null, error: null, expired: previous.status === 'authenticated' || previous.expired }))
      } else {
        // Fail closed: a failed session check never reveals the workspace.
        setState({ status: 'unavailable', user: null, error, expired: false })
      }
    }
  }, [])
  useEffect(() => {
    void revalidate()
    const onVisible = () => { if (document.visibilityState === 'visible') void revalidate() }
    const onFocus = () => { void revalidate() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(onVisible, 60000)
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('zoclip-auth')
      channel.current.onmessage = () => { authApi.clearCsrf(); void revalidate() }
    }
    return () => {
      ++version.current
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
      channel.current?.close()
      channel.current = null
    }
  }, [revalidate])
  const acceptUser = useCallback((user: User) => {
    ++version.current
    setState({ status: 'authenticated', user, error: null, expired: false })
    channel.current?.postMessage('changed')
  }, [])
  const clearUser = useCallback(() => {
    ++version.current
    authApi.clearCsrf()
    setState({ status: 'anonymous', user: null, error: null, expired: false })
    channel.current?.postMessage('changed')
  }, [])
  const dismissExpiry = useCallback(() => {
    setState((previous) => previous.status === 'anonymous' ? { ...previous, expired: false } : previous)
  }, [])
  return { ...state, revalidate, acceptUser, clearUser, dismissExpiry }
}
