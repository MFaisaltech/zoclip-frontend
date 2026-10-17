'use client'

import { useState, type ReactNode } from 'react'
import MediaStudio from '@/components/media-studio'
import BillingView from '@/components/billing-view'
import AdminDashboard from '@/components/admin-dashboard'
import { Highlights, ClipEditor } from '@/components/clip-workbench'
import type { MediaSchemas } from '@/lib/media-api'
import {
  Clapperboard,
  FileVideo,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Scissors,
  UserRound,
  Zap,
  ShieldCheck,
} from 'lucide-react'
import { authErrorMessage, type User } from '@/lib/auth-api'
import { useWorkspaceResource } from '@/lib/use-workspace'
import type { ResourceName } from '@/lib/workspace-api'

const panel = 'rounded-2xl border border-[#e8e4de] bg-white p-5'
const muted = 'text-sm leading-6 text-[#77736e]'
const action =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9d5d0] bg-white px-3 py-2 text-sm font-medium text-[#6457c8] hover:bg-[#f2efff] disabled:cursor-not-allowed disabled:opacity-50'
const navigation = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Videos', icon: FileVideo },
  { label: 'Jobs', icon: RefreshCw },
  { label: 'Clips', icon: Clapperboard },
  { label: 'Credits & plans', icon: Zap },
  { label: 'Admin', icon: ShieldCheck },
  { label: 'Account', icon: UserRound },
] as const
export type WorkspaceSection = (typeof navigation)[number]['label']
type Resource<K extends ResourceName> = ReturnType<
  typeof useWorkspaceResource<K>
