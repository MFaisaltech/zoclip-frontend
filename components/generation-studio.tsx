'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Film, Link2, LoaderCircle, Play, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react'
import { AuthApiError } from '@/lib/auth-api'
import { mediaApi, mediaErrorMessage, type MediaSchemas } from '@/lib/media-api'
import { workspaceApi, matches } from '@/lib/workspace-api'
import { mediaDefinitions } from '@/lib/media-schema'
import { canonicalYouTubeUrl } from '@/lib/youtube-url'
import { confirmGeneration, quoteForVideo, type GenerationQuote } from '@/lib/generation-flow'
import { readUpload, runUpload, uploadStorageKey, uploadLimit, uploadProgressLabel, type UploadProgress } from '@/lib/resumable-upload'
import { JobMonitor } from './job-monitor'

type Job = MediaSchemas['JobView']
type Phase = 'idle' | 'preparing' | 'quoting' | 'review' | 'submitting' | 'processing' | 'complete'
type Saved = {videoId?: string; job?: Job; request?: GenerationQuote; count: number}
const input = 'w-full rounded-xl border border-[#dfdbe8] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[#8270e4] focus:ring-4 focus:ring-[#8270e4]/10'
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dfdbe8] bg-white px-4 py-2.5 text-sm font-medium text-[#625a76] hover:bg-[#f5f2ff] disabled:opacity-50'

export default function GenerationStudio({owner, visible, videoId, jobId, onJob, onChanged}: {
  owner: string; visible: boolean; videoId: string | null; jobId: string | null;
  onJob: (job: Job) => void; onChanged: () => void;
}) {
  // UX only: API admission and workers independently enforce the configured UUID.
  const privatePreview = process.env.NEXT_PUBLIC_PRIVATE_STAGING === 'true' && !(
    process.env.NEXT_PUBLIC_STAGING_GENERATION_ENABLED === 'true' &&
    process.env.NEXT_PUBLIC_STAGING_GENERATION_USER_ID === owner
  )
  const [mode, setMode] = useState<'youtube' | 'upload'>('youtube')
  const [url, setUrl] = useState(''), [file, setFile] = useState<File | null>(null)
  const [count, setCount] = useState(1), [maxCount, setMaxCount] = useState(6)
  const [phase, setPhase] = useState<Phase>('idle'), [sourceId, setSourceId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null), [request, setRequest] = useState<GenerationQuote | null>(null)
  const [balance, setBalance] = useState<number | null>(null), [error, setError] = useState<unknown>(null)
  const [progress, setProgress] = useState<UploadProgress | null>(null), [loaded, setLoaded] = useState(false)
  const [resume, setResume] = useState(false), [notice, setNotice] = useState('')
  const control = useRef<AbortController | null>(null), handled = useRef('')
  const importAttempt = useRef<{url: string; key: string} | null>(null)
  const callbacks = useRef({onJob, onChanged}); callbacks.current = {onJob, onChanged}
  const picker = useRef<HTMLInputElement | null>(null)
  const storageKey = `zoclip-generation-v3:${owner}`
  function save(value: Saved) {sessionStorage.setItem(storageKey, JSON.stringify(value))}

  async function quote(id: string, wanted = count) {
    if (control.current) return
    const controller = new AbortController(); control.current = controller
    setSourceId(id); setPhase('quoting'); setError(null); setRequest(null)
    try {
      if (privatePreview) {
        const [source, wallet] = await Promise.all([
          mediaApi.call('video', {params: {video_id: id}, signal: controller.signal}),
          workspaceApi.read('wallet', undefined, controller.signal),
        ])
        const duration = source.metadata_json.duration_seconds
        if (source.state !== 'READY' || !Number.isSafeInteger(duration)) throw new AuthApiError(409, 'source_not_ready')
        const preview = await mediaApi.call('quotePreview', {body: {source_seconds: duration as number, output_count: wanted, edit_count: 0, captions: true, reframe: true}, signal: controller.signal})
        setBalance(wallet.available_credits)
        setNotice(`Generation is paused during private testing.${preview.credits !== null ? ` Preview price: ${preview.credits} credits.` : ''} No credits will be charged.`)
        setPhase('review')
      } else {
        const result = await quoteForVideo(id, wanted, controller.signal)
        if (controller.signal.aborted) return
        const next = {quote: result.quote, key: crypto.randomUUID(), confirmed: false}
        save({videoId: id, request: next, count: wanted})
        setBalance(result.balance); setRequest(next); setPhase('review')
      }
    } catch (cause) {if (!controller.signal.aborted) {setError(cause); setPhase('review')}}
    finally {if (control.current === controller) control.current = null}
  }

  useEffect(() => {
    try {
      setResume(!!readUpload(localStorage, owner))
      const saved: Saved | null = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
      const pendingImport = JSON.parse(sessionStorage.getItem(storageKey + ':import') ?? 'null')
      if (pendingImport && typeof pendingImport.url === 'string' && /^[\w.:-]{1,128}$/.test(pendingImport.key))
        importAttempt.current = {url: canonicalYouTubeUrl(pendingImport.url), key: pendingImport.key}
      if (saved && Number.isInteger(saved.count) && saved.count >= 1 && saved.count <= 6) {
        setCount(saved.count)
        if (saved.job && matches({$ref: '#/components/schemas/JobView'}, saved.job, mediaDefinitions)) {
          setJob(saved.job); setPhase(saved.job.kind === 'PROCESS' ? 'processing' : 'preparing')
        } else if (saved.videoId && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(saved.videoId)) {
          setSourceId(saved.videoId); setPhase('review')
          if (saved.request && matches({$ref: '#/components/schemas/QuoteView'}, saved.request.quote, mediaDefinitions) &&
            /^[\w.:-]{1,128}$/.test(saved.request.key) && typeof saved.request.confirmed === 'boolean') {
            setRequest(saved.request)
          }
        }
      }
    } catch {setNotice('Browser storage is unavailable. Keep this page open while preparing your video.')}
    setLoaded(true)
    return () => control.current?.abort()
  }, [owner, storageKey])

  useEffect(() => {
    if (videoId) {setJob(null); setNotice(''); void quote(videoId)}
    // A retained source is selected explicitly from the video library.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])
  useEffect(() => {
    if (!jobId || jobId === job?.id) return
    const controller = new AbortController()
    void mediaApi.call('job', {params: {job_id: jobId}, signal: controller.signal}).then(next => {
      if (!controller.signal.aborted) {setJob(next); setPhase(next.kind === 'PROCESS' ? 'processing' : 'preparing')}
    }, cause => {if (!controller.signal.aborted) setError(cause)})
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  function updateJob(next: Job) {
    setJob(next)
    if (next.state === 'COMPLETED' && handled.current !== next.id) {
      handled.current = next.id
      if (['VALIDATE', 'IMPORT'].includes(next.kind)) {setJob(null); void quote(next.video_id)}
      else {setPhase('complete'); sessionStorage.removeItem(storageKey); callbacks.current.onChanged()}
    } else if (['FAILED', 'CANCELED'].includes(next.state)) {
      setPhase('idle'); sessionStorage.removeItem(storageKey)
    }
  }

  async function generate() {
    if (control.current) return
    setError(null); setNotice('')
    if (sourceId && !request) {await quote(sourceId); return}
    const controller = new AbortController(); control.current = controller
    try {
      if (sourceId && request) {
        if (privatePreview) return
        setPhase('submitting')
        // Persist before dispatch; uncertain acknowledgments reuse this exact quote/key.
        // Check spendable balance before marking the request as possibly dispatched.
        if (!request.confirmed) {
          const wallet = await workspaceApi.read('wallet', undefined, controller.signal)
          setBalance(wallet.available_credits)
          if (wallet.available_credits < request.quote.credits) throw new AuthApiError(409, 'insufficient_credits')
          if (Date.parse(request.quote.expires_at) <= Date.now()) throw new AuthApiError(409, 'quote_expired')
        }
        const next = {...request, confirmed: true}
        save({videoId: sourceId, request: next, count}); setRequest(next)
        const accepted = await confirmGeneration(sourceId, next, controller.signal)
        save({job: accepted, count}); setJob(accepted); setRequest(null); setPhase('processing')
        callbacks.current.onJob(accepted); callbacks.current.onChanged()
      } else {
        const canonical = mode === 'youtube' ? canonicalYouTubeUrl(url) : null
        if (mode === 'upload' && (!file || file.size <= 0 || file.size > uploadLimit)) throw new AuthApiError(413, 'upload_limit')
        const [wallet, billing] = await Promise.all([
          workspaceApi.read('wallet', undefined, controller.signal), mediaApi.call('billingOverview', {signal: controller.signal}),
        ])
        setBalance(wallet.available_credits)
        const maximum = Math.min(6, billing.plan?.price?.rules.max_outputs ?? 6)
        setMaxCount(maximum)
        if (count > maximum) {setCount(maximum); throw new AuthApiError(422, 'plan_limit')}
        const minimum = billing.plan?.price?.rules.minimum_job_credits ?? 1
        if (!privatePreview && wallet.available_credits < minimum) throw new AuthApiError(409, 'insufficient_credits')
        setPhase('preparing')
        let accepted: Job
        if (canonical) {
          if (importAttempt.current?.url !== canonical) importAttempt.current = {url: canonical, key: crypto.randomUUID()}
          sessionStorage.setItem(storageKey + ':import', JSON.stringify(importAttempt.current))
          accepted = await mediaApi.call('importLink', {body: {url: canonical, rights_attested: true}, key: importAttempt.current.key, signal: controller.signal})
          importAttempt.current = null
          sessionStorage.removeItem(storageKey + ':import')
        } else {
          accepted = await runUpload({file: file!, record: readUpload(localStorage, owner), signal: controller.signal,
            save: value => {localStorage.setItem(uploadStorageKey(owner), JSON.stringify(value)); setResume(true)},
            discard: () => {localStorage.removeItem(uploadStorageKey(owner)); setResume(false)}, progress: setProgress})
          localStorage.removeItem(uploadStorageKey(owner)); setResume(false)
        }
        save({job: accepted, count}); setJob(accepted); setProgress(null)
        callbacks.current.onJob(accepted); callbacks.current.onChanged()
      }
    } catch (cause) {
      if (!controller.signal.aborted) {setError(cause); setPhase(sourceId ? 'review' : 'idle')}
      else {setPhase('idle'); setNotice('Transfer paused. Choose the same file and select Generate Clips to resume.')}
      setProgress(null)
    } finally {if (control.current === controller) control.current = null}
  }

  function reset() {
    if (control.current) return
    setSourceId(null); setRequest(null); setJob(null); setPhase('idle'); setError(null); setNotice(''); setFile(null); setUrl(''); setCount(1)
    sessionStorage.removeItem(storageKey); if (picker.current) picker.current.value = ''
  }
  async function cancelSavedUpload() {
    if (control.current) return
    const controller = new AbortController(); control.current = controller; setError(null)
    try {
      const record = readUpload(localStorage, owner)
      if (record?.uploadId) await mediaApi.call('deleteUpload', {params: {upload_id: record.uploadId}, signal: controller.signal})
      else if (record) {
        // Resolve an uncertain initiation acknowledgment before revoking it.
        const upload = await mediaApi.call('initiate', {body: {size_bytes: record.size, sha256: record.sha256, rights_attested: true}, key: record.initiateKey, signal: controller.signal})
        await mediaApi.call('deleteUpload', {params: {upload_id: upload.id}, signal: controller.signal})
      }
      localStorage.removeItem(uploadStorageKey(owner)); setResume(false); setFile(null)
      if (picker.current) picker.current.value = ''
      callbacks.current.onChanged()
    } catch (cause) {if (!controller.signal.aborted) setError(cause)}
    finally {if (control.current === controller) control.current = null}
  }
  const busy = ['preparing', 'quoting', 'submitting', 'processing'].includes(phase)
  const insufficient = request && !request.confirmed && balance !== null && balance < request.quote.credits
  const step = phase === 'complete' ? 3 : phase === 'processing' || phase === 'submitting' ? 2 : sourceId ? 1 : 0
  return <section hidden={!visible} aria-label="Generate clips" className="mb-9 overflow-hidden rounded-3xl border border-[#e3ddef] bg-white shadow-[0_8px_40px_-24px_#7960be]">
    <div className="border-b border-[#eee9f4] bg-gradient-to-r from-[#faf8ff] to-white px-5 py-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles size={19} className="text-[#7668df]"/>Create your next clips</h2><span className="flex items-center gap-1.5 text-xs text-[#877d98]"><ShieldCheck size={14}/>Private by default</span></div>
    </div>
    <div className="p-5 sm:p-8">
      <div role="tablist" aria-label="Video source" className="mb-6 grid grid-cols-2 gap-3">
        {([['youtube', 'Paste YouTube Link', Play], ['upload', 'Upload Video', UploadCloud]] as const).map(([value, label, Icon]) =>
          <button key={value} id={`source-${value}`} role="tab" aria-selected={mode === value} aria-controls={`panel-${value}`} disabled={busy || !!sourceId} onClick={() => {setMode(value); setError(null)}} className={`flex min-h-16 items-center justify-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition sm:text-base ${mode === value ? 'border-[#8270e4] bg-[#f4f0ff] text-[#6552c4] ring-1 ring-[#8270e4]' : 'border-[#e7e2ec] text-[#7c738c] hover:bg-[#faf8fd]'} disabled:cursor-not-allowed`}><Icon size={20}/>{label}</button>)}
      </div>
      {!sourceId && <>
        <div id="panel-youtube" role="tabpanel" aria-labelledby="source-youtube" hidden={mode !== 'youtube'}>
          <label htmlFor="video-url" className="mb-2 block text-sm font-medium">YouTube video link</label>
          <div className="relative"><Link2 size={18} className="pointer-events-none absolute left-4 top-4 text-[#9b91ae]"/><input id="video-url" className={`${input} !pl-11`} type="url" inputMode="url" maxLength={2048} value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" aria-describedby="youtube-help"/></div>
          <p id="youtube-help" className="mt-2 text-xs leading-5 text-[#8d849c]">YouTube videos, Shorts and shared links. Paste a link to a video you have permission to use.</p>
        </div>
        <div id="panel-upload" role="tabpanel" aria-labelledby="source-upload" hidden={mode !== 'upload'}>
          <label htmlFor="video-file" className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ded6ed] bg-[#fcfbfe] px-4 py-6 text-center"><UploadCloud size={26} className="text-[#8875ce]"/><span className="text-sm font-medium">{file ? file.name : 'Choose a video to turn into clips'}</span><span className="text-xs text-[#8d849c]">MP4 or WebM · Up to 4 GB and 2 hours, subject to account limits</span><input ref={picker} id="video-file" aria-label="Video file" className="mt-2 max-w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#eee8fb] file:px-3 file:py-2 file:text-[#6552c4]" type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} onChange={e => {setFile(e.target.files?.[0] ?? null); setError(null)}}/></label>
          {resume && <div className="mt-3 text-sm text-[#7668b2]"><p>A transfer is saved. Choose the same original file to resume it.</p>{!busy && <button className={`${secondary} mt-2`} onClick={() => {void cancelSavedUpload()}}>Cancel saved upload</button>}</div>}
          {file && (file.size > uploadLimit || file.size === 0) && <p role="alert" className="mt-3 text-sm text-red-800">Choose a nonempty video under 4 GB.</p>}
        </div>
      </>}
      <div className="my-5 flex flex-wrap items-center justify-between gap-4"><label htmlFor="generation-count" className="flex items-center gap-3 text-sm text-[#6f657f]">Clips to create<select id="generation-count" value={count} disabled={busy || !!sourceId} onChange={e => setCount(Number(e.target.value))} className="rounded-lg border border-[#e3ddec] bg-white px-3 py-2 text-[#443854]">{Array.from({length: maxCount}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label><p className="flex items-center gap-1.5 text-xs text-[#8d849c]"><Check size={14}/>Captions & vertical framing included in your quote</p></div>
      {sourceId && <div className="mb-5 rounded-2xl border border-[#e4dcef] bg-[#f8f5ff] p-5"><p className="flex items-center gap-2 text-sm font-medium text-[#6552a0]"><Film size={17}/>Your video is ready</p>{request ? <><p className="mt-3 text-2xl font-semibold text-[#39294e]">{request.quote.credits.toLocaleString()} <span className="text-sm font-normal">credits · up to {request.quote.request.output_count} {request.quote.request.output_count === 1 ? 'clip' : 'clips'}</span></p><p className="mt-2 text-sm text-[#7d708f]">Available: {balance?.toLocaleString() ?? 'Checking…'} credits. Review this exact price before confirming.</p><p className="mt-2 text-xs leading-5 text-[#8c809b]">This quote covers the attempt, even if fewer moments are found. Failed or canceled attempts return your credits under the existing rules.</p></> : phase === 'complete' ? <p className="mt-3 text-sm text-[#7d708f]">Generation complete. Preview and download your clips below.</p> : phase === 'quoting' ? <p role="status" className="mt-3 text-sm">Calculating your exact price…</p> : <p className="mt-3 text-sm text-[#7d708f]">Your source is saved. Check the price to continue.</p>}</div>}
      {insufficient && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">You need {request!.quote.credits - balance!} more credits. No chargeable job has started. Your prepared video is saved.</p>}
      {request?.confirmed && <p className="mb-3 text-xs text-[#82758e]">If the connection was interrupted, retrying checks the original request without starting a duplicate.</p>}
      {!!error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{mediaErrorMessage(error)}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-[#f5f2fa] p-4 text-sm leading-6 text-[#6f637e]">{notice}</p>}
      <div className="flex flex-col gap-4 border-t border-[#efeaf4] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-xs leading-5 text-[#93889e]">By selecting Generate Clips, you confirm you own this video or have permission to import, upload and process it. Preparation is free; generation starts only after you confirm the exact quote.</p><button disabled={!loaded || busy || phase === 'complete' || !!insufficient || (privatePreview && !!sourceId) || (!sourceId && (mode === 'youtube' ? !url.trim() : !file || file.size === 0 || file.size > uploadLimit))} onClick={() => {void generate()}} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7668df] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_-6px_#7668df] transition hover:bg-[#6555cf] disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle size={17} className="animate-spin"/> : <Sparkles size={17}/>}Generate Clips{!busy && <ArrowRight size={16}/>}</button></div>
      <ol aria-label="Generation progress" className="mt-6 grid grid-cols-3 gap-2 text-xs text-[#9a90a5]">{['Prepare video', 'Review price', 'Create clips'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined} className={`flex items-center gap-2 border-t-2 pt-3 ${step >= i ? 'border-[#a18be0] text-[#7862b0]' : 'border-[#eee9f3]'}`}><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#f4f0fa] text-[10px]">{step > i ? <Check size={12}/> : i + 1}</span>{label}</li>)}</ol>
      {progress && <div role="status" className="mt-5 text-sm text-[#786b89]"><p>{uploadProgressLabel(progress)}</p><progress aria-label="Upload progress" className="mt-3 h-2 w-full accent-[#8a73d7]" value={['hashing', 'uploading'].includes(progress.stage) ? progress.bytes : undefined} max={progress.total}/>{['hashing', 'uploading'].includes(progress.stage) && <p className="mt-1 text-xs">{Math.round(progress.bytes / progress.total * 100)}% {progress.stage === 'hashing' ? 'prepared' : 'uploaded'}</p>}<button className={`${secondary} mt-3`} onClick={() => control.current?.abort()}>Pause transfer</button></div>}
      {job && <div className="mt-6"><JobMonitor jobId={job.id} onChanged={() => callbacks.current.onChanged()} onUpdate={updateJob}/></div>}
      {phase === 'complete' && <p role="status" className="mt-5 text-sm font-medium text-green-800">Your clips are ready in Your Clips below.</p>}
      {!busy && (sourceId || job || phase === 'complete') && <div className="mt-4 flex flex-wrap gap-2"><button className={secondary} onClick={reset}>Start another video</button>{sourceId && phase !== 'complete' && !request?.confirmed && <button className={secondary} onClick={() => {void quote(sourceId)}}>Refresh price</button>}</div>}
    </div>
  </section>
}
