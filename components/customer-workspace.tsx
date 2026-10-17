'use client'

import { useEffect, useRef, useState } from 'react'
import { Clapperboard, CreditCard, Download, Film, LoaderCircle, LogOut, Play, Scissors, ShieldCheck, Upload, UserRound, X } from 'lucide-react'
import type { User } from '@/lib/auth-api'
import { mediaApi, mediaErrorMessage, type MediaSchemas } from '@/lib/media-api'
import { useWorkspaceResource } from '@/lib/use-workspace'
import { useFinance } from '@/lib/use-finance'
import { durationLabel, jobStatus, videoStatus } from '@/lib/customer-copy'
import MediaStudio, { Generation, JobMonitor, finalJob } from './media-studio'
import { ClipEditor } from './clip-workbench'
import AdminDashboard from './admin-dashboard'
import type { WorkspaceSection } from './workspace-view'

const panel='rounded-2xl border border-[#e8e4de] bg-white p-5 sm:p-7'
const button='inline-flex items-center justify-center gap-2 rounded-xl border border-[#dedad4] bg-white px-4 py-2.5 text-sm font-medium text-[#514773] transition hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-50'
const primary=`${button} !border-transparent !bg-[#7668df] !text-white hover:!bg-[#6557ce]`
const date=(value:string)=>new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
type Clip=NonNullable<ReturnType<typeof useWorkspaceResource<'clips'>>['data']>[number]

function ClipCard({clip,onEdit}:{clip:Clip;onEdit:()=>void}) {
  const [output,setOutput]=useState<MediaSchemas['OutputView']|null>(null)
  const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null)
  const ref=useRef(''),control=useRef<AbortController|null>(null)
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>
    async function load() {
      try {
        const outputs=await mediaApi.call('outputs',{params:{clip_id:clip.id},signal:controller.signal})
        if(controller.signal.aborted)return
        // A ready previous revision stays available while a new edit is rendering.
        const completed=outputs.filter(row=>row.state==='COMPLETE').sort((a,b)=>b.revision-a.revision)[0]
        setOutput(completed??outputs[0]??null);setError(null)
        if(!outputs.length||outputs.some(row=>!['COMPLETE','FAILED','DELETED'].includes(row.state)))timer=setTimeout(()=>{void load()},5000)
      }catch(cause){if(!controller.signal.aborted){setError(cause);timer=setTimeout(()=>{void load()},15000)}}
    }
    void load()
    return()=>{controller.abort();clearTimeout(timer);control.current?.abort();if(ref.current)URL.revokeObjectURL(ref.current)}
  },[clip.id,clip.revision])
  async function receive(download:boolean) {
    if(control.current||!output||output.state!=='COMPLETE')return
    const controller=new AbortController();control.current=controller;setBusy(true);setError(null)
    try {
      let target=ref.current
      if(!target) {
        const blob=await mediaApi.call('download',{params:{clip_id:clip.id},query:{revision:output.revision},signal:controller.signal})
        target=URL.createObjectURL(blob);ref.current=target;setUrl(target)
      }
      if(download){const anchor=document.createElement('a');anchor.href=target;anchor.download=`${(clip.preferences.title||'ZoClip').replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,80)||'ZoClip'}.mp4`;anchor.click()}
    }catch(cause){if(!controller.signal.aborted)setError(cause)}
    finally{control.current=null;if(!controller.signal.aborted)setBusy(false)}
  }
  const ready=output?.state==='COMPLETE'
  return <article className="overflow-hidden rounded-2xl border border-[#e8e4de] bg-white">
    <div className="grid min-h-56 place-items-center bg-[#252136] p-4">
      {url?<video aria-label={`${clip.preferences.title||'Clip'} preview`} src={url} controls playsInline preload="metadata" className="max-h-96 w-full rounded-lg"><track kind="captions"/>Your browser cannot play this video.</video>:<button className="flex flex-col items-center gap-4 text-white disabled:opacity-60" disabled={!ready||busy} onClick={()=>{void receive(false)}}><span className="grid size-14 place-items-center rounded-full bg-white/15">{busy?<LoaderCircle className="animate-spin"/>:ready?<Play fill="currentColor"/>:<Film/>}</span><span className="text-sm">{busy?'Loading preview…':ready?'Preview clip':output?.state==='FAILED'?'Clip needs attention':'Preparing clip…'}</span></button>}
    </div>
    <div className="p-5"><h3 className="font-semibold">{clip.preferences.title||'Your clip'}</h3><p className="mt-2 text-xs text-[#77736e]">{durationLabel((clip.preferences.end_ms-clip.preferences.start_ms)/1000)} · Vertical MP4{ready?' · Ready to share':''}</p>
      <div className="mt-4 flex flex-wrap gap-2"><button className={primary} disabled={!ready||busy} onClick={()=>{void receive(true)}}><Download size={15}/>{busy?'Loading…':'Download'}</button><button className={button} disabled={!ready} onClick={onEdit}>Edit</button></div>
      {!!error&&<p role="alert" className="mt-3 text-sm text-red-800">{mediaErrorMessage(error)}</p>}
    </div>
  </article>
}

