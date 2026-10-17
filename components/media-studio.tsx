'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthApiError } from '@/lib/auth-api'
import { mediaApi, mediaErrorMessage, type MediaSchemas } from '@/lib/media-api'
import { runUpload, readUpload, uploadStorageKey, uploadLimit, uploadProgressLabel, type UploadRecord, type UploadProgress } from '@/lib/resumable-upload'
import { matches } from '@/lib/workspace-api'
import { mediaDefinitions } from '@/lib/media-schema'
import { workspaceApi } from '@/lib/workspace-api'
import { jobStatus } from '@/lib/customer-copy'

const panel = 'mb-6 rounded-2xl border border-[#e8e4de] bg-white p-5 sm:p-7'
const button = 'rounded-xl border border-[#d9d5d0] bg-white px-4 py-2.5 text-sm font-medium text-[#6457c8] hover:bg-[#f2efff] disabled:opacity-50 disabled:cursor-not-allowed'
const primary = `${button} !border-transparent !bg-[#7668df] !text-white hover:!bg-[#6557ce]`
const input = 'mt-2 block w-full rounded-xl border border-[#d9d5d0] bg-[#fbfaf8] p-3 text-sm'
type Job = MediaSchemas['JobView']
type Quote = MediaSchemas['QuoteView']
const privatePreview = process.env.NEXT_PUBLIC_PRIVATE_STAGING === 'true'
export const finalJob = (job: Job) => ['COMPLETED', 'FAILED', 'CANCELED'].includes(job.state)
function ErrorText({error}: {error: unknown}) { return error ? <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{mediaErrorMessage(error)}</p> : null }
function storeSet(storage: Storage, key: string, value: unknown) {
  try { storage.setItem(key, JSON.stringify(value)) } catch { throw new AuthApiError(0, 'storage_unavailable') }
}

export function JobMonitor({jobId, onChanged}: {jobId: string; onChanged: () => void}) {
  const [job, setJob] = useState<Job | null>(null), [error, setError] = useState<unknown>(null)
  const [canceling, setCanceling] = useState(false), [retry, setRetry] = useState(0)
  const changed = useRef(onChanged); changed.current = onChanged
  const cancelControl = useRef<AbortController | null>(null)
  useEffect(() => () => cancelControl.current?.abort(), [])
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>, failures = 0, last = ''
    async function poll() {
      if (document.visibilityState === 'hidden') { timer = setTimeout(() => { void poll() }, 5000); return }
      try {
        const next = await mediaApi.call('job', {params: {job_id: jobId}, signal: controller.signal})
        if (controller.signal.aborted) return
        setJob(next); setError(null); failures = 0
        if (last !== next.updated_at) {last = next.updated_at; changed.current()}
        if (finalJob(next)) return
      } catch (cause) {if (controller.signal.aborted) return; setError(cause); failures++}
      timer = setTimeout(() => { void poll() }, Math.min(30000, 3000 * 2 ** failures))
    }
    void poll()
    return () => {controller.abort(); clearTimeout(timer)}
  }, [jobId, retry])
  return <section aria-label="Video progress" className={panel}>
    <h2 role="status" className="text-lg font-semibold">{job ? jobStatus(job.state, job.kind) : 'Checking progress…'}</h2>
    {job && <>
      {!finalJob(job) && <p className="mt-3 text-sm leading-6 text-[#77736e]">{['VALIDATE','IMPORT'].includes(job.kind) ? 'We’re preparing your video. You can leave this page and come back.' : 'We’ll find the best moments and turn them into shareable clips. You can leave this page and come back.'}</p>}
      {job.progress_percent !== null && !finalJob(job) && <progress className="my-4 w-full accent-[#7668df]" aria-label="Video progress" value={job.progress_percent} max={100}/>}
      {job.state === 'FAILED' && <p className="mt-3 text-sm text-red-800">{job.error_code ? mediaErrorMessage(new AuthApiError(409,job.error_code)) : 'Please try again. Credits for this attempt have been returned.'}</p>}
      {job.state === 'WAITING_ENGINE' && <p className="mt-3 text-sm">Please try again later, or cancel to return the credits for this attempt.</p>}
      {job.state === 'CANCEL_REQUESTED' && <p className="mt-3 text-sm">We’re stopping this attempt safely. Your balance will update when cancellation is complete.</p>}
    </>}
    <ErrorText error={error}/>
    <div className="mt-4 flex flex-wrap gap-2">
      {!!error && <button className={button} onClick={() => setRetry(n => n+1)}>Check again</button>}
      {job && !finalJob(job) && <button className={button} disabled={canceling || job.state === 'CANCEL_REQUESTED'} onClick={() => {
        if(cancelControl.current)return
        const control = new AbortController(); cancelControl.current=control; setCanceling(true)
        void mediaApi.call('cancel',{params:{job_id:jobId},signal:control.signal}).then(next=>{setJob(next);changed.current();setRetry(n=>n+1)},setError).finally(()=>{cancelControl.current=null;setCanceling(false)})
      }}>{canceling ? 'Canceling…' : 'Cancel'}</button>}
    </div>
  </section>
}

