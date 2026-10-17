import {resolveApiOrigin} from './auth-api'

// Browser-side diagnostic only. Vercel never proxies credentials or upload bodies.
export async function verifyPrivateApiAccess(options: {
  appOrigin: string; apiOrigin: string; currentOrigin: string;
  fetch?: typeof fetch; timeoutMs?: number
}): Promise<void> {
  if (options.currentOrigin !== options.appOrigin) throw Error('Use the approved staging address.')
  const origin = resolveApiOrigin(options.apiOrigin)
  if (!origin.startsWith('https://')) throw Error('A secure private API is required.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000)
  try {
    const response = await (options.fetch ?? fetch)(origin + '/health/ready', {
      method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error',
      signal: controller.signal,
    })
    const body: unknown = await response.json()
    if (!response.ok || !body || typeof body !== 'object' ||
      (body as {status?: unknown}).status !== 'ready') throw Error('Private API is unavailable.')
  } finally {clearTimeout(timeout)}
}