function Credits() {
  const balance=useWorkspaceResource('wallet'), overview=useFinance('billingOverview'), history=useWorkspaceResource('transactions'), plans=useWorkspaceResource('plans')
  return <div className="space-y-6"><div><h1 className="text-3xl font-semibold tracking-tight">Credits & plans</h1><p className="mt-2 text-sm text-[#77736e]">See the price before you create. Pay only when your clips are ready.</p></div>
    <section className={panel}><h2 className="font-semibold">Your balance</h2>{balance.status==='loading'?<p role="status" className="mt-4">Loading…</p>:balance.status==='error'?<><p role="alert" className="my-3 text-sm">{mediaErrorMessage(balance.error)}</p><button className={button} onClick={()=>{void balance.refresh()}}>Try again</button></>:<><p className="mt-4 text-4xl font-semibold">{balance.data?.available_credits.toLocaleString()} <span className="text-base font-normal text-[#77736e]">credits</span></p><p className="mt-3 text-sm text-[#77736e]">Credits being used for current videos: {balance.data?.reserved_credits.toLocaleString()}</p></>}</section>
    <section className={`${panel} !bg-[#f4f1ff]`}><h2 className="font-semibold">Credit purchases are coming soon</h2><p className="mt-2 text-sm leading-6 text-[#77736e]">Checkout is currently unavailable. Your existing credits are safe. There are no automatic renewals, and your credits do not expire.</p></section>
    {!!overview.data?.plan?.price?.rules.minimum_job_credits&&<p className="text-sm text-[#77736e]">Each video has a minimum price of {overview.data.plan.price.rules.minimum_job_credits} credits, including shorter videos. Review the exact price before generating.</p>}
    {overview.data?.plan?.price&&<section className={panel}><h2 className="font-semibold">How clipping is priced</h2><p className="mt-3 text-sm leading-7 text-[#77736e]">{overview.data.plan.price.rules.credits_per_minute} credits per started minute of source video, plus {overview.data.plan.price.rules.credits_per_output} per requested clip. Captions and vertical framing {overview.data.plan.price.rules.captions_credits+overview.data.plan.price.rules.reframe_credits===0?'are included.':'are shown in your price before you confirm.'}</p><p className="mt-2 text-sm text-[#77736e]">Up to {overview.data.plan.price.rules.max_outputs} clips per video. Your exact price appears beside Generate clips.</p></section>}
    <section className={panel}><h2 className="font-semibold">Plans</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{plans.data?.filter(plan=>plan.kind==='plan'&&plan.slug!=='free'&&plan.enabled).map(plan=><div key={plan.id} className="rounded-xl border border-[#eeeae5] p-5"><h3 className="font-semibold capitalize">{plan.slug}</h3><p className="mt-2 text-sm text-[#77736e]">Coming soon</p></div>)}</div></section>
    <section className={panel}><h2 className="font-semibold">Credit history</h2>{history.status==='error'?<><p role="alert" className="mt-3 text-sm">{mediaErrorMessage(history.error)}</p><button className={button} onClick={()=>{void history.refresh()}}>Try again</button></>:history.status==='loading'?<p role="status" className="mt-4 text-sm">Loading history…</p>:!history.data?.items.length?<p className="mt-4 text-sm text-[#77736e]">Your credit activity will appear here.</p>:<ul className="mt-4 divide-y divide-[#eeeae5]">{history.data.items.map(row=><li className="flex flex-wrap justify-between gap-2 py-4 text-sm" key={row.id}><span>{({GRANT:'Credits added',ADMIN_ADJUST:'Balance adjustment',RESERVE:'Clip generation started',SETTLE:'Clips completed',RELEASE:'Credits returned',REFUND:'Refund'} as Record<string,string>)[row.operation]??'Balance update'}<span className="ml-3 text-xs text-[#77736e]">{date(row.created_at)}</span></span><span>{row.operation==='SETTLE'?-row.reserved_delta:row.available_delta} credits</span></li>)}</ul>}{history.cursor&&<button className={`${button} mt-3`} disabled={history.loadingMore} onClick={()=>{void history.loadMore()}}>{history.loadingMore?'Loading…':'Show more'}</button>}</section>
  </div>
}

