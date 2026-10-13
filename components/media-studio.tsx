'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthApiError } from '@/lib/auth-api'
import { mediaApi, mediaErrorMessage, type MediaSchemas } from '@/lib/media-api'
import { runUpload, readUpload, uploadStorageKey, uploadLimit, type UploadRecord, type UploadProgress } from '@/lib/resumable-upload'
import { matches } from '@/lib/workspace-api'
import { mediaDefinitions } from '@/lib/media-schema'

const panel = 'mb-6 rounded-2xl border border-[#e8e4de] bg-white p-5'
const button = 'rounded-xl border border-[#d9d5d0] bg-white px-4 py-2 text-sm font-medium text-[#6457c8] hover:bg-[#f2efff] disabled:opacity-50 disabled:cursor-not-allowed'
const primary = `${button} bg-[#eeeafd]`
const input = 'mt-2 block w-full rounded-xl border border-[#d9d5d0] bg-[#fbfaf8] p-3 text-sm'
type Job = MediaSchemas['JobView']
type Video = MediaSchemas['VideoView']
type Quote = MediaSchemas['QuoteView']
export const finalJob = (job: Job) => ['COMPLETED', 'FAILED', 'CANCELED'].includes(job.state)
const format = (value: string) => value.replaceAll('_', ' ')
function ErrorText({error}: {error: unknown}) {
  return error ? <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{mediaErrorMessage(error)}</p> : null
}
function storeSet(storage: Storage, key: string, value: unknown) {
  try { storage.setItem(key, JSON.stringify(value)) }
  catch { throw new AuthApiError(0, 'storage_unavailable') }
}