type Confirmed = {quote: Quote; key: string; confirmed: boolean}
export function Generation({owner, videoId, onJob}: {owner: string; videoId: string; onJob: (job: Job) => void}) {
  const [request,setRequest] = useState<Confirmed|null>(null), [amount,setAmount] = useState<number|null>(null)
  const [balance,setBalance] = useState<number|null>(null), [count,setCount] = useState(1), [maxCount,setMaxCount] = useState(3)
  const [captions,setCaptions] = useState(true), [reframe,setReframe] = useState(true)
  const [busy,setBusy] = useState(false), [error,setError] = useState<unknown>(null), [reload,setReload] = useState(0)
  const control = useRef<AbortController|null>(null)
  const storageKey = `zoclip-generation-v2:${owner}:${videoId}`
  const quotedCount = useRef(1)
  const quotedOptions = useRef({captions:true,reframe:true})
  const quotedVideo = useRef('')
  useEffect(() => {
    const controller = new AbortController(); control.current=controller; setBusy(true);setError(null);setAmount(null);setRequest(null)
    async function load() {
      try {
        const [source,wallet,billing] = await Promise.all([
          mediaApi.call('video',{params:{video_id:videoId},signal:controller.signal}),
          workspaceApi.read('wallet',undefined,controller.signal),
          mediaApi.call('billingOverview',{signal:controller.signal}),
        ])
        const duration=source.metadata_json.duration_seconds
        if(source.state!=='READY'||typeof duration!=='number'||!Number.isSafeInteger(duration))throw new AuthApiError(409,'source_not_ready')
        setBalance(wallet.available_credits)
        const maximum=Math.min(3,billing.plan?.price?.rules.max_outputs??3)
        setMaxCount(maximum)
        const suggested=quotedVideo.current!==videoId ? Math.max(1,Math.min(maximum,Math.floor(duration/60))) : Math.max(1,Math.min(maximum,count))
        quotedVideo.current=videoId;quotedOptions.current={captions,reframe}
        setCount(suggested);quotedCount.current=suggested
        const body={source_seconds:duration,output_count:suggested,edit_count:0,captions,reframe}
        if(privatePreview) {
          const preview=await mediaApi.call('quotePreview',{body,signal:controller.signal})
          setAmount(preview.credits)
          if(preview.credits===null)throw new AuthApiError(503,'plan_unconfigured')
        } else {
          let saved: Confirmed|null=null
          try {saved=JSON.parse(sessionStorage.getItem(storageKey)??'null')}catch{/* Optional recovery. */}
          if(saved && matches({$ref:'#/components/schemas/QuoteView'},saved.quote,mediaDefinitions) && saved.quote.request.source_seconds===duration && saved.quote.request.output_count<=maximum && /^[\w.:-]{1,128}$/.test(saved.key) && typeof saved.confirmed==='boolean' && (saved.confirmed || Date.parse(saved.quote.expires_at)>Date.now())) {
            setRequest(saved);setAmount(saved.quote.credits);setCount(saved.quote.request.output_count);quotedCount.current=saved.quote.request.output_count
            setCaptions(saved.quote.request.captions??true);setReframe(saved.quote.request.reframe??true)
            quotedOptions.current={captions:saved.quote.request.captions??true,reframe:saved.quote.request.reframe??true}
          } else {
            const quote=await mediaApi.call('quote',{body,key:crypto.randomUUID(),signal:controller.signal})
            const next={quote,key:crypto.randomUUID(),confirmed:false}
            storeSet(sessionStorage,storageKey,next);setRequest(next);setAmount(quote.credits)
          }
        }
      }catch(cause){if(!controller.signal.aborted)setError(cause)}
      finally{if(!controller.signal.aborted)setBusy(false);if(control.current===controller)control.current=null}
    }
    void load()
    return()=>controller.abort()
    // Settings take effect only when the customer chooses Update price.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[videoId,storageKey,reload])
  async function confirm() {
    if(control.current||privatePreview||!request)return
    const controller=new AbortController();control.current=controller;setBusy(true);setError(null)
    try {
      if(!request.confirmed&&Date.parse(request.quote.expires_at)<=Date.now())throw new AuthApiError(409,'quote_expired')
      const next={...request,confirmed:true};storeSet(sessionStorage,storageKey,next);setRequest(next)
      const job=await mediaApi.call('generate',{params:{video_id:videoId},body:{quote_id:next.quote.id,auto_render:true},key:next.key,signal:controller.signal})
      sessionStorage.removeItem(storageKey);setRequest(null);onJob(job)
    }catch(cause){
      if(!controller.signal.aborted)setError(cause)
      if(cause instanceof AuthApiError && cause.status>=400 && cause.status<500 && ![401,408,429].includes(cause.status)) {sessionStorage.removeItem(storageKey);setRequest(null)}
    }finally{if(!controller.signal.aborted)setBusy(false);control.current=null}
  }
  const changed=count!==quotedCount.current || captions!==quotedOptions.current.captions || reframe!==quotedOptions.current.reframe
  return <section aria-label="Generate clips" className={panel}>
    <h2 className="text-xl font-semibold">Your video is ready.</h2>
    <p className="mt-2 text-sm leading-6 text-[#77736e]">We’ll find the best moments and create vertical MP4 clips, with captions. Most clips are 15–30 seconds; shorter videos may produce shorter clips.</p>
    <fieldset disabled={busy||request?.confirmed} className="my-5">
      <label htmlFor="output-count" className="block text-sm font-medium">Number of clips<input id="output-count" className={input} type="number" min={1} max={maxCount} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
      <p className="mt-2 text-xs text-[#77736e]">Choose up to {maxCount} clips per video. Useful moments and your exact quote determine what can be generated.</p>
    </fieldset>
    <details className="my-5 rounded-xl border border-[#eeeae5] p-4"><summary className="cursor-pointer text-sm font-medium">Advanced settings</summary>
      <fieldset disabled={busy||request?.confirmed} className="mt-4 space-y-4">
        <label htmlFor="generate-captions" className="flex gap-2 text-sm"><input id="generate-captions" type="checkbox" checked={captions} onChange={e=>setCaptions(e.target.checked)}/>Add captions</label>
        <label htmlFor="generate-reframe" className="flex gap-2 text-sm"><input id="generate-reframe" type="checkbox" checked={reframe} onChange={e=>setReframe(e.target.checked)}/>Fill the vertical frame</label>
      </fieldset>
    </details>
    <button className={button} disabled={busy||request?.confirmed||!Number.isInteger(count)||count<1||count>maxCount} onClick={()=>{sessionStorage.removeItem(storageKey);setRequest(null);setReload(n=>n+1)}}>Update price</button>
    {busy&&!request&&<p role="status" className="my-4 text-sm">Calculating your price…</p>}
    {amount!==null && <div className="my-4 rounded-xl bg-[#f4f1ff] p-5">
      <p className="font-semibold">Create up to {quotedCount.current} {quotedCount.current===1?'clip':'clips'} · {amount.toLocaleString()} credits</p>
      <p className="mt-2 text-sm text-[#77736e]">Available balance: {balance?.toLocaleString()??'—'} credits{balance!==null&&balance>=amount ? ` · After generation: ${(balance-amount).toLocaleString()}` : ''}</p>
      <p className="mt-2 text-xs leading-5 text-[#77736e]">The number of clips depends on the useful moments in your video. This price covers the full attempt, even if fewer moments are found. Failed or canceled attempts return your credits.</p>
    </div>}
    {privatePreview ? <p role="status" className="rounded-xl bg-[#faf9f7] p-4 text-sm leading-6">Clip generation is paused during private testing. You can upload videos and check prices. No credits will be charged.</p> : <>
      {balance!==null&&amount!==null&&balance<amount && <p className="my-3 text-sm text-[#77736e]">You need {amount-balance} more credits. Credit purchases are coming soon.</p>}
      <button className={primary} disabled={busy||!request||changed||(!request.confirmed&&(balance===null||amount===null||balance<amount))} onClick={()=>{void confirm()}}>{busy?'Creating your request…':request?.confirmed?'Check my request':`Generate clips${amount!==null?` — ${amount} credits`:''}`}</button>
    </>}
    {changed&&<p className="mt-3 text-sm">Update the price to apply your settings.</p>}
    <ErrorText error={error}/>
    {!!error&&!request&&<button className={button} disabled={busy} onClick={()=>setReload(n=>n+1)}>Try again</button>}
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
        clear(); setMessage('Upload complete. We’re preparing your video.'); onJob(job); onChanged()
      } else if (kind === 'import' && rights) {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || (parsed.port && parsed.port !== '443')) throw new AuthApiError(422, 'unsupported_source')
        const body = {url, max_bytes: maxMiB * 1024 * 1024, rights_attested: true as const}
        const text = JSON.stringify(body)
        if (importAttempt.current?.body !== text) importAttempt.current = {body: text, key: crypto.randomUUID()}
        const job = await mediaApi.call('importUrl', {body, key: importAttempt.current.key, signal: controller.signal})
        importAttempt.current = null; setUrl(''); setMessage('Your video is being imported.'); onJob(job); onChanged()
      } else if (kind === 'delete' && record) {
        let uploadId = record.uploadId
        // Recover a lost initiation acknowledgment before revoking the source.
        if (!uploadId) uploadId = (await mediaApi.call('initiate', {body: {size_bytes: record.size, sha256: record.sha256, rights_attested: true}, key: record.initiateKey, signal: controller.signal})).id
        await mediaApi.call('deleteUpload', {params: {upload_id: uploadId}, signal: controller.signal})
        clear(); setMessage('Upload canceled.'); onChanged()
      }
    } catch (cause) {
      setProgress(null)
      if (!controller.signal.aborted) setError(cause)
      else setMessage('Upload paused. Choose the same file to continue where you left off.')
    } finally { if (active.current === controller) {active.current = null; setBusy(false)} }
  }
  return <div hidden={!visible}>
    <section aria-label="Add video" className={panel}>
      <h2 className="text-lg font-semibold">Upload a video</h2>
      <p className="my-3 text-sm leading-6 text-[#77736e]">Choose an MP4 or WebM video with audio. Up to 4 GB and 2 hours, subject to your account limits. Uploading is free; you’ll see the clip price before you confirm.</p>
      <label htmlFor="media-rights" className="mb-4 flex items-start gap-2 text-sm"><input id="media-rights" className="mt-1" type="checkbox" checked={rights} disabled={busy} onChange={e => setRights(e.target.checked)} />I own this video or have permission to upload and process it.</label>
      {record && <p className="my-3 rounded-xl bg-[#f2efff] p-3 text-sm">Your upload is saved. Choose the same file to continue where you left off.</p>}
      <label htmlFor="video-file" className="block text-sm">Video file<input id="video-file" className={input} type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} onChange={e => {setFile(e.target.files?.[0] ?? null); setError(null)}} /></label>
      <div className="my-4 flex flex-wrap gap-2">
        <button className={primary} disabled={!loaded || busy || !rights || !file || file.size > uploadLimit || file.size === 0} onClick={() => { void run('upload') }}>{busy && transferring ? 'Uploading…' : record ? 'Resume upload' : 'Upload video'}</button>
        {busy && transferring && <button className={button} onClick={() => active.current?.abort()}>Pause transfer</button>}
        {record && <button className={button} disabled={busy} onClick={() => { void run('delete') }}>Cancel saved upload</button>}
      </div>
      {file && file.size > uploadLimit && <p role="alert" className="my-3 text-sm text-red-800">This video is too large. Choose a file under 4 GB.</p>}
      {progress && <div role="status" className="my-4 text-sm"><p>{uploadProgressLabel(progress)}</p>{['hashing', 'uploading'].includes(progress.stage) && <p>{Math.round(progress.bytes / progress.total * 100)}% {progress.stage === 'hashing' ? 'prepared' : 'uploaded'}</p>}<progress className="mt-2 w-full accent-[#7668df]" aria-label={progress.stage === 'hashing' ? 'Preparing your video' : 'Upload progress'} value={['initiating', 'finalizing'].includes(progress.stage) ? undefined : progress.bytes} max={progress.total} /></div>}
      <details className="mt-6 border-t border-[#eeeae5] pt-5"><summary className="cursor-pointer text-sm font-medium">Have a video link?</summary>
        <h3 className="font-medium">Import from a video link</h3>
        <p className="my-2 text-xs leading-5 text-[#77736e]">Use a direct link to an MP4 or WebM file from a supported source. For other links, download your video first and upload the file.</p>
        <label htmlFor="video-url" className="block text-sm">Video link<input id="video-url" className={input} type="url" maxLength={2048} value={url} disabled={busy} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/video.mp4" /></label>
        <label htmlFor="import-size" className="mt-3 block text-sm">Maximum file size (MB)<input id="import-size" className={input} type="number" min={1} max={4096} value={maxMiB} disabled={busy} onChange={e => setMaxMiB(Number(e.target.value))} /></label>
        <button className={`${primary} mt-3`} disabled={busy || !rights || !url || !Number.isInteger(maxMiB) || maxMiB < 1 || maxMiB > 4096} onClick={() => { void run('import') }}>Import video</button>
      </details>
      <ErrorText error={error} />
      {message && <p role="status" className="mt-3 text-sm text-[#6558c8]">{message}</p>}
    </section>
    {jobId && <JobMonitor key={jobId} jobId={jobId} onChanged={onChanged} />}
    {videoId && <Generation key={videoId} owner={owner} videoId={videoId} onJob={onJob} />}
  </div>
}
