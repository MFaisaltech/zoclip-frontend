import { AuthApiError, authApi, resolveApiOrigin } from './auth-api'
import { matches, sessionInvalidEvent } from './workspace-api'
import { mediaDefinitions, mediaDescriptors, type MediaOperations } from './media-schema'
export type { MediaSchemas } from './media-schema'
export type MediaOperation = keyof MediaOperations
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export function mediaErrorMessage(error: unknown): string {
  if (!(error instanceof AuthApiError)) return 'Unable to finish. Retry to check the server and continue.'
  const messages: Record<string, string> = {
    insufficient_credits: 'You need more credits to create these clips. No new attempt was started.',
    lifetime_output_limit: 'Your lifetime trial clip has already been used or is being generated.',
    revision_conflict: 'This clip has changed. Reload it before saving your edits.',
    render_busy: 'Your clip is being created. Wait for it to finish before editing again.',
    export_limit: 'You’ve reached the clip allowance for this video.',
    edit_limit: 'You’ve used the included edits for this video.',
    quote_required: 'Review the price for another export before you confirm.',
    feature_not_reserved: 'This option wasn’t included in your price. Keep your original caption and framing options.',
    already_rendered: 'This version is already being created. Check your clips for its progress.',
    selection_closed: 'These clips are already being created. Check your clips for their progress.',
    invalid_trim: 'Choose start and end times within your video.',
    invalid_captions: 'Check that your caption timings stay in order and within the clip.',
    transcript_unavailable: 'Captions aren’t available for this video yet.',
    quote_expired: 'Your price has expired. Refresh it before creating clips.',
    quote_stale: 'Pricing has changed. Refresh your price before creating clips.',
    unsupported_source: 'This link isn’t supported. Download the video and upload the file instead.',
    unsafe_source: 'We can’t import this link. Upload the video file instead.',
    upload_expired: 'Your saved upload has expired. Start a new upload.',
    upload_closed: 'This upload has finished or expired. Check your videos before starting again.',
    source_not_ready: 'We’re still preparing this video. Please check again shortly.',
    storage_unavailable: 'Allow browser storage for ZoClip so you can resume uploads and recover requests.',
    integrity_failed: 'The transfer was interrupted. Choose the original file and try again.',
    file_mismatch: 'Choose the same original file to resume this upload.',
    duration_exceeded: 'Choose a video shorter than 2 hours.',
    plan_duration_exceeded: 'This video is longer than your account allows. Try a shorter video.',
    plan_limit: 'Choose a shorter video or fewer clips to stay within your account limits.',
    ingestion_limit: 'Finish or cancel an existing upload before adding another.',
    processing_limit: 'Wait for your current clips to finish, or cancel that attempt.',
    concurrency_limit: 'Wait for your current clips to finish before starting another video.',
    insufficient_capacity: 'ZoClip is busy. Please try again later.',
    plan_unconfigured: 'Clip generation isn’t available for your account yet. Please contact support.',
    plan_unavailable: 'Your plan is currently unavailable. Please contact support.',
    spending_disabled: 'Clip generation is temporarily paused. Please try again later.',
    staging_spending_disabled: 'Clip generation is paused during private testing.',
    budget_exceeded: 'Clip generation is temporarily at capacity. Please try again later.',
    usage_limit: 'You’ve reached your account’s usage limit. Please try again after it resets.',
    processing_unavailable: 'Clip generation is temporarily unavailable. You can cancel this attempt.',
    no_speech: 'We couldn’t find speech in this video. Try a video with clear spoken audio. Your credits were returned.',
    no_suggestions: 'We couldn’t find a suitable moment in this video. Try a longer conversation. Your credits were returned.',
    not_found: 'This item is no longer available. Refresh your workspace.',
    authentication_required: 'Your session expired. Sign in again to continue.',
    csrf_failed: 'Your session changed. Please try again.',
    network_error: 'Connection interrupted. Try again to continue where you left off.',
    timeout: 'This is taking longer than expected. Try again to check the result.',
    invalid_response: 'We couldn’t check the result. Please refresh and try again.',
  }
  if (messages[error.code]) return messages[error.code]
  if (error.status === 413) return 'This file is too large. Try a smaller video.'
  if (error.status === 429) return 'ZoClip is busy. Wait a moment and try again.'
  if (error.status === 422) return 'The video, URL or requested settings are invalid. Check them before retrying.'
  if (error.status >= 500) return 'ZoClip is temporarily unavailable. Retry to recover your request.'
  return 'We couldn’t finish this request. Please try again.'
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
      query?: Record<string, string | number>; revision?: number;
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
      if (descriptor.revisionHeader && (!Number.isInteger(args.revision) || args.revision! < 1 || args.revision! > 101))
        throw new AuthApiError(0, 'invalid_request')
      const query = new URLSearchParams()
      for (const [key, value] of Object.entries(args.query ?? {})) {
        if (!(descriptor.queries as readonly string[]).includes(key) ||
          (key === 'search' ? typeof value !== 'string' || value.length > 100 :
            key.endsWith('_id') || ['cursor', 'before'].includes(key) ? !uuid.test(String(value)) :
              !Number.isSafeInteger(Number(value)) || Number(value) < 1 ||
                (key === 'limit' && Number(value) > 100)))
          throw new AuthApiError(0, 'invalid_request')
        query.set(key, String(value))
      }
      if (name === 'events') query.set('limit', '20')
      if (!descriptor.binary && !matches(descriptor.request, args.body ?? null, mediaDefinitions))
        throw new AuthApiError(0, 'invalid_request')
      const perform = async (token?: string) => {
        args.signal?.throwIfAborted()
        const controller = new AbortController()
        const abort = () => controller.abort()
        args.signal?.addEventListener('abort', abort, { once: true })
        const timer = setTimeout(abort, options.timeoutMs ?? (descriptor.binary ? 65000 : 15000))
        try {
          const response = await fetcher(resolveApiOrigin(options.origin) + path + (query.size ? '?' + query : ''), {
            method: descriptor.method, credentials: 'include', cache: 'no-store', signal: controller.signal,
            headers: {
              ...(token && {'X-CSRF-Token': token}),
              ...(descriptor.revisionHeader && {'If-Match': `"${args.revision}"`}),
              ...(descriptor.idempotent && {'Idempotency-Key': args.key!}),
              ...(descriptor.binary ? {'Content-Type': 'application/octet-stream', 'X-Content-SHA256': args.sha256!} :
                args.body && {'Content-Type': 'application/json'}),
            },
            ...(descriptor.binary ? {body: args.binary} : args.body && {body: JSON.stringify(args.body)}),
          })
          if (response.ok && descriptor.download) {
            if (response.headers.get('Content-Type')?.split(';')[0] !== 'video/mp4' || !response.body)
              throw new AuthApiError(0, 'invalid_response')
            const reader = response.body.getReader(), chunks: Uint8Array[] = []
            let size = 0
            try {
              while (true) {
                args.signal?.throwIfAborted()
                if (controller.signal.aborted) throw new AuthApiError(0, 'timeout')
                const next = await reader.read()
                if (next.done) break
                size += next.value.length
                if (size > 512 * 1024 * 1024) throw new AuthApiError(0, 'invalid_response')
                chunks.push(next.value)
              }
              args.signal?.throwIfAborted()
              if (!size) throw new AuthApiError(0, 'invalid_response')
              return new Blob(chunks, {type: 'video/mp4'}) as MediaOperations[K]['response']
            } finally { await reader.cancel().catch(() => undefined) }
          }
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
          if (name === 'billingOverview' || name === 'customerBilling') {
            const billing = data as MediaOperations['billingOverview']['response']
            if ([billing.daily_used_credits, billing.monthly_used_credits, billing.held_credits,
              billing.held_reservations, billing.settled_credits, billing.released_credits].some(value => value < 0))
              throw new AuthApiError(0, 'invalid_response')
          }
          if (name === 'customers' && (data as MediaOperations['customers']['response']).items.some(
            customer => customer.available_credits < 0 || customer.reserved_credits < 0))
            throw new AuthApiError(0, 'invalid_response')
          if (name === 'reservations' && (data as MediaOperations['reservations']['response']).items.some(
            reservation => reservation.credits < 1 || !['HELD', 'SETTLED', 'RELEASED'].includes(reservation.state)))
            throw new AuthApiError(0, 'invalid_response')
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