>
const shortId = (id: string) => id.slice(0, 8)
const human = (value: string) => value.replaceAll('_', ' ')
const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
const credits = (value: number) => value.toLocaleString()
// Paisa stays integer throughout formatting, including amounts above 2^53 / 100.
function price(paisa: number) {
  const amount = BigInt(paisa)
  return `PKR ${(amount / BigInt(100)).toLocaleString()}.${(amount % BigInt(100)).toString().padStart(2, '0')}`
}
function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold tracking-[-0.06em]">{title}</h1>
      <p className={`mt-2 ${muted}`}>{children}</p>
    </div>
  )
}
function Unavailable({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 rounded-xl bg-[#f2efff] p-3 text-xs leading-5 text-[#6558c8]">
      {children}
    </p>
  )
}
function ErrorMessage({
  error,
  retry,
}: {
  error: unknown
  retry: () => Promise<void>
}) {
  return (
    <div
      role="alert"
      className="my-3 rounded-xl bg-red-50 p-4 text-sm text-red-800"
    >
      <p>{authErrorMessage(error)}</p>
      <button
        className={`${action} mt-3`}
        onClick={() => {
          void retry()
        }}
      >
        Try again
      </button>
    </div>
  )
}
function ResourcePanel<K extends ResourceName>({
  title,
  resource,
  children,
  paginated = false,
}: {
  title: string
  resource: Resource<K>
  children: ReactNode
  paginated?: boolean
}) {
  return (
    <section aria-label={title} className={panel}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
        <button
          className={action}
          disabled={resource.status === 'loading'}
          onClick={() => {
            void resource.refresh()
          }}
          aria-label={`Refresh ${title}`}
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
      {resource.status === 'loading' ? (
        <p role="status" className={muted}>
          Loading {title.toLowerCase()}…
        </p>
      ) : resource.status === 'error' ? (
        <ErrorMessage error={resource.error} retry={resource.refresh} />
      ) : (
        <>
          {children}
          {resource.moreError ? (
            <ErrorMessage
              error={resource.moreError}
              retry={resource.loadMore}
            />
          ) : null}
          {paginated && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eeeae5] pt-4">
              <p className="text-xs text-[#8a857f]">
                {resource.cursor
                  ? 'More records may be available.'
                  : 'All available records loaded.'}
              </p>
              {resource.cursor && (
                <button
                  className={action}
                  disabled={resource.loadingMore}
                  onClick={() => {
                    void resource.loadMore()
                  }}
                >
                  {resource.loadingMore ? 'Loading more…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-[#faf9f7] p-6 text-sm leading-6 text-[#77736e]">
      {children}
    </p>
  )
}
function Identifier({ label, id }: { label: string; id: string }) {
  return (
    <span title={id} className="break-all text-xs text-[#8a857f]">
      {label} {id}
    </span>
  )
}
function Videos({ resource, onProcess, onHighlights }: { resource: Resource<'videos'>; onProcess: (id: string) => void; onHighlights: (id: string) => void }) {
  return (
    <ResourcePanel title="Videos" resource={resource} paginated>
      {!resource.data?.length ? (
        <Empty>
          No videos in this account. Add your footage from the Videos tab.
        </Empty>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {resource.data.map((video) => (
            <article
              key={video.id}
              className="rounded-xl border border-[#eeeae5] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eeeafd] text-[#7668df]">
                  <FileVideo size={19} />
                </div>
                <div>
                  <h3 className="font-medium">Video {shortId(video.id)}</h3>
                  <p className="text-xs capitalize text-[#6558c8]">
                    {human(video.state)}
                  </p>
                </div>
              </div>
              <p className={`mt-3 ${muted}`}>Added {date(video.created_at)}</p>
              <p className="mb-2 text-xs text-[#8a857f]">
                Retention ends {date(video.expires_at)}
              </p>
              <Identifier label="Video" id={video.id} />
              <br />
              <Identifier label="Project" id={video.project_id} />
              <div className="mt-3"><button className={action} disabled={video.state !== 'READY'} onClick={() => onProcess(video.id)}>Review processing quote</button></div>
              <div className="mt-2"><button className={action} disabled={video.state !== 'READY'} onClick={() => onHighlights(video.id)}>View AI highlights</button></div>
            </article>
          ))}
        </div>
      )}
      <Unavailable>
        Upload or import footage in Videos, then review a quote for a validated source. Video playback is a later milestone.
      </Unavailable>
    </ResourcePanel>
  )
}
function Jobs({ resource, onTrack }: { resource: Resource<'jobs'>; onTrack: (id: string) => void }) {
  return (
    <ResourcePanel title="Jobs" resource={resource} paginated>
      {!resource.data?.length ? (
        <Empty>No jobs in this account.</Empty>
      ) : (
        <div className="space-y-3">
          {resource.data.map((job) => (
            <article
              key={job.id}
              className="rounded-xl border border-[#eeeae5] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium capitalize">
                    {human(job.kind)} · {human(job.state)}
                  </h3>
                  <p className={muted}>Stage: {human(job.stage)}</p>
                </div>
                <span className="rounded-full bg-[#f2efff] px-3 py-1 text-xs text-[#6558c8]">
                  {job.progress_percent === null
                    ? 'Progress unavailable'
                    : `${job.progress_percent}%`}
                </span>
              </div>
              <p className="my-2 text-xs text-[#8a857f]">
                Updated {date(job.updated_at)} · Attempts: {job.attempts} ·
                Estimated credits:{' '}
                {job.estimated_credits === null
                  ? 'Unavailable'
                  : credits(job.estimated_credits)}
              </p>
              {job.error_code && (
                <p className="mb-2 break-all text-sm text-red-800">
                  Error: {job.error_code}
                </p>
              )}
              <Identifier label="Job" id={job.id} />
              <br />
              <Identifier label="Video" id={job.video_id} />
              <div className="mt-3"><button className={action} onClick={() => onTrack(job.id)}>Track job</button></div>
            </article>
          ))}
        </div>
      )}
      <Unavailable>
        Track a job for live polling, recent events and cancellation. Processing percentages are shown only when the server reports them.
      </Unavailable>
    </ResourcePanel>
  )
}
function Clips({ resource, onEdit }: { resource: Resource<'clips'>; onEdit: (id: string) => void }) {
  return (
    <ResourcePanel title="Clips" resource={resource} paginated>
      {!resource.data?.length ? (
        <Empty>No clips in this account.</Empty>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {resource.data.map((clip) => (
            <article
              key={clip.id}
              className="rounded-xl border border-[#eeeae5] p-4"
            >
              <div className="mb-3 grid size-10 place-items-center rounded-xl bg-[#eeeafd] text-[#7668df]">
                <Scissors size={19} />
              </div>
              <h3 className="break-words font-medium">
                {clip.preferences.title || `Clip ${shortId(clip.id)}`}
              </h3>
              <p className={muted}>
                Revision {clip.revision} ·{' '}
                {(
                  (clip.preferences.end_ms - clip.preferences.start_ms) /
                  1000
                ).toLocaleString()}{' '}
                seconds
              </p>
              <p className="my-2 text-xs text-[#8a857f]">
                Created {date(clip.created_at)}
              </p>
              <Identifier label="Clip" id={clip.id} />
              <br />
              <Identifier label="Video" id={clip.video_id} />
              <div className="mt-3"><button className={action} onClick={() => onEdit(clip.id)}>Open clip editor</button></div>
            </article>
          ))}
        </div>
      )}
      <Unavailable>
        Open a clip to edit its saved revision, inspect actual render records and download private MP4 exports.
      </Unavailable>
    </ResourcePanel>
  )
}
function Wallet({ resource }: { resource: Resource<'wallet'> }) {
  return (
    <ResourcePanel title="Credit balance" resource={resource}>
      {resource.data && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={muted}>Available credits</p>
              <p
                className="mt-2 text-3xl font-semibold tracking-tight"
                data-testid="available-credits"
              >
                {credits(resource.data.available_credits)}
              </p>
            </div>
            <div>
              <p className={muted}>Reserved credits</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {credits(resource.data.reserved_credits)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#8a857f]">
            Reserved credits are held for work and cannot be spent again. Credit
            expiry is disabled.
          </p>
        </>
      )}
    </ResourcePanel>
  )
}
function Transactions({ resource }: { resource: Resource<'transactions'> }) {
  return (
    <ResourcePanel title="Credit transactions" resource={resource} paginated>
      {!resource.data?.items.length ? (
        <Empty>No credit transactions in this account.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <caption className="mb-4 text-left text-xs text-[#8a857f]">
              Ledger order returned by the API. Balances shown are after each
              transaction.
            </caption>
            <thead className="text-xs text-[#8a857f]">
              <tr>
                {[
                  'Operation / date',
                  'Available change',
                  'Reserved change',
                  'Available after',
                  'Reserved after',
                ].map((label) => (
                  <th key={label} scope="col" className="pb-3 pr-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resource.data.items.map((item) => (
                <tr key={item.id} className="border-t border-[#eeeae5]">
                  <td className="py-4 pr-4">
                    <span className="font-medium capitalize">
                      {human(item.operation)}
                    </span>
                    <p className="mt-1 text-xs text-[#8a857f]">
                      {date(item.created_at)}
                    </p>
                    <span title={item.id} className="text-xs text-[#8a857f]">
                      {shortId(item.id)}
                    </span>
                  </td>
                  {[
                    item.available_delta,
                    item.reserved_delta,
                    item.available_after,
                    item.reserved_after,
                  ].map((value, i) => (
                    <td key={i} className="pr-4 tabular-nums">
                      {i < 2 && value > 0 ? '+' : ''}
                      {credits(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ResourcePanel>
  )
}
function Entitlements({
  resource,
  plans,
}: {
  resource: Resource<'entitlements'>
  plans: Resource<'plans'>
}) {
  const planFor = (id: string) =>
    plans.data?.find((plan) => plan.price?.id === id)
  return (
    <ResourcePanel title="Entitlements" resource={resource} paginated>
      {!resource.data?.length ? (
        <Empty>
          No entitlements in this account. A plan is not inferred from your
          balance.
        </Empty>
      ) : (
        <div className="space-y-3">
          {resource.data.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-[#eeeae5] p-4"
            >
              <h3 className="font-medium capitalize">
                {planFor(item.price_version_id)?.slug ||
                  `Price version ${shortId(item.price_version_id)}`}{' '}
                · {item.active ? 'Active' : 'Inactive'}
              </h3>
              <p className={muted}>
                {date(item.starts_at)} —{' '}
                {item.ends_at ? date(item.ends_at) : 'No end date'}
              </p>
              <Identifier label="Price version" id={item.price_version_id} />
            </article>
          ))}
        </div>
      )}
    </ResourcePanel>
  )
}
function Plans({ resource }: { resource: Resource<'plans'> }) {
  return (
    <ResourcePanel title="Plans" resource={resource}>
      {!resource.data?.length ? (
        <Empty>No plans are available.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {resource.data.map((plan) => (
            <article
              key={plan.id}
              className="rounded-xl border border-[#eeeae5] p-4"
            >
              <h3 className="text-lg font-semibold capitalize">{plan.slug}</h3>
              <p className="text-xs capitalize text-[#8a857f]">
                {human(plan.kind)} · {plan.enabled ? 'Enabled' : 'Disabled'}
              </p>
              {plan.price ? (
                <>
                  <p className="mt-4 text-xl font-semibold">
                    {price(plan.price.price_paisa)}
                  </p>
                  <p className={muted}>
                    {credits(plan.price.included_credits)} included credits ·{' '}
                    {plan.price.valid_days === 0
                      ? 'No timed validity period'
                      : `${plan.price.valid_days} days`}
                  </p>
                  <p className="mt-2 text-xs text-[#8a857f]">
                    {plan.price.approved
                      ? 'Approved price'
                      : 'Price awaiting approval'}
                  </p>
                  <details className="mt-3 text-xs text-[#77736e]">
                    <summary className="cursor-pointer">Review plan &amp; usage limits</summary>
                    <dl className="mt-3 space-y-2">
                      {Object.entries(plan.price.rules).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-3">
                          <dt className="capitalize">{human(key)}</dt>
                          <dd>{typeof value==='number'?credits(value):value===null?'Not set':value?'Yes':'No'}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </>
              ) : (
                <p className="mt-4 text-sm text-[#8a857f]">
                  Pricing is not configured.
                </p>
              )}
              <p className="mt-3 text-xs text-[#8a857f]">
                No automatic renewal · Credit expiry disabled
              </p>
              <button disabled className={`${action} mt-4 w-full`}>
                Purchases unavailable
              </button>
            </article>
          ))}
        </div>
      )}
      <Unavailable>
        Merchant checkout is unavailable. Plan limits are supplied by ZoClip;
        viewing a plan does not grant credits or change your access.
      </Unavailable>
    </ResourcePanel>
  )
}
function Count({
  label,
  resource,
}: {
  label: string
  resource: Resource<'videos'> | Resource<'jobs'> | Resource<'clips'>
}) {
  return (
    <div className={panel}>
      <p className={muted}>{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {resource.status === 'ready' && Array.isArray(resource.data)
          ? credits(resource.data.length)
          : '—'}
      </p>
      <p className="mt-2 text-xs text-[#8a857f]">
        {resource.status === 'loading'
          ? 'Loading…'
          : resource.status === 'error'
            ? 'Unavailable; retry in the list below.'
            : 'Loaded records · not an all-time total'}
      </p>
    </div>
  )
}
function Account({ user }: { user: User }) {
  return (
    <section aria-label="Profile" className={panel}>
      <h2 className="mb-4 text-lg font-semibold">Profile</h2>
      <dl className="space-y-4">
        {Object.entries({
          Email: user.email,
          Verification: user.verified ? 'Verified' : 'Unverified',
          Role: user.role,
          Joined: date(user.created_at),
          'Account ID': user.id,
        }).map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-[#8a857f]">{label}</dt>
            <dd className="mt-1 break-all text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      <Unavailable>
        This profile comes from GET /api/v1/me. Profile editing and admin tools
        are not connected yet.
      </Unavailable>
    </section>
  )
}

export default function Workspace({
  user,
  onLogout,
  loggingOut,
  logoutError,
  onRefreshProfile,
  active,
  onNavigate: setActive,
}: {
  user: User
  onLogout: () => void
  loggingOut: boolean
  logoutError: string
  onRefreshProfile: () => Promise<void>
  active: WorkspaceSection
  onNavigate: (section: WorkspaceSection) => void
}) {
  const videos = useWorkspaceResource('videos')
  const jobs = useWorkspaceResource('jobs')
  const clips = useWorkspaceResource('clips')
  const wallet = useWorkspaceResource('wallet')
  const transactions = useWorkspaceResource('transactions')
  const entitlements = useWorkspaceResource('entitlements')
  const plans = useWorkspaceResource('plans')
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [highlightsVideo, setHighlightsVideo] = useState<string | null>(null)
  const [editingClip, setEditingClip] = useState<string | null>(null)
  function refreshMedia() {
    void videos.refresh(); void jobs.refresh(); void wallet.refresh(); void transactions.refresh(); void clips.refresh()
  }
  function selectVideo(id: string) { setSelectedVideo(id); setActive('Videos') }
  function trackJob(id: string) { setSelectedJob(id); setActive('Videos') }
  function acceptedJob(job: MediaSchemas['JobView']) { setSelectedJob(job.id); refreshMedia() }
  function showHighlights(id: string) {setHighlightsVideo(id); setActive('Clips')}
  function editClip(id: string) {setEditingClip(id); setActive('Clips')}
  const nav = navigation.filter(({label}) => label !== 'Admin' || user.role === 'admin').map(({ label, icon: Icon }) => (
    <button
      key={label}
      onClick={() => setActive(label)}
      aria-current={active === label ? 'page' : undefined}
      className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm md:w-full ${active === label ? 'bg-[#ece8fb] font-medium text-[#6457c8]' : 'text-[#77736e] hover:bg-[#f2efeb]'}`}
    >
      <Icon size={17} />
      {label}
    </button>
  ))
  return (
    <div className="flex min-h-screen bg-[#f7f5f1] text-[#28253a]">
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#e8e4de] bg-[#fbfaf8] p-5 md:flex">
        <div className="flex items-center gap-2.5 text-[19px] font-semibold tracking-tight">
          <div className="grid size-8 place-items-center rounded-[10px] bg-[#28253a] text-white">
            <Scissors size={16} />
          </div>
          zoclip
        </div>
        <nav aria-label="Workspace" className="mt-12 flex-1 space-y-1">
          {nav}
        </nav>
        <div className="mt-8 rounded-2xl bg-[#28253a] p-4 text-white">
          <p className="mb-2 flex items-center gap-2 text-xs text-[#d5d0ef]">
            <Zap size={13} />
            Available credits
          </p>
          <p className="text-2xl font-semibold">
            {wallet.status === 'ready' && wallet.data
              ? credits(wallet.data.available_credits)
              : '—'}
          </p>
          <p className="mt-1 text-xs text-[#aaa4c6]">
            {wallet.status === 'loading'
              ? 'Loading balance…'
              : wallet.status === 'error'
                ? 'Balance unavailable'
                : 'Live account balance'}
          </p>
          <button
            onClick={() => setActive('Credits & plans')}
            className="mt-3 text-xs font-medium text-[#dcd7ff]"
          >
            View credits & plans
          </button>
        </div>
        <p className="mt-5 truncate text-xs text-[#8a857f]">{user.email}</p>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-[#e8e4de] bg-[#fbfaf8] px-5 py-4 md:px-9">
          <span className="text-sm text-[#8a857f]">
            Workspace / <span className="text-[#28253a]">{active}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              className={action}
              onClick={() => {
                void onRefreshProfile()
              }}
            >
              <RefreshCw size={14} />
              Refresh workspace
            </button>
            <button
              disabled={loggingOut}
              onClick={onLogout}
              className={action}
              aria-label={loggingOut ? 'Logging out' : 'Log out'}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">
                {loggingOut ? 'Logging out…' : 'Log out'}
              </span>
            </button>
          </div>
        </header>
        <nav
          aria-label="Mobile workspace"
          className="flex gap-1 overflow-x-auto border-b border-[#e8e4de] bg-[#fbfaf8] p-3 md:hidden"
        >
          {nav}
        </nav>
        <div className="mx-auto max-w-[1220px] p-5 md:p-9">
          <p
            role="status"
            className="mb-5 break-words rounded-xl border border-[#e4defd] bg-[#f2efff] p-3 text-xs text-[#6558c8]"
          >
            Signed in as {user.email}.
          </p>
          {logoutError && (
            <p
              role="alert"
              className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800"
            >
              {logoutError}
            </p>
          )}
          {active === 'Overview' && (
            <>
              <Heading title="Welcome back.">
                Your account’s videos, job updates, clips and credit balance.
              </Heading>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Count label="Videos loaded" resource={videos} />
                <Count label="Jobs loaded" resource={jobs} />
                <Count label="Clips loaded" resource={clips} />
              </div>
              <div className="space-y-6">
                <Wallet resource={wallet} />
                <Jobs resource={jobs} onTrack={trackJob} />
                <Videos resource={videos} onProcess={selectVideo} onHighlights={showHighlights} />
                <Clips resource={clips} onEdit={editClip} />
              </div>
            </>
          )}
          <MediaStudio owner={user.id} visible={active === 'Videos'} videoId={selectedVideo} jobId={selectedJob} onJob={acceptedJob} onChanged={refreshMedia} />
          {active === 'Videos' && (
            <>
              <Heading title="Your videos">
                Retained video records belonging to your account.
              </Heading>
              <Videos resource={videos} onProcess={selectVideo} onHighlights={showHighlights} />
            </>
          )}
          {active === 'Jobs' && (
            <>
              <Heading title="Your jobs">
                Actual processing state from the backend.
              </Heading>
              <Jobs resource={jobs} onTrack={trackJob} />
            </>
          )}
          {active === 'Clips' && (
            <>
              <Heading title="Your clips">
                Saved clip preferences and revisions.
              </Heading>
              {highlightsVideo && <Highlights key={highlightsVideo} owner={user.id} videoId={highlightsVideo} onClip={editClip} onChanged={refreshMedia} />}
              {editingClip && <ClipEditor key={editingClip} owner={user.id} clipId={editingClip} onChanged={refreshMedia} />}
              <Clips resource={clips} onEdit={editClip} />
            </>
          )}
          {active === 'Credits & plans' && (
            <BillingView key={user.id} wallet={<Wallet resource={wallet}/>} ledger={<Transactions resource={transactions}/>} access={<Entitlements resource={entitlements} plans={plans}/>} catalog={<Plans resource={plans}/>}/>
          )}
          {active === 'Admin' && <AdminDashboard user={user} onChanged={() => {void plans.refresh(); void wallet.refresh(); void transactions.refresh(); void entitlements.refresh()}}/>}
          {active === 'Account' && (
            <>
              <Heading title="Your account">
                Authenticated profile and security status.
              </Heading>
              <Account user={user} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
