'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthApiError } from '@/lib/auth-api'
import { mediaApi, mediaErrorMessage, type MediaSchemas } from '@/lib/media-api'
import { clipOptions, captionWords, timestamp, validPreferences, type Preferences } from '@/lib/clip-editor'
import { JobMonitor } from './media-studio'
type Clip = MediaSchemas['ClipView']
type Job = MediaSchemas['JobView']
const panel = 'mb-6 rounded-2xl border border-[#e8e4de] bg-white p-5'
const button = 'rounded-xl border border-[#d9d5d0] px-4 py-2 text-sm font-medium text-[#6457c8] hover:bg-[#f2efff] disabled:opacity-50 disabled:cursor-not-allowed'
const input = 'mt-1 block w-full min-w-0 rounded-xl border border-[#d9d5d0] bg-[#fbfaf8] p-2 text-base sm:text-sm'
function useTask() {
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  const run = useCallback(async (work: (signal: AbortSignal) => Promise<void>) => {
    if (active.current) return
    const controller = new AbortController(); active.current = controller; setBusy(true); setError(null)
    try { await work(controller.signal) }
    catch (cause) {if (!controller.signal.aborted) setError(cause)}
    finally {if (active.current === controller) {active.current = null; if (!controller.signal.aborted) setBusy(false)}}
  }, [])
  return {busy, error, run}
}
function ErrorText({error}: {error: unknown}) {return error ? <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{mediaErrorMessage(error)}</p> : null}
function persist(key: string, value: unknown) {
  try {sessionStorage.setItem(key, JSON.stringify(value))} catch {throw new AuthApiError(0,'storage_unavailable')}
}
export function Highlights({owner, videoId, onClip, onChanged}: {owner: string; videoId: string; onClip: (id: string) => void; onChanged: () => void}) {
  const task = useTask(), [data, setData] = useState<MediaSchemas['SuggestionsView'] | null>(null)
  const [transcript, setTranscript] = useState<MediaSchemas['TranscriptView'] | null>(null)
  const [wordCount, setWordCount] = useState(200)
  const [drafts, setDrafts] = useState<Clip[]>([]), [selected, setSelected] = useState<string[]>([])
  const [job, setJob] = useState<Job | null>(null), [renderJob, setRenderJob] = useState<string | null>(null)
  const [approved, setApproved] = useState<{ids: string[]; key: string} | null>(null)
  const storeKey = data ? `zoclip-selection-v1:${owner}:${data.job_id}` : ''
  useEffect(() => {
    if (!storeKey) return
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) ?? 'null')
      if (saved && Array.isArray(saved.ids) && saved.ids.length > 0 && saved.ids.every((id: unknown) => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)) && /^[\w.:-]{1,128}$/.test(saved.key)) {setApproved(saved); setSelected(saved.ids)}
    } catch { /* No confirmed selection to recover. */ }
  }, [storeKey])
  async function load(signal: AbortSignal) {
    const next = await mediaApi.call('suggestions', {params:{video_id:videoId},query:{limit:20},signal})
    setData(next); setTranscript(null)
    if (data?.job_id !== next.job_id) {setDrafts([]); setSelected([]); setApproved(null)}
    setJob(await mediaApi.call('job',{params:{job_id:next.job_id},signal}))
  }
  return <section aria-label="AI highlights" className={panel}>
    <h2 className="text-xl font-semibold">AI highlights & transcript</h2>
    <p className="my-2 break-all text-xs text-[#8a857f]">Video {videoId}</p>
    <button className={button} disabled={task.busy} onClick={() => {void task.run(load)}}>{task.busy ? 'Loading…' : 'Load highlights'}</button>
    <ErrorText error={task.error} />
    {data && <>
      <p role="status" className="my-3 text-sm">{data.state} · {data.stage}{data.error_code && ` · ${data.error_code}`}</p>
      {!data.items.length && <p className="my-3 text-sm">No suggestions are available for this job. Check its processing status and refresh.</p>}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{data.items.map(item => <article key={item.id} className="min-w-0 rounded-xl border border-[#eeeae5] p-4">
        <h3 className="break-words font-semibold">{item.rank}. {item.title}</h3>
        <p className="my-2 font-mono text-xs">{timestamp(item.start_sec)} – {timestamp(item.end_sec)}</p>
        <p className="text-sm text-[#6558c8]">AI score: {item.score}/100</p>
        <p className="my-2 break-words text-sm">{item.hook}</p><p className="break-words text-sm text-[#77736e]">{item.reason}</p>
        <p className="my-2 break-words text-xs">{item.hashtags.join(' ')}</p>
        <button className={button} disabled={task.busy} onClick={() => {void task.run(async signal => {
          const clip = await mediaApi.call('createClip',{body:{suggestion_id:item.id},signal})
          setDrafts(rows => [...rows.filter(row => row.id !== clip.id),clip]); onClip(clip.id); onChanged()
        })}}>Create / open draft</button>
      </article>)}</div>
      <p className="my-3 text-xs text-[#8a857f]">Scores and explanations are provider suggestions, not measured audience performance. Suggestions are not exports.</p>
      <button className={button} disabled={task.busy} onClick={() => {void task.run(async signal => {setTranscript(await mediaApi.call('transcript',{params:{video_id:videoId},query:{job_id:data.job_id},signal}));setWordCount(200)})}}>Load transcript</button>
      {transcript && <div className="my-4 rounded-xl bg-[#faf9f7] p-4">
        <p className="text-xs">{transcript.language} · {transcript.model} · Confidence {transcript.data.confidence}</p>
        <p className="my-3 whitespace-pre-wrap break-words text-sm">{transcript.data.text}</p>
        <ol aria-label="Transcript words" className="max-h-72 overflow-auto text-xs">{transcript.data.words.slice(0,wordCount).map((word,i) => <li key={i}>{timestamp(word.start)} – {timestamp(word.end)} · {word.punctuated_word} · confidence {word.confidence}{word.speaker !== null && word.speaker !== undefined && ` · speaker ${word.speaker}`}</li>)}</ol>
        {wordCount < transcript.data.words.length && <button className={`${button} mt-3`} onClick={() => setWordCount(n => n+200)}>Show more words</button>}
      </div>}
      {(drafts.length > 0 || approved) && <div className="mt-5 rounded-xl bg-[#f2efff] p-4">
        <h3 className="font-semibold">Approve initial exports</h3>
        <p className="my-3 text-sm">The original accepted quote reserves {job?.estimated_credits ?? 'an unavailable number of'} credits. Confirming this fixed selection accepts that full quote, even when fewer clips are selected. Credits settle only when all selected exports succeed. Output: 9:16 · 720×1280 · MP4.</p>
        {drafts.map(clip => <label key={clip.id} htmlFor={`select-${clip.id}`} className="my-2 flex gap-2 text-sm"><input id={`select-${clip.id}`} type="checkbox" disabled={!!approved || task.busy} checked={selected.includes(clip.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids,clip.id] : ids.filter(id => id !== clip.id))} />{clip.preferences.title || clip.id}</label>)}
        <button className={button} disabled={task.busy || !selected.length || (!approved && (data.state !== 'SUGGESTIONS_READY' || job?.estimated_credits == null))} onClick={() => {void task.run(async signal => {
          const request = approved ?? {ids:selected,key:crypto.randomUUID()}
          persist(storeKey,request);setApproved(request)
          try {
            const next = await mediaApi.call('selectClips',{params:{job_id:data.job_id},body:{clip_ids:request.ids},key:request.key,signal})
            setRenderJob(next.id);onChanged()
          } catch(error) {
            if(error instanceof AuthApiError && error.status>=400 && error.status<500 && ![401,408,429].includes(error.status)) {sessionStorage.removeItem(storeKey);setApproved(null)}
            throw error
          }
        })}}>{approved ? 'Recover approved selection / status' : 'Confirm selected exports'}</button>
      </div>}
    </>}
    {renderJob && <div className="mt-4"><JobMonitor key={renderJob} jobId={renderJob} onChanged={onChanged} /></div>}
  </section>
}

