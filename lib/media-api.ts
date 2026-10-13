import { AuthApiError, authApi, resolveApiOrigin } from './auth-api'
import { matches, sessionInvalidEvent } from './workspace-api'
import { mediaDefinitions, mediaDescriptors, type MediaOperations } from './media-schema'
export type { MediaSchemas } from './media-schema'
export type MediaOperation = keyof MediaOperations
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function mediaErrorMessage(error: unknown): string {
  if (!(error instanceof AuthApiError)) return 'Unable to finish. Retry to check the server and continue.'
  const messages: Record<string, string> = {
    insufficient_credits: 'You do not have enough available credits. No new job was started.',
    quote_expired: 'This quote expired. Request a fresh quote and review it again.',
    quote_stale: 'Pricing changed. Request a fresh quote and review it again.',
    unsupported_source: 'This URL is unsupported. Use a direct HTTPS MP4 or WebM URL on a host approved by ZoClip.',
    unsafe_source: 'This URL is not permitted by the secure importer.',
    upload_expired: 'This upload expired. Cancel it and start a new upload.',
    upload_closed: 'This upload is closed or expired. Check your jobs for validation, or cancel it before starting again.',
    source_not_ready: 'This source is not ready for processing. Wait for validation or select a retained, validated video.',
    storage_unavailable: 'Browser storage is unavailable. Enable storage for ZoClip to preserve resumable requests and confirmed credit reservations.',
    integrity_failed: 'The uploaded bytes did not match their checksum. Reselect the original file and retry.',
    file_mismatch: 'Reselect the exact original file. Its size or SHA-256 does not match this upload.',
    duration_exceeded: 'The video exceeds the 120-minute limit.',
    plan_duration_exceeded: 'The video exceeds your plan duration limit.',
    plan_limit: 'Your requested video or output count exceeds your plan limits.',
    ingestion_limit: 'The upload limit has been reached. Finish or cancel an existing upload first.',
    processing_limit: 'You already have an active processing job. Finish or cancel it first.',
    concurrency_limit: 'Your plan has reached its concurrent job limit.',
    insufficient_capacity: 'Media storage capacity is temporarily unavailable. Try again later.',
    plan_unconfigured: 'Video processing is unavailable until your plan is configured.',
    spending_disabled: 'Processing is disabled by the server cost controls.',
    processing_unavailable: 'The processing engine is unavailable. Your job is waiting; you can cancel its credit hold.',
    not_found: 'This resource is unavailable, expired, deleted, or belongs to another account.',
    authentication_required: 'Your session expired. Sign in again to continue.',
    csrf_failed: 'Your security session changed. Retry to obtain a fresh security token.',
    network_error: 'Connection interrupted. Retry safely using the same request and confirmed upload parts.',
    timeout: 'The request timed out. Retry safely to recover the server result.',
    invalid_response: 'The server returned an unexpected response. Retry to check its result.',
  }
  if (messages[error.code]) return messages[error.code]
  if (error.status === 413) return 'The file or chunk exceeds the server upload limit.'
  if (error.status === 429) return 'ZoClip has reached a request or queue limit. Wait before retrying.'
  if (error.status === 422) return 'The video, URL or requested settings are invalid. Check them before retrying.'
  if (error.status >= 500) return 'ZoClip is temporarily unavailable. Retry to recover your request.'
  return `The request could not finish (${error.code}).`
}