export function JobMonitor({jobId, onChanged}: {jobId: string; onChanged: () => void}) {
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [canceling, setCanceling] = useState(false)
  const [events, setEvents] = useState<MediaSchemas['EventView'][] | null>(null)
  const [retry, setRetry] = useState(0)
  const changed = useRef(onChanged)
  changed.current = onChanged
  const controls = useRef(new Set<AbortController>())
  useEffect(() => {
    const controllers = controls.current
    return () => { for (const controller of controllers) controller.abort(); controllers.clear() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>, failures = 0, last = ''
    async function poll() {
      if (document.visibilityState === 'hidden') { timer = setTimeout(() => { void poll() }, 5000); return }
      try {
        const next = await mediaApi.call('job', {params: {job_id: jobId}, signal: controller.signal})
        if (controller.signal.aborted) return
        setJob(next); setError(null); failures = 0
        if (last !== next.updated_at) { last = next.updated_at; changed.current() }
        if (finalJob(next)) return
      } catch (cause) { if (controller.signal.aborted) return; setError(cause); failures++ }
      timer = setTimeout(() => { void poll() }, Math.min(30000, 3000 * 2 ** failures))
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [jobId, retry])
  async function action(kind: 'cancel' | 'events') {
    const controller = new AbortController(); controls.current.add(controller)
    setError(null)
    if (kind === 'cancel') setCanceling(true)
    try {
      if (kind === 'cancel') {
        const next = await mediaApi.call('cancel', {params: {job_id: jobId}, signal: controller.signal})
        if (!controller.signal.aborted) { setJob(next); changed.current(); setRetry(n => n + 1) }
      } else {
        const next = await mediaApi.call('events', {params: {job_id: jobId}, signal: controller.signal})
        if (!controller.signal.aborted) setEvents(next)
      }
    } catch (cause) { if (!controller.signal.aborted) setError(cause) }
    finally { controls.current.delete(controller); if (!controller.signal.aborted) setCanceling(false) }
  }
  return <section aria-label="Live job" className={panel}>
    <h2 className="text-lg font-semibold">Live job</h2>
    <p className="my-2 break-all text-xs text-[#8a857f]">{jobId}</p>
    {!job && !error && <p role="status">Loading job…</p>}
    {job && <>
      <p role="status" className="my-3 font-medium capitalize">{format(job.kind)} · {format(job.state)}</p>
      <p className="text-sm text-[#77736e]">Stage: {format(job.stage)} · {job.progress_percent === null ? 'Progress unavailable' : `${job.progress_percent}%`}</p>
      {job.progress_percent !== null && <progress className="my-3 w-full accent-[#7668df]" aria-label="Job progress" value={job.progress_percent} max={100} />}
      <p className="my-2 text-xs text-[#8a857f]">Updated {new Date(job.updated_at).toLocaleString()} · Attempts: {job.attempts} · Credit estimate: {job.estimated_credits ?? 'Unavailable'}</p>
      <p className="my-2 text-xs text-[#8a857f]">Queue position: unavailable · Heartbeat: {job.heartbeat_at ? new Date(job.heartbeat_at).toLocaleString() : 'Unavailable'}</p>
      {job.error_code && <p className="my-3 text-sm text-red-800">Server code: {job.error_code}</p>}
      {job.state === 'WAITING_ENGINE' && <p className="my-3 text-sm">The AI engine is unavailable. This job is waiting; no clips are ready. You can cancel its credit hold.</p>}
      {job.state === 'SUGGESTIONS_READY' && <p className="my-3 text-sm">AI suggestions are ready. Rendering and editing are a later milestone. Credits remain held until a deliverable or cancellation; inactive holds expire after 24 hours.</p>}
      {job.state === 'COMPLETED' && ['VALIDATE', 'IMPORT'].includes(job.kind) && <p className="my-3 text-sm">Source validated. Select it below to review a processing quote.</p>}
      {job.state === 'FAILED' && <p className="my-3 text-sm">This job failed. Review its server code and events. Processing credits release on final failure. A new processing attempt requires a new quote and confirmation.</p>}
      {job.state === 'CANCEL_REQUESTED' && <p className="my-3 text-sm">Cancellation requested. Waiting for the worker to acknowledge it safely.</p>}
      {job.state === 'CANCELED' && <p className="my-3 text-sm">The server confirmed cancellation.</p>}
    </>}
    <ErrorText error={error} />
    <div className="mt-4 flex flex-wrap gap-2">
      <button className={button} onClick={() => setRetry(n => n + 1)}>Refresh job</button>
      <button className={button} onClick={() => { void action('events') }}>Load recent events</button>
      {job && !finalJob(job) && <button className={button} disabled={canceling || job.state === 'CANCEL_REQUESTED'} onClick={() => { void action('cancel') }}>{canceling ? 'Canceling…' : 'Cancel job'}</button>}
    </div>
    {events && <ol className="mt-4 space-y-2 text-xs text-[#77736e]" aria-label="Recent job events">{events.map((event, i) => <li key={`${event.created_at}:${i}`}>{new Date(event.created_at).toLocaleString()} · {event.state} {event.code && `· ${event.code}`}</li>)}</ol>}
  </section>
}

type Confirmed = {quote: Quote; key: string; confirmed: boolean}
function quoteKey(owner: string, video: string) { return `zoclip-generation-v1:${owner}:${video}` }
export function Generation({owner, videoId, onJob}: {owner: string; videoId: string; onJob: (job: Job) => void}) {
  const [video, setVideo] = useState<Video | null>(null)
  const [request, setRequest] = useState<Confirmed | null>(null)
  const [count, setCount] = useState(1)
  const [captions, setCaptions] = useState(true)
  const [reframe, setReframe] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [loaded, setLoaded] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const quoteAttempt = useRef<{payload: string; key: string} | null>(null)
  const storageKey = quoteKey(owner, videoId)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as Confirmed | null
      if (saved && matches({$ref: '#/components/schemas/QuoteView'}, saved.quote, mediaDefinitions) &&
        /^[\w.:-]{1,128}$/.test(saved.key) && typeof saved.confirmed === 'boolean') setRequest(saved)
    } catch { /* Optional persistence; explicit dispatch below must persist before charging. */ }
    setLoaded(true)
    return () => controller.current?.abort()
  }, [storageKey])
  async function act(confirm: boolean) {
    if (controller.current) return
    const active = new AbortController(); controller.current = active; setBusy(true); setError(null)
    try {
      if (!confirm) {
        const source = await mediaApi.call('video', {params: {video_id: videoId}, signal: active.signal})
        setVideo(source)
        const duration = source.metadata_json.duration_seconds
        if (source.state !== 'READY' || typeof duration !== 'number' || !Number.isSafeInteger(duration) || duration < 1 || duration > 7200)
          throw new AuthApiError(409, 'source_not_ready')
        const body = {source_seconds: duration, output_count: count, edit_count: 0, captions, reframe}
        const payload = JSON.stringify(body)
        if (quoteAttempt.current?.payload !== payload) quoteAttempt.current = {payload, key: crypto.randomUUID()}
        const quote = await mediaApi.call('quote', {body, key: quoteAttempt.current.key, signal: active.signal})
        if (quote.credits < 0) throw new AuthApiError(0, 'invalid_response')
        const next = {quote, key: crypto.randomUUID(), confirmed: false}
        storeSet(sessionStorage, storageKey, next); setRequest(next)
      } else if (request) {
        if (!request.confirmed && Date.parse(request.quote.expires_at) <= Date.now()) throw new AuthApiError(409, 'quote_expired')
        const next = {...request, confirmed: true}
        storeSet(sessionStorage, storageKey, next); setRequest(next)
        const job = await mediaApi.call('generate', {params: {video_id: videoId}, body: {quote_id: next.quote.id}, key: next.key, signal: active.signal})
        sessionStorage.removeItem(storageKey); setRequest(null); onJob(job)
      }
    } catch (cause) {
      if (!active.signal.aborted) {
        setError(cause)
        // A definitive rejection did not admit a new job. Unknown outcomes retain approval/key.
        if (confirm && cause instanceof AuthApiError && cause.status >= 400 && cause.status < 500 && ![401,408,429].includes(cause.status)) {
          sessionStorage.removeItem(storageKey); setRequest(null)
        }
      }
    } finally { if (!active.signal.aborted) setBusy(false); controller.current = null }
  }
  return <section aria-label="Processing quote" className={panel}>
    <h2 className="text-lg font-semibold">Review AI processing</h2>
    <p className="my-3 break-all text-xs text-[#8a857f]">Video {videoId}{video && ` · ${video.state}`}</p>
    <p className="mb-4 text-sm leading-6 text-[#77736e]">Processing extracts audio for Deepgram transcription and sends the transcript to Gemini for suggestions when those services are configured. Source retention is shown in your video list. This step does not render clips. Credits are reserved on confirmation and released on final failure or cancellation.</p>
    {!request && <div className="space-y-3">
      <label htmlFor="output-count" className="block text-sm">Maximum outputs<input id="output-count" className={input} type="number" min={1} max={100} value={count} disabled={busy} onChange={e => setCount(Number(e.target.value))} /></label>
      <label htmlFor="quote-captions" className="flex items-center gap-2 text-sm"><input id="quote-captions" type="checkbox" checked={captions} disabled={busy} onChange={e => setCaptions(e.target.checked)} />Include captions in quote</label>
      <label htmlFor="quote-reframe" className="flex items-center gap-2 text-sm"><input id="quote-reframe" type="checkbox" checked={reframe} disabled={busy} onChange={e => setReframe(e.target.checked)} />Include reframing in quote</label>
      <button className={primary} disabled={!loaded || busy || !Number.isInteger(count) || count < 1 || count > 100} onClick={() => { void act(false) }}>{busy ? 'Requesting quote…' : 'Get processing quote'}</button>
    </div>}
    {request && <div className="rounded-xl bg-[#f2efff] p-4 text-sm">
      <p className="font-semibold">{request.quote.credits.toLocaleString()} credits to reserve</p>
      <p className="mt-2">{request.quote.request.source_seconds} source seconds · {request.quote.request.output_count} maximum outputs · Captions {request.quote.request.captions ? 'included' : 'excluded'} · Reframing {request.quote.request.reframe ? 'included' : 'excluded'}</p>
      <p className="my-2">Quote expires {new Date(request.quote.expires_at).toLocaleString()}</p>
      {request.confirmed && <p className="my-3">You already confirmed this request. Recover it using the same key to avoid a duplicate credit hold.</p>}
      <div className="flex flex-wrap gap-2"><button className={primary} disabled={busy} onClick={() => { void act(true) }}>{busy ? 'Checking request…' : request.confirmed ? 'Recover confirmed request' : `Confirm and reserve ${request.quote.credits} credits`}</button>
      {!request.confirmed && <button className={button} disabled={busy} onClick={() => { sessionStorage.removeItem(storageKey); setRequest(null); quoteAttempt.current = null }}>Change settings / refresh quote</button>}</div>
    </div>}
    <ErrorText error={error} />
  </section>
}

