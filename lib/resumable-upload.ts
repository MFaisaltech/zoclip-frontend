import { AuthApiError } from './auth-api'
import { hashFile } from './file-hash'
import { mediaApi, type MediaSchemas } from './media-api'

export type UploadRecord = {
  sha256: string; size: number; initiateKey: string; completeKey: string; uploadId?: string;
}
export type UploadProgress = { stage: 'hashing' | 'initiating' | 'uploading' | 'finalizing'; bytes: number; total: number }
export function uploadProgressLabel(progress: UploadProgress): string {
  switch (progress.stage) {
    case 'hashing': return 'Preparing your video…'
    case 'initiating': return 'Starting your upload…'
    case 'uploading': return 'Uploading your video…'
    case 'finalizing': return 'Finishing your upload…'
  }
}
export const uploadLimit = 4294967296 // OpenAPI hard ceiling; server may configure a lower limit.
export function uploadStorageKey(owner: string) { return `zoclip-upload-v1:${owner}` }
export function readUpload(storage: Pick<Storage, 'getItem'>, owner: string): UploadRecord | null {
  try {
    const record: UploadRecord = JSON.parse(storage.getItem(uploadStorageKey(owner)) ?? 'null')
    if (record && /^[a-f0-9]{64}$/.test(record.sha256) && Number.isSafeInteger(record.size) && record.size > 0 && record.size <= uploadLimit &&
      /^[\w.:-]{1,128}$/.test(record.initiateKey) && /^[\w.:-]{1,128}$/.test(record.completeKey) &&
      (!record.uploadId || /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(record.uploadId))) return record
  } catch { /* Browser storage can be disabled or contain an obsolete record. */ }
  return null
}
export const retryableUploadError = (error: unknown) => error instanceof AuthApiError &&
  error.code !== 'plan_unconfigured' &&
  (['network_error', 'timeout', 'upload_busy', 'upload_timeout'].includes(error.code) ||
   [408, 429, 500, 502, 503, 504].includes(error.status))

export async function retryUpload<T>(work: () => Promise<T>, signal: AbortSignal, attempts = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted()
    try { return await work() } catch (error) {
      if (signal.aborted || attempt >= attempts - 1 || !retryableUploadError(error)) throw error
      const retry = error instanceof AuthApiError ? error.retryAfter : null
      // Long server Retry-After is respected by stopping; user can resume later.
      if (retry && retry > 30) throw error
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(new DOMException('Paused', 'AbortError')) }
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() },
          Math.max((retry ?? 0) * 1000, Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250))
        signal.addEventListener('abort', abort, {once: true})
        if (signal.aborted) abort()
      })
    }
  }
}
export async function runUpload(options: {
  file: Blob; record: UploadRecord | null; signal: AbortSignal;
  save: (record: UploadRecord) => void; progress: (progress: UploadProgress) => void;
  discard?: () => void;
  api?: typeof mediaApi;
}): Promise<MediaSchemas['JobView']> {
  const {file, signal, save, progress} = options, api = options.api ?? mediaApi
  if (file.size <= 0 || file.size > uploadLimit) throw new AuthApiError(413, 'upload_limit')
  progress({stage: 'hashing', bytes: 0, total: file.size})
  const sha256 = await hashFile(file, signal, bytes => progress({stage: 'hashing', bytes, total: file.size}))
  let record = options.record
  if (record && (record.size !== file.size || record.sha256 !== sha256)) throw new AuthApiError(0, 'file_mismatch')
  record ??= {sha256, size: file.size, initiateKey: crypto.randomUUID(), completeKey: crypto.randomUUID()}
  save(record) // Persist BEFORE dispatch, including lost initiation acknowledgments.
  progress({stage: 'initiating', bytes: 0, total: file.size})
  const upload = record.uploadId
    ? await retryUpload(() => api.call('upload', {params: {upload_id: record!.uploadId!}, signal}), signal)
    : await retryUpload(() => api.call('initiate', {body: {size_bytes: file.size, sha256, rights_attested: true}, key: record!.initiateKey, signal}), signal).catch(error => {
      // A definitive rejection cannot have created an upload. Do not require the
      // user to create an unwanted source just to cancel local resume metadata.
      if (error instanceof AuthApiError && [400,403,404,409,413,422].includes(error.status)) options.discard?.()
      throw error
    })
  if (upload.expected_bytes !== file.size || upload.part_bytes < 65536 || upload.part_bytes > 8388608 ||
    !Number.isSafeInteger(upload.part_bytes)) throw new AuthApiError(0, 'invalid_response')
  record = {...record, uploadId: upload.id}; save(record)
  if (['FINALIZING', 'COMPLETE'].includes(upload.state)) {
    progress({stage: 'finalizing', bytes: file.size, total: file.size})
    return retryUpload(() => api.call('complete', {params: {upload_id: upload.id}, key: record!.completeKey, signal}), signal)
  }
  if (Date.parse(upload.expires_at) <= Date.now()) throw new AuthApiError(409, 'upload_expired')
  if (upload.state !== 'OPEN') throw new AuthApiError(409, 'upload_expired')
  const count = Math.ceil(file.size / upload.part_bytes)
  const received = new Set(upload.received_parts ?? [])
  if (Array.from(received).some(n => n < 0 || n >= count)) throw new AuthApiError(0, 'invalid_response')
  let bytes = Array.from(received).reduce((sum, n) => sum + Math.min(upload.part_bytes, file.size - n * upload.part_bytes), 0)
  progress({stage: 'uploading', bytes, total: file.size})
  for (let number = 0; number < count; number++) {
    signal.throwIfAborted()
    if (received.has(number)) continue
    const part = file.slice(number * upload.part_bytes, Math.min(file.size, (number + 1) * upload.part_bytes))
    const digest = await hashFile(part, signal)
    const accepted = await retryUpload(() => api.call('part', {
      params: {upload_id: upload.id, part_number: number}, binary: part, sha256: digest, signal,
    }), signal)
    if (accepted.number !== number || accepted.size_bytes !== part.size || accepted.sha256 !== digest)
      throw new AuthApiError(0, 'invalid_response')
    bytes += part.size; progress({stage: 'uploading', bytes, total: file.size})
  }
  progress({stage: 'finalizing', bytes: file.size, total: file.size})
  return retryUpload(() => api.call('complete', {params: {upload_id: upload.id}, key: record!.completeKey, signal}), signal)
}