export function createMediaApi(options: {
  origin?: string; fetch?: typeof fetch; timeoutMs?: number;
  authorize?: <T>(operation: (token: string) => Promise<T>, signal?: AbortSignal) => Promise<T>;
  onUnauthorized?: () => void;
} = {}) {
  const fetcher = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  return {
    async call<K extends MediaOperation>(name: K, args: {
      params?: Record<string, string | number>; body?: MediaOperations[K]['request'];
      key?: string; binary?: Blob; sha256?: string; signal?: AbortSignal;
    } = {}): Promise<MediaOperations[K]['response']> {
      const descriptor = mediaDescriptors[name]
      const path = descriptor.path.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = String(args.params?.[key] ?? '')
        if (key === 'part_number' ? !/^\d+$/.test(value) : !uuid.test(value))
          throw new AuthApiError(0, 'invalid_request')
        return value
      })
      if (descriptor.idempotent && (!args.key || !/^[a-zA-Z0-9_.:-]{1,128}$/.test(args.key)))
        throw new AuthApiError(0, 'invalid_request')
      if (descriptor.binary && (!args.binary || !/^[a-f0-9]{64}$/.test(args.sha256 ?? '')))
        throw new AuthApiError(0, 'invalid_request')
      if (!descriptor.binary && !matches(descriptor.request, args.body ?? null, mediaDefinitions))
        throw new AuthApiError(0, 'invalid_request')
      const perform = async (token?: string) => {
        args.signal?.throwIfAborted()
        const controller = new AbortController()
        const abort = () => controller.abort()
        args.signal?.addEventListener('abort', abort, { once: true })
        const timer = setTimeout(abort, options.timeoutMs ?? (descriptor.binary ? 65000 : 15000))
        try {
          const response = await fetcher(resolveApiOrigin(options.origin) + path + (name === 'events' ? '?limit=20' : ''), {
            method: descriptor.method, credentials: 'include', cache: 'no-store', signal: controller.signal,
            headers: {
              ...(token && {'X-CSRF-Token': token}),
              ...(descriptor.idempotent && {'Idempotency-Key': args.key!}),
              ...(descriptor.binary ? {'Content-Type': 'application/octet-stream', 'X-Content-SHA256': args.sha256!} :
                args.body && {'Content-Type': 'application/json'}),
            },
            ...(descriptor.binary ? {body: args.binary} : args.body && {body: JSON.stringify(args.body)}),
          })
          const data: unknown = response.status === 204 ? null : await response.json().catch(() => null)
          args.signal?.throwIfAborted() // A late old-account response must not invalidate the new account.
          if (controller.signal.aborted) throw new AuthApiError(0, 'timeout')
          if (!response.ok) {
            if (response.status === 401) options.onUnauthorized?.()
            const retry = Number(response.headers.get('Retry-After'))
            throw new AuthApiError(response.status,
              data && typeof data === 'object' && 'code' in data && typeof data.code === 'string' ? data.code : 'http_error',
              Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : null)
          }
          if (!matches(descriptor.response, data, mediaDefinitions)) throw new AuthApiError(0, 'invalid_response')
          if (['job', 'generate', 'complete', 'cancel', 'importUrl'].includes(name)) {
            const job = data as MediaOperations['job']['response']
            if (job.attempts < 0 || (job.progress_percent !== null && (job.progress_percent < 0 || job.progress_percent > 100)) ||
              (job.estimated_credits !== null && job.estimated_credits < 0)) throw new AuthApiError(0, 'invalid_response')
          }
          return data as MediaOperations[K]['response']
        } catch (error) {
          args.signal?.throwIfAborted()
          if (error instanceof AuthApiError) throw error
          throw new AuthApiError(0, controller.signal.aborted ? 'timeout' : 'network_error')
        } finally {
          clearTimeout(timer); args.signal?.removeEventListener('abort', abort)
        }
      }
      if (descriptor.method === 'GET') return perform()
      try { return await (options.authorize ?? authApi.withCsrf)(perform, args.signal) }
      catch (error) {
        args.signal?.throwIfAborted()
        // Includes failure of the CSRF bootstrap before the media request.
        if (error instanceof AuthApiError && error.status === 401) options.onUnauthorized?.()
        throw error
      }
    },
  }
}
export const mediaApi = createMediaApi({ onUnauthorized: () => {
  authApi.clearCsrf()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(sessionInvalidEvent))
} })
