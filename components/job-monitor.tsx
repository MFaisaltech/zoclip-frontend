'use client'

import { useEffect, useRef, useState } from 'react'
import { AuthApiError } from '@/lib/auth-api'
import { mediaApi, mediaErrorMessage, type MediaSchemas } from '@/lib/media-api'
import { ProcessingProgress, processingStage } from './processing-progress'

type Job = MediaSchemas['JobView']
const panel = 'rounded-2xl border border-[#e8e4de] bg-[#fcfbfe] p-5'
const button = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d9d5d0] bg-white px-4 py-2.5 text-sm font-medium text-[#6457c8] hover:bg-[#f2efff] disabled:opacity-50 disabled:cursor-not-allowed'
export const finalJob = (job: Job) => ['COMPLETED', 'FAILED', 'CANCELED'].includes(job.state)
function ErrorText({error}: {error: unknown}) { return error ? <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{mediaErrorMessage(error)}</p> : null }

export function JobMonitor({jobId, onChanged, onUpdate}: {jobId: string; onChanged: () => void; onUpdate?: (job: Job) => void}) {
  const [job, setJob] = useState<Job | null>(null), [error, setError] = useState<unknown>(null)
  const [canceling, setCanceling] = useState(false), [retry, setRetry] = useState(0)
  const changed = useRef(onChanged); changed.current = onChanged
  const updated = useRef(onUpdate); updated.current = onUpdate
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
        setJob(next); setError(null); failures = 0; updated.current?.(next)
        if (last !== next.updated_at) {last = next.updated_at; changed.current()}
        if (finalJob(next)) return
      } catch (cause) {if (controller.signal.aborted) return; setError(cause); failures++}
      timer = setTimeout(() => { void poll() }, Math.min(30000, 3000 * 2 ** failures))
    }
    void poll()
    return () => {controller.abort(); clearTimeout(timer)}
  }, [jobId, retry])
  return <section aria-label="Video progress" className={panel}>
    <ProcessingProgress stage={job ? processingStage(job.stage, job.kind, job.state) : 'Checking progress'} percent={job?.progress_percent} active={!job || !finalJob(job)} detail={job?.state === 'QUEUED' ? 'Waiting for an available worker' : undefined}/>
    {job && <>
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