export default function CustomerWorkspace({user,onLogout,loggingOut,logoutError,onRefreshProfile,active,onNavigate}:{user:User;onLogout:()=>void;loggingOut:boolean;logoutError:string;onRefreshProfile:()=>Promise<void>;active:WorkspaceSection;onNavigate:(section:WorkspaceSection)=>void}) {
  const videos=useWorkspaceResource('videos'),jobs=useWorkspaceResource('jobs'),clips=useWorkspaceResource('clips'),wallet=useWorkspaceResource('wallet')
  const [uploading,setUploading]=useState(false),[videoId,setVideoId]=useState<string|null>(null),[jobId,setJobId]=useState<string|null>(null),[editId,setEditId]=useState<string|null>(null)
  const [refreshing,setRefreshing]=useState(false)
  const studio=useRef<HTMLDivElement|null>(null)
  const refresh=()=>{void videos.refresh();void jobs.refresh();void clips.refresh();void wallet.refresh()}
  const currentJob=jobs.data?.find(row=>row.id===jobId)
  useEffect(()=>{
    if(currentJob?.state==='COMPLETED'&&['VALIDATE','IMPORT'].includes(currentJob.kind)){setVideoId(currentJob.video_id);setUploading(false);setJobId(null)}
  },[currentJob?.id,currentJob?.state,currentJob?.kind,currentJob?.video_id])
  useEffect(()=>{
    if(!jobs.data?.some(job=>!finalJob(job)))return
    const timer=setTimeout(()=>{if(document.visibilityState!=='hidden')refresh()},6000)
    return()=>clearTimeout(timer)
  })
  const section=active==='Overview'||active==='Videos'||active==='Jobs'?'Videos':active
  const nav=[{label:'Videos',icon:Film},{label:'Clips',icon:Clapperboard},{label:'Credits & plans',icon:CreditCard},{label:'Account',icon:UserRound},...(user.role==='admin'?[{label:'Admin',icon:ShieldCheck}]:[])]
  const buttons=nav.map(({label,icon:Icon})=><button key={label} onClick={()=>onNavigate(label as WorkspaceSection)} aria-current={section===label?'page':undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm md:w-full ${section===label?'bg-[#eeeafd] font-medium text-[#6457c8]':'text-[#77736e] hover:bg-[#f1eeea]'}`}><Icon size={17}/>{label}</button>)
  function startUpload(){setUploading(true);setVideoId(null);setJobId(null);onNavigate('Videos');setTimeout(()=>studio.current?.scrollIntoView({behavior:'smooth',block:'start'}),0)}
  return <div className="flex min-h-screen bg-[#f7f5f1] text-[#28253a]">
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#e8e4de] bg-[#fbfaf8] p-5 md:flex"><a href="/" className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-[#28253a] text-white"><Scissors size={17}/></span>zoclip</a><nav aria-label="Workspace" className="mt-12 flex-1 space-y-1">{buttons}</nav><button className="rounded-2xl bg-[#28253a] p-5 text-left text-white" onClick={()=>onNavigate('Credits & plans')}><span className="text-xs text-[#c6bfdc]">Available credits</span><span className="mt-2 block text-3xl font-semibold">{wallet.data?.available_credits.toLocaleString()??'—'}</span><span className="mt-3 block text-xs text-[#c6bfdc]">View balance & plans →</span></button><p className="mt-5 truncate text-xs text-[#77736e]">{user.email}</p></aside>
    <main className="min-w-0 flex-1"><header className="flex min-h-20 items-center justify-between gap-3 border-b border-[#e8e4de] bg-[#fbfaf8] px-5 md:px-10"><span className="text-sm font-medium">Your workspace</span><button className={button} disabled={loggingOut} onClick={onLogout}><LogOut size={15}/>{loggingOut?'Signing out…':'Log out'}</button></header><nav aria-label="Mobile workspace" className="flex gap-1 overflow-x-auto border-b border-[#e8e4de] bg-[#fbfaf8] p-3 md:hidden">{buttons}</nav>
    <div className="mx-auto max-w-6xl p-5 md:p-10">{logoutError&&<p role="alert" className="mb-5 text-sm text-red-800">{logoutError}</p>}
      {section==='Videos'&&<><div className="mb-8 flex flex-wrap items-start justify-between gap-5"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#7668df]">Less editing. More creating.</p><h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Turn your videos into short clips.</h1><p className="mt-3 text-sm leading-6 text-[#77736e]">Upload once. Find your best moments. Share something great.</p></div><button className={primary} onClick={startUpload}><Upload size={17}/>Upload a video</button></div>
      <div className="mb-8 flex flex-wrap gap-3 text-xs text-[#77736e]">{['1 · Upload a video','2 · Generate clips','3 · Preview & download'].map(step=><span key={step} className="rounded-full border border-[#e8e4de] bg-white px-4 py-2">{step}</span>)}</div>
      <div ref={studio}>{uploading&&<MediaStudio owner={user.id} visible videoId={null} jobId={null} onJob={job=>{setJobId(job.id);refresh()}} onChanged={refresh}/>}</div>
      {videoId&&<Generation key={videoId} owner={user.id} videoId={videoId} onJob={job=>{setVideoId(null);setJobId(job.id);refresh()}}/>}
      {jobId&&<JobMonitor key={jobId} jobId={jobId} onChanged={refresh}/>}
      {jobs.data?.filter(job=>!finalJob(job)&&job.id!==jobId).map(job=><div className={`${panel} mb-5 flex flex-wrap items-center justify-between gap-4`} key={job.id}><div><p className="font-medium">{jobStatus(job.state,job.kind)}</p><p className="mt-2 text-xs text-[#77736e]">Started {date(job.created_at)}</p></div><button className={button} onClick={()=>setJobId(job.id)}>View progress</button></div>)}
      {currentJob?.state==='COMPLETED'&&currentJob.kind==='PROCESS'&&<button className={`${primary} mb-6`} onClick={()=>onNavigate('Clips')}>Preview your clips <Play size={15}/></button>}
      <section aria-label="Your videos"><h2 className="mb-4 text-lg font-semibold">Your videos</h2>{videos.status==='loading'?<p role="status" className="p-6 text-sm">Loading your videos…</p>:videos.status==='error'?<div className={panel}><p role="alert" className="mb-3 text-sm">{mediaErrorMessage(videos.error)}</p><button className={button} onClick={()=>{void videos.refresh()}}>Try again</button></div>:!videos.data?.length?<div className={`${panel} grid min-h-60 place-items-center text-center`}><div><Film size={32} className="mx-auto text-[#a79dcd]"/><h3 className="mt-5 font-semibold">Your next great clip starts here</h3><p className="mt-2 text-sm text-[#77736e]">Add a talk, tutorial or conversation to get started.</p><button className={`${primary} mt-5`} onClick={startUpload}>Upload a video</button></div></div>:<div className="grid gap-4 sm:grid-cols-2">{videos.data?.map(video=><article className={panel} key={video.id}><div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#eeeafd] text-[#7668df]"><Film size={22}/></div><h3 className="font-semibold">Video · {date(video.created_at)}</h3><p className="mt-2 text-sm text-[#77736e]">{typeof video.metadata_json.duration_seconds==='number'?`${durationLabel(video.metadata_json.duration_seconds)} · `:''}{videoStatus(video.state)}</p><p className="mt-2 text-xs text-[#77736e]">Available until {date(video.expires_at)}</p><button className={`${button} mt-5`} disabled={video.state!=='READY'||jobs.data?.some(job=>job.video_id===video.id&&!finalJob(job))} onClick={()=>{setVideoId(video.id);setUploading(false);setJobId(null);window.scrollTo({top:0,behavior:'smooth'})}}>Generate clips</button></article>)}</div>}{videos.cursor&&<button className={`${button} mt-4`} disabled={videos.loadingMore} onClick={()=>{void videos.loadMore()}}>{videos.loadingMore?'Loading…':'Show more videos'}</button>}</section>
      </>}
      {section==='Clips'&&<><div className="mb-8"><h1 className="text-3xl font-semibold tracking-tight">Your clips</h1><p className="mt-3 text-sm text-[#77736e]">Preview your moments, make edits and download MP4s.</p></div>{editId&&<><button className={`${button} mb-4`} onClick={()=>setEditId(null)}><X size={15}/>Close editor</button><ClipEditor key={editId} owner={user.id} clipId={editId} onChanged={refresh}/></>}{clips.status==='loading'?<p role="status">Loading clips…</p>:clips.status==='error'?<div className={panel}><p role="alert" className="mb-4 text-sm">{mediaErrorMessage(clips.error)}</p><button className={button} onClick={()=>{void clips.refresh()}}>Try again</button></div>:!clips.data?.length?<div className={`${panel} py-16 text-center`}><Clapperboard className="mx-auto text-[#a79dcd]" size={32}/><h2 className="mt-5 font-semibold">Your clips will live here</h2><p className="mt-2 text-sm text-[#77736e]">Generate clips from a video to get started.</p><button className={`${primary} mt-5`} onClick={()=>onNavigate('Videos')}>Go to your videos</button></div>:<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{clips.data?.map(clip=><ClipCard key={`${clip.id}:${clip.revision}`} clip={clip} onEdit={()=>{setEditId(clip.id);window.scrollTo({top:0,behavior:'smooth'})}}/>)}</div>}{clips.cursor&&<button className={`${button} mt-4`} disabled={clips.loadingMore} onClick={()=>{void clips.loadMore()}}>Show more clips</button>}</>}
      {section==='Credits & plans'&&<Credits/>}
      {section==='Account'&&<><h1 className="mb-6 text-3xl font-semibold tracking-tight">Your account</h1><section className={panel}><h2 className="font-semibold">Email address</h2><p className="mt-3 break-words text-sm text-[#77736e]">{user.email}</p><p className="mt-3 text-xs text-[#6558c8]">Email verified</p><p className="mt-6 text-sm text-[#77736e]">Joined {date(user.created_at)}</p><button className={`${button} mt-5`} disabled={refreshing} onClick={()=>{if(refreshing)return;setRefreshing(true);void onRefreshProfile().finally(()=>setRefreshing(false))}}>{refreshing?'Refreshing…':'Refresh account'}</button></section></>}
      {section==='Admin'&&user.role==='admin'&&<AdminDashboard user={user} onChanged={refresh}/>}
    </div></main>
  </div>
}
