# Phase 8, Milestone 4 — highlights, editor, captions and exports

Videos → View AI highlights → Load highlights reads the actual suggestions API.
Transcript loading is pinned to the returned PROCESS job. Highlights show stored
rank, timestamp bounds, score, hook, explanation and hashtags; scores are labeled
as provider suggestions, not predicted audience performance. Empty/pending/error
states expose no fabricated content. Transcript words are displayed in batches.

Create/open draft uses POST /clips with the candidate ID. It is idempotent by
candidate. Open a listed clip to reload its server revision, trim/edit title and
hashtags, change captions/font/placement/framing, and edit absolute timed words.
PATCH sends complete Preferences and quoted If-Match. Client checks source
bounds, 250ms–90s duration, safe integer timestamps, word length/count/order and
nonoverlap; the backend independently validates all features and limits.
Revision conflicts/uncertain saves preserve local text and disable another save
until the user explicitly reloads/reconciles the server revision. Reload replaces
unsaved edits. No automatic stale edit replay or merge occurs.

Caption values come directly from the generated OpenAPI enum:
classic → classic, bold → bold, karaoke → karaoke. Fonts are DejaVu Sans,
Noto Sans and Noto Naskh Arabic; placement bottom/middle/top. Framing is
track/center/pad/manual, with manual focal coordinates 0–1000. Only 9:16,
720×1280, H.264/AAC MP4 is offered. Track has the backend's sampled-face/center
fallback limitations. Preset changes are server render preferences; no fake
browser-rendered caption accuracy or face tracking is claimed.

Initial export approval explicitly accepts the original reservation for a fixed
selection, without prorating fewer clips. Approval/key is stored per owner/job
before dispatch for lost-response recovery. The job must expose its actual credit
estimate before a new approval. Definitive selection rejection unlocks correction;
uncertain requests keep their original selection/key. Reopen candidates to recover
existing drafts if navigating away before approval.

Later renders use the current saved revision and first try the existing prepaid
edit path. M3 quotation now includes the desired prepaid re-export count. When
the server requires a fresh quote, request a one-output quote from actual source
duration with the saved features, display its source-based credit cost/expiry,
and explicitly confirm it. Per-owner/clip sessionStorage preserves confirmed
revision/quote/key until the server outcome is recovered. Definitive rejections
clear the intent so settings/revisions can be corrected. No client grant or
unquoted extra debit is implemented.

Existing job polling/events/cancellation reports RENDER_QUEUED/RENDERING,
nullable progress, errors and completion. Export records show actual revision,
state and metadata; Refresh exports retrieves current results. A COMPLETE output
alone is not a deliverable: download checks the associated job is COMPLETED,
then fetches the owner-authenticated MP4 with explicit revision. Errors/401 clear
or inform the UI through existing authentication. Current and older completed
revisions can be downloaded, while a new unrendered revision cannot.

Download MIME and size are checked; the client limits received data to the backend
hard ceiling of 512 MiB. The browser Blob fallback buffers the export, bounded by
that cap, not the source video. URLs remain private, are replaced/revoked on
subsequent download/account disposal and are never persisted. Only a received MP4
is previewed, explicitly labeled with its downloaded revision; unsaved edits are
not shown as if rendered. The app reports a browser download request, not proof
that the user's filesystem saved it. No public URL or range endpoint is invented.

All calls derive from backend/docs/openapi.json via generate-media-api.mjs and
share cookie/CSRF, timeout, abort and late-account-response guards from M1–3.
No provider key or SDK is added to the frontend. Billing/admin remain outside M4.

## Reproducing local checks

Follow MEDIA_INTEGRATION.md with a new disposable harness, supplying the existing
FFmpeg/ffprobe binaries. For tiny M4 fixtures set RENDER_MAX_BYTES=16777216 before
starting auth_dev.py. Seed media_browser_fixture.py with --render-test-mode; it
configures fictional render budgets and 20 test credits (Bob remains zero).
The worker consumes real ai/render RQ queues and runs real FFmpeg with the existing
AI Simulator. Never use those fictional settings for live providers.

On this host D: lacks the normal 20 GiB plus upload reservation. M4 functional
browser verification therefore uses explicit --synthetic-media-capacity on both
auth_dev.py (with --media-test-mode) and media_browser_fixture.py. The separate
scripts/editor_browser_api.py refuses non-disposable databases, real AI enablement
or media roots outside the harness tree. These test-only processes report synthetic
capacity and require at least 1 GiB actual space for tiny fixtures. Production
Settings/media routes and their capacity admission are unchanged. This is not a
real-capacity acceptance test; the initial normal-capacity run correctly rejected
the upload. Source cleanup uses the existing lifecycle and preserves financial data.

With Next.js on localhost:3000, set ZOCLIP_AUTH_TEST_STATE to the new private
state.json and run npm test, npm run api:check, npm run typecheck, npm run lint,
and npx playwright test editor.spec.ts media.spec.ts. Auth/workspace regression
uses a separate M2-seeded harness, because catalog fixtures differ. Keep TEMP/TMP/
npm cache on D: and use the documented low-memory production build if needed.

Mock/short-fixture QA cannot establish live AI quality, Unicode/font/face quality,
large-file download memory on mobile, long-video throughput or production readiness.
See backend/docs/PHASE8_LIVE_AI_PLAN.md for verified backend variable names,
safe key configuration and the controlled live plan requiring explicit approval.