export default function MediaStudio({owner, visible, videoId, jobId, onJob, onChanged}: {
  owner: string; visible: boolean; videoId: string | null; jobId: string | null;
  onJob: (job: Job) => void; onChanged: () => void;
}) {
  const [file, setFile] = useState<File | null>(null)
  const [record, setRecord] = useState<UploadRecord | null>(null)
  const [rights, setRights] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const [url, setUrl] = useState('')
  const [maxMiB, setMaxMiB] = useState(256)
  const active = useRef<AbortController | null>(null)
  const importAttempt = useRef<{body: string; key: string} | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    try { setRecord(readUpload(localStorage, owner)) }
    catch { setError(new AuthApiError(0, 'storage_unavailable')) }
    setLoaded(true)
    return () => active.current?.abort()
  }, [owner])
  const save = useCallback((next: UploadRecord) => {
    storeSet(localStorage, uploadStorageKey(owner), next); setRecord(next)
  }, [owner])
  function clear() {
    localStorage.removeItem(uploadStorageKey(owner)); setRecord(null); setProgress(null); setFile(null)
    // Reset the native control as well: selecting the same file must fire change again.
    const picker = document.getElementById('video-file') as HTMLInputElement | null
    if (picker) picker.value = ''
  }
  async function run(kind: 'upload' | 'import' | 'delete') {
    if (active.current) return
    const controller = new AbortController(); active.current = controller
    setBusy(true); setError(null); setMessage('')
    setTransferring(kind === 'upload')
    try {
      if (kind === 'upload' && file && rights) {
        const job = await runUpload({file, record, signal: controller.signal, save, progress: setProgress,
          discard: () => {localStorage.removeItem(uploadStorageKey(owner)); setRecord(null)} })
        clear(); setMessage('Upload accepted for validation.'); onJob(job); onChanged()
      } else if (kind === 'import' && rights) {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || (parsed.port && parsed.port !== '443')) throw new AuthApiError(422, 'unsupported_source')
        const body = {url, max_bytes: maxMiB * 1024 * 1024, rights_attested: true as const}
        const text = JSON.stringify(body)
        if (importAttempt.current?.body !== text) importAttempt.current = {body: text, key: crypto.randomUUID()}
        const job = await mediaApi.call('importUrl', {body, key: importAttempt.current.key, signal: controller.signal})
        importAttempt.current = null; setUrl(''); setMessage('Import accepted. Follow its actual job status below.'); onJob(job); onChanged()
      } else if (kind === 'delete' && record) {
        let uploadId = record.uploadId
        // Recover a lost initiation acknowledgment before revoking the source.
        if (!uploadId) uploadId = (await mediaApi.call('initiate', {body: {size_bytes: record.size, sha256: record.sha256, rights_attested: true}, key: record.initiateKey, signal: controller.signal})).id
        await mediaApi.call('deleteUpload', {params: {upload_id: uploadId}, signal: controller.signal})
        clear(); setMessage('Server confirmed upload cancellation. Private cleanup may continue.'); onChanged()
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause)
      else setMessage('Upload paused. Reselect the original file if needed and resume from server-confirmed parts.')
    } finally { if (active.current === controller) {active.current = null; setBusy(false)} }
  }
  return <div hidden={!visible}>
    <section aria-label="Add video" className={panel}>
      <h2 className="text-lg font-semibold">Bring your footage</h2>
      <p className="my-3 text-sm leading-6 text-[#77736e]">Upload MP4 or WebM with audio. Maximum 4 GiB and 120 minutes; your plan and server may allow less. Uploading and validation do not charge processing credits.</p>
      <label htmlFor="media-rights" className="mb-4 flex items-start gap-2 text-sm"><input id="media-rights" className="mt-1" type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} />I own this video or have permission to upload and process it.</label>
      {record && <p className="my-3 rounded-xl bg-[#f2efff] p-3 text-sm">A resumable upload is saved for this account. Reselect the exact original file to continue. {record.uploadId && <span className="break-all">Upload {record.uploadId}</span>}</p>}
      <label htmlFor="video-file" className="block text-sm">Video file<input id="video-file" className={input} type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} onChange={e => {setFile(e.target.files?.[0] ?? null); setError(null)}} /></label>
      <div className="my-4 flex flex-wrap gap-2">
        <button className={primary} disabled={!loaded || busy || !rights || !file || file.size > uploadLimit || file.size === 0} onClick={() => { void run('upload') }}>{record ? 'Resume upload' : 'Upload video'}</button>
        {busy && transferring && <button className={button} onClick={() => active.current?.abort()}>Pause transfer</button>}
        {record && <button className={button} disabled={busy} onClick={() => { void run('delete') }}>Cancel saved upload</button>}
      </div>
      {file && file.size > uploadLimit && <p role="alert" className="my-3 text-sm text-red-800">The file exceeds the 4 GiB upload limit.</p>}
      {progress && <div role="status" className="my-4 text-sm"><p>{progress.stage === 'hashing' ? 'Computing checksum' : progress.stage === 'uploading' ? 'Server-confirmed upload' : 'Submitting validation'} · {progress.bytes.toLocaleString()} / {progress.total.toLocaleString()} bytes</p><progress className="mt-2 w-full accent-[#7668df]" aria-label={progress.stage === 'hashing' ? 'Checksum progress' : 'Upload progress'} value={progress.bytes} max={progress.total} /></div>}
      <div className="mt-6 border-t border-[#eeeae5] pt-5">
        <h3 className="font-medium">Import a supported direct HTTPS URL</h3>
        <p className="my-2 text-xs leading-5 text-[#77736e]">Only direct media on backend-approved hosts is supported. YouTube, Vimeo and Google Drive page imports are unavailable. ZoClip validates the host, redirects, size and media on the server.</p>
        <label htmlFor="video-url" className="block text-sm">Direct video URL<input id="video-url" className={input} type="url" maxLength={2048} value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://approved-media-host.example/video.mp4" /></label>
        <label htmlFor="import-size" className="mt-3 block text-sm">Maximum import size (MiB)<input id="import-size" className={input} type="number" min={1} max={4096} value={maxMiB} disabled={busy} onChange={e => setMaxMiB(Number(e.target.value))} /></label>
        <button className={`${primary} mt-3`} disabled={busy || !rights || !url || !Number.isInteger(maxMiB) || maxMiB < 1 || maxMiB > 4096} onClick={() => { void run('import') }}>Import video URL</button>
      </div>
      <ErrorText error={error} />
      {message && <p role="status" className="mt-3 text-sm text-[#6558c8]">{message}</p>}
    </section>
    {jobId && <JobMonitor key={jobId} jobId={jobId} onChanged={onChanged} />}
    {videoId && <Generation key={videoId} owner={owner} videoId={videoId} onJob={onJob} />}
  </div>
}
