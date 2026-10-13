import type { AuthOperations, AuthSchemas } from './auth-schema'

export type User = AuthSchemas['Me']
export class AuthApiError extends Error {
  constructor(public status: number, public code: string, public retryAfter: number | null = null) {
    super(code)
    this.name = 'AuthApiError'
  }
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof AuthApiError)) return 'Something went wrong. Please try again.'
  const messages: Record<string, string> = {
    invalid_credentials: 'Check your email and password. Your email must be verified before signing in.',
    authentication_required: 'Your session has expired. Please sign in again.',
    session_expired: 'Your session has expired. Please sign in again.',
    csrf_failed: 'Your security session changed or expired. Please try again.',
    invalid_token: 'This link or token is invalid, expired, or already used. Request a new one.',
    email_unconfigured: 'Email delivery is unavailable. Please try again later.',
    validation_failed: 'Please check your email, password, and verification token.',
    network_error: 'Cannot reach ZoClip. Check your connection and try again. Your last request may have completed.',
    timeout: 'ZoClip took too long to respond. Your request may have completed; check before trying again.',
    api_unconfigured: 'Authentication is unavailable. The API origin needs to be configured.',
    invalid_response: 'ZoClip returned an unexpected response. Please try again later.',
  }
  if (error.status === 429) return `Too many attempts. Please wait${error.retryAfter ? ` at least ${error.retryAfter} seconds` : ' a few minutes'} before trying again.`
  if (messages[error.code]) return messages[error.code]
  if (error.status === 400) return 'This link or token is invalid, expired, or already used. Request a new one.'
  if (error.status === 403) return 'You do not have permission to perform this action.'
  if (error.status >= 500) return 'ZoClip is temporarily unavailable. Please try again later.'
  return 'The request could not be completed. Please try again.'
}

function configuredOrigin(): string {
  const value = process.env.NEXT_PUBLIC_API_ORIGIN || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '')
  if (!value) throw new AuthApiError(0, 'api_unconfigured')
  return value
}

export function resolveApiOrigin(explicit?: string): string {
  try {
    const url = new URL(explicit ?? configuredOrigin())
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && process.env.NODE_ENV !== 'production'))) throw Error('Invalid origin')
    return url.origin
  } catch {
    throw new AuthApiError(0, 'api_unconfigured')
  }
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<User>
  return typeof user.id === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.id) &&
    typeof user.email === 'string' && user.email.length > 0 && user.verified === true &&
    (user.role === 'customer' || user.role === 'admin') &&
    typeof user.created_at === 'string' && Number.isFinite(Date.parse(user.created_at))
}

function isCsrf(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

function validResponse(operation: keyof AuthOperations, data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const value = data as Record<string, unknown>
  if (operation === 'GET /api/v1/me') return isUser(data)
  if (operation === 'POST /api/v1/auth/login') return isUser(value.user) && isCsrf(value.csrf_token)
  if (operation === 'GET /api/v1/auth/csrf' || operation === 'POST /api/v1/auth/session/rotate') return isCsrf(value.csrf_token)
  return typeof value.message === 'string'
}

export function createAuthClient(options: { origin?: string; fetch?: typeof fetch; timeoutMs?: number } = {}) {
  let csrf: string | null = null
  // Serializing local mutations avoids racing token rotation and logout/login.
  let tail: Promise<unknown> = Promise.resolve()
  const fetcher = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  async function request<K extends keyof AuthOperations>(operation: K, body?: AuthOperations[K]['request']): Promise<AuthOperations[K]['response']> {
    const [method, path] = operation.split(' ')
    const url = resolveApiOrigin(options.origin) + path
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000)
    try {
      const response = await fetcher(url, {
        method, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: {
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(method === 'POST' && csrf && { 'X-CSRF-Token': csrf }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const problem = data as Partial<AuthSchemas['Problem']> | null
        const code = typeof problem?.code === 'string' ? problem.code : 'http_error'
        if (code === 'csrf_failed' || response.status === 401) csrf = null
        const retry = Number(response.headers.get('Retry-After'))
        throw new AuthApiError(response.status, code, retry > 0 && Number.isFinite(retry) ? Math.ceil(retry) : null)
      }
      if (!validResponse(operation, data)) {
        if (method === 'POST') csrf = null
        throw new AuthApiError(response.status, 'invalid_response')
      }
      return data as AuthOperations[K]['response']
    } catch (error) {
      if (error instanceof AuthApiError) throw error
      throw new AuthApiError(0, controller.signal.aborted ? 'timeout' : 'network_error')
    } finally {
      clearTimeout(timer)
    }
  }
  function mutate<K extends keyof AuthOperations>(operation: K, body?: AuthOperations[K]['request']): Promise<AuthOperations[K]['response']> {
    const result = tail.then(async () => {
      if (!csrf) {
        const response = await request('GET /api/v1/auth/csrf')
        csrf = response.csrf_token
      }
      // No automatic mutation replay, including after CSRF failure or a timeout.
      const response = await request(operation, body)
      if ('csrf_token' in response) csrf = response.csrf_token
      if (operation === 'POST /api/v1/auth/logout' || operation === 'POST /api/v1/auth/password/reset') csrf = null
      return response
    })
    tail = result.catch(() => undefined)
    return result
  }
  return {
    me: () => request('GET /api/v1/me'),
    register: (body: AuthSchemas['Credentials']) => mutate('POST /api/v1/auth/register', body),
    verifyEmail: (body: AuthSchemas['TokenInput']) => mutate('POST /api/v1/auth/verify-email', body),
    login: (body: AuthSchemas['Credentials']) => mutate('POST /api/v1/auth/login', body),
    logout: () => mutate('POST /api/v1/auth/logout'),
    forgotPassword: (body: AuthSchemas['EmailInput']) => mutate('POST /api/v1/auth/password/forgot', body),
    resetPassword: (body: AuthSchemas['ResetInput']) => mutate('POST /api/v1/auth/password/reset', body),
    rotate: () => mutate('POST /api/v1/auth/session/rotate'),
    clearCsrf: () => { csrf = null },
    // Media mutations share the auth queue and in-memory CSRF token. Never replay here.
    withCsrf: <T>(operation: (token: string) => Promise<T>, signal?: AbortSignal): Promise<T> => {
      const result = tail.then(async () => {
        signal?.throwIfAborted()
        if (!csrf) csrf = (await request('GET /api/v1/auth/csrf')).csrf_token
        signal?.throwIfAborted()
        try { return await operation(csrf) }
        catch (error) {
          if (error instanceof AuthApiError && (error.status === 401 || error.code === 'csrf_failed')) csrf = null
          throw error
        }
      })
      tail = result.catch(() => undefined)
      return result
    },
  }
}

export const authApi = createAuthClient()