export function ClipEditor({owner, clipId, onChanged}: {owner: string; clipId: string; onChanged: () => void}) {
  const task=useTask(), [clip,setClip]=useState<Clip|null>(null), [prefs,setPrefs]=useState<Preferences|null>(null)
  const [duration,setDuration]=useState(0), [outputs,setOutputs]=useState<MediaSchemas['OutputView'][]>([])
  const [renderJob,setRenderJob]=useState<string|null>(null), [uncertain,setUncertain]=useState(false), [message,setMessage]=useState('')
  const [paidQuote,setPaidQuote]=useState<MediaSchemas['QuoteView']|null>(null)
  const [renderIntent,setRenderIntent]=useState<{revision:number;quote_id?:string;key:string}|null>(null)
  const [downloadUrl,setDownloadUrl]=useState<string|null>(null)
  const [downloadRevision,setDownloadRevision]=useState<number|null>(null)
  const urlRef=useRef<string|null>(null)
  const intentKey=`zoclip-export-v1:${owner}:${clipId}`
  useEffect(() => {
    try {const saved=JSON.parse(sessionStorage.getItem(intentKey)??'null'); if(saved && Number.isInteger(saved.revision) && saved.revision>=1 && saved.revision<=101 && /^[\w.:-]{1,128}$/.test(saved.key) && (!saved.quote_id || /^[a-f0-9-]{36}$/i.test(saved.quote_id)))setRenderIntent(saved)}catch { /* No pending request. */ }
    return () => {if(urlRef.current)URL.revokeObjectURL(urlRef.current)}
  },[intentKey])
  const load = useCallback(async (signal:AbortSignal) => {
    const next=await mediaApi.call('clip',{params:{clip_id:clipId},signal})
    const source=await mediaApi.call('video',{params:{video_id:next.video_id},signal})
    const durationMs=source.metadata_json.duration_ms
    if(typeof durationMs!=='number'||!Number.isSafeInteger(durationMs))throw new AuthApiError(0,'invalid_response')
    setClip(next);setPrefs(structuredClone(next.preferences));setDuration(durationMs);setUncertain(false);setPaidQuote(null);setMessage('Clip loaded.')
    setOutputs(await mediaApi.call('outputs',{params:{clip_id:clipId},signal}))
  }, [clipId])
  const runTask = task.run
  useEffect(() => { void runTask(load) }, [load, runTask])
  const update = <K extends keyof Preferences>(name:K,value:Preferences[K]) => {setPrefs(p => p && {...p,[name]:value});setPaidQuote(null)}
  async function render(signal:AbortSignal, quoteId?:string) {
    if(!clip)return
    const request=renderIntent??{revision:clip.revision,...(quoteId && {quote_id:quoteId}),key:crypto.randomUUID()}
    persist(intentKey,request);setRenderIntent(request)
    try {
      const job=await mediaApi.call('renderClip',{params:{clip_id:clipId},body:{revision:request.revision,...(request.quote_id && {quote_id:request.quote_id})},key:request.key,signal})
      setRenderJob(job.id);sessionStorage.removeItem(intentKey);setRenderIntent(null);setPaidQuote(null);onChanged()
    }catch(error){
      if(error instanceof AuthApiError && error.status>=400 && error.status<500 && ![401,408,429].includes(error.status)) {sessionStorage.removeItem(intentKey);setRenderIntent(null)}
      throw error
    }
  }
  return <section aria-label="Clip editor" className={panel}>
    <h2 className="text-xl font-semibold">Edit your clip</h2>
    <button className={button} disabled={task.busy} onClick={() => {void task.run(load)}}>Reload clip</button>
    <ErrorText error={task.error}/>
    {message && <p role="status" className="my-3 text-sm text-[#6558c8]">{message}</p>}
    {clip && prefs && <>
      <p className="my-4 text-sm">Source {timestamp(duration/1000)} · Vertical MP4</p>
      <fieldset disabled={task.busy || !!renderIntent} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label htmlFor="clip-title" className="text-sm sm:col-span-2">Title<input id="clip-title" className={input} maxLength={160} value={prefs.title??''} onChange={e=>update('title',e.target.value)}/></label>
        <label htmlFor="trim-start" className="text-sm">Start (seconds)<input id="trim-start" className={input} type="number" min={0} max={duration/1000} step={0.1} value={prefs.start_ms/1000} onChange={e=>update('start_ms',Math.round(Number(e.target.value)*1000))}/></label>
        <label htmlFor="trim-end" className="text-sm">End (seconds)<input id="trim-end" className={input} type="number" min={0.25} max={duration/1000} step={0.1} value={prefs.end_ms/1000} onChange={e=>update('end_ms',Math.round(Number(e.target.value)*1000))}/></label>
        <label htmlFor="clip-hashtags" className="text-sm sm:col-span-2">Hashtags (comma separated, at most 10)<input id="clip-hashtags" className={input} value={(prefs.hashtags??[]).join(',')} onChange={e=>update('hashtags',e.target.value ? e.target.value.split(',') : [])}/></label>
        <label htmlFor="clip-captions" className="flex items-center gap-2 text-sm"><input id="clip-captions" type="checkbox" checked={prefs.captions??true} onChange={e=>update('captions',e.target.checked)}/>Show captions</label>
        {(['preset','font','placement','frame'] as const).map(name=><div key={name} className="text-sm"><label htmlFor={`clip-${name}`}>{({preset:'Caption style',font:'Caption font',placement:'Caption placement',frame:'Framing'})[name]}</label><select id={`clip-${name}`} className={input} value={prefs[name]} onChange={e=>update(name,e.target.value as Preferences[typeof name])}>{clipOptions[name].map(value=><option key={value} value={value}>{value}</option>)}</select></div>)}
        {prefs.frame==='manual' && (['focal_x','focal_y'] as const).map(name=><label key={name} htmlFor={name} className="text-sm">{name} (0–1000)<input id={name} className={input} type="number" min={0} max={1000} value={prefs[name]} onChange={e=>update(name,Number(e.target.value))}/></label>)}
      </fieldset>
      <p className="my-3 text-xs text-[#8a857f]">Clip length: {((prefs.end_ms-prefs.start_ms)/1000).toFixed(1)} seconds. Keep it within 90 seconds. Choose padding to keep the whole picture visible.</p>
      <div className="my-3 flex flex-wrap gap-2">
        <button className={button} disabled={task.busy || !!renderIntent} onClick={()=>{void task.run(async signal=>{const t=await mediaApi.call('transcript',{params:{video_id:clip.video_id},query:{job_id:clip.job_id},signal});update('words',captionWords(t,prefs))})}}>Edit caption text</button>
        <button className={button} disabled={task.busy || !!renderIntent} onClick={()=>update('words',null)}>Restore original captions</button>
        <button className={button} disabled={task.busy || !!renderIntent} onClick={()=>update('words',[])}>Clear captions</button>
      </div>
      {prefs.words && <div className="max-h-80 space-y-3 overflow-auto rounded-xl border border-[#eeeae5] p-3" aria-label="Caption word edits">{prefs.words.slice(0,1000).map((word,i)=><div key={i} className="grid gap-2 sm:grid-cols-3">{(['text','start_ms','end_ms'] as const).map(name=><label key={name} htmlFor={`word-${i}-${name}`} className="text-xs">Word {i+1} {name}<input id={`word-${i}-${name}`} className={input} type={name==='text'?'text':'number'} maxLength={name==='text'?80:undefined} value={word[name]} disabled={task.busy || !!renderIntent} onChange={e=>update('words',prefs.words!.map((row,n)=>n===i?{...row,[name]:name==='text'?e.target.value:Number(e.target.value)}:row))}/></label>)}</div>)}</div>}
      {!validPreferences(prefs,duration) && <p role="alert" className="my-3 text-sm text-red-800">Check your clip's start and end times, hashtags, and captions. Caption words need valid timings within the clip.</p>}
      <button className={button} disabled={task.busy || uncertain || !!renderIntent || !validPreferences(prefs,duration)} onClick={()=>{void task.run(async signal=>{
        try {const saved=await mediaApi.call('editClip',{params:{clip_id:clipId},body:prefs,revision:clip.revision,signal});setClip(saved);setPrefs(structuredClone(saved.preferences));setMessage(`Changes saved. Create an updated MP4 below.`);onChanged()}
        catch(error){setUncertain(true);throw error}
      })}}>Save changes</button>
      {uncertain && <p className="my-3 text-sm">We couldn't confirm whether your changes were saved. Your edits are still visible. Reload the clip to check the saved version before editing again.</p>}
      <div className="my-5 border-t border-[#eeeae5] pt-4">
        <p className="mb-3 text-sm">Save your changes first, then create an updated MP4. If your included edits are used, review the price before you confirm.</p>
        <button className={button} disabled={task.busy || uncertain || JSON.stringify(prefs)!==JSON.stringify(clip.preferences)} onClick={()=>{void task.run(signal=>render(signal))}}>{renderIntent?'Check my export request':'Create updated MP4'}</button>
        <button className={`${button} ml-2`} disabled={task.busy || !!renderIntent || JSON.stringify(prefs)!==JSON.stringify(clip.preferences)} onClick={()=>{void task.run(async signal=>{
          const source=await mediaApi.call('video',{params:{video_id:clip.video_id},signal})
          const seconds=source.metadata_json.duration_seconds
          if(typeof seconds!=='number'||!Number.isSafeInteger(seconds))throw new AuthApiError(0,'invalid_response')
          setPaidQuote(await mediaApi.call('quote',{body:{source_seconds:seconds,output_count:1,edit_count:0,captions:prefs.captions??true,reframe:prefs.frame!=='pad'},key:crypto.randomUUID(),signal}))
        })}}>Check export price</button>
        {paidQuote && <div className="mt-3 rounded-xl bg-[#f2efff] p-3 text-sm"><p>Your updated clip costs {paidQuote.credits} credits. This price is valid until {new Date(paidQuote.expires_at).toLocaleString()}.</p><button className={`${button} mt-3`} disabled={task.busy} onClick={()=>{void task.run(async signal=>{if(Date.parse(paidQuote.expires_at)<=Date.now())throw new AuthApiError(409,'quote_expired');await render(signal,paidQuote.id)})}}>Create updated MP4: {paidQuote.credits} credits</button></div>}
      </div>
      <button className={button} disabled={task.busy} onClick={()=>{void task.run(async signal=>{setOutputs(await mediaApi.call('outputs',{params:{clip_id:clipId},signal}))})}}>Refresh downloads</button>
      {!outputs.length && <p className="my-3 text-sm">No download is available for this clip yet.</p>}
      <div className="mt-3 space-y-3">{outputs.map(output=><article key={output.id} className="rounded-xl border border-[#eeeae5] p-3 text-sm">
        <p>Version {output.revision} · {output.state==='COMPLETE'?'Ready to download':output.state==='FAILED'?'Could not create this clip':'Preparing your clip…'}</p>
        <button className={button} onClick={()=>setRenderJob(output.job_id)}>View progress</button>
        <button className={`${button} ml-2`} disabled={task.busy || output.state!=='COMPLETE'} onClick={()=>{void task.run(async signal=>{
          const job=await mediaApi.call('job',{params:{job_id:output.job_id},signal})
          if(job.state!=='COMPLETED')throw new AuthApiError(409,'render_busy')
          const blob=await mediaApi.call('download',{params:{clip_id:clipId},query:{revision:output.revision},signal})
          if(urlRef.current)URL.revokeObjectURL(urlRef.current)
          const url=URL.createObjectURL(blob);urlRef.current=url;setDownloadUrl(url);setDownloadRevision(output.revision)
          const anchor=document.createElement('a');anchor.href=url;anchor.download=`${(clip.preferences.title||'ZoClip').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,80)||'ZoClip'}-v${output.revision}.mp4`;anchor.click()
          setMessage('Your MP4 is ready. Check your downloads.')
        })}}>Download MP4</button>
      </article>)}</div>
      {downloadUrl && <><p className="mt-4 text-xs text-[#77736e]">Preview of version {downloadRevision}. Save your edits and create an updated MP4 to see changes here.</p><video aria-label="Downloaded MP4 preview" className="mt-2 max-h-[480px] w-full rounded-xl bg-black" src={downloadUrl} controls preload="metadata"><track kind="captions"/>Your browser cannot play this MP4.</video></>}
    </>}
    {renderJob && <div className="mt-5"><JobMonitor key={renderJob} jobId={renderJob} onChanged={onChanged}/></div>}
  </section>
}
