# Unified generation studio — local review

Follow-up verification on 2026-10-30 preserves this redesign. Worker networking,
plugins/EJS, local configuration and fractional-duration fixes, Next.js 16.4.1,
and connected generation/authentication acceptance are documented in
[the security and staging report](SECURITY_STAGING_2026-10-29.md). Earlier blockers
and warning notes below are historical; no deployment is claimed.

Branches: frontend `ui/responsive-pass` (base `ce97536`), backend
`perf/parallel-pipeline` (base `0d60b43`). Nothing is deployed or merged.

## Experience and credit authorization

The always-visible studio defaults to Paste YouTube Link, beside Upload Video.
There is no source accordion or rights checkbox. Clicking Generate Clips accepts
the concise rights notice and starts free preparation via `import-link` or the
existing resumable, checksummed upload API. Accepted job status updates automatically.

After preparation, the same button confirms the exact server quote. Unknown-length
sources cannot authorize an undisclosed credit amount. Preparation reserves no credits.
Balance is checked before processing, then the unchanged backend atomically applies
authorization, quotas and credit holds. Confirmed/uncertain requests reuse their quote
and idempotency key. Refunds/releases and settlement are unchanged. Private-preview
mode still forbids processing; a UI flag never bypasses server gates.

Your Clips is directly below the studio: titles, duration, status, authenticated
preview/download and existing editing. Completion automatically refreshes the library.
Background clip refresh keeps visible cards; financial resources still clear stale data.
Account-scoped saved uploads, accepted jobs and pending confirmations can recover.
Upload cancellation remains explicit and revokes only the selected saved upload.

## URL rejection and security

Older frontend builds send every URL to the direct-file importer, which deliberately
excludes YouTube; the old UI also rejected timestamp fragments. The new UI accepts
HTTPS watch, Shorts, live-recording, embed and youtu.be video URLs with share/time
parameters. Backend `import-url` now safely dispatches exact YouTube hosts into the
existing yt-dlp adapter, preserving a legacy request's byte cap. Non-YouTube direct
media retain their existing SSRF/DNS-pinning/redirect validation.

Both layers reject credentials, non-HTTPS schemes, alternate ports, malformed IDs,
private/lookalike hosts, backslashes and controls. Only a canonical HTTPS watch URL
and validated 11-character ID reach yt-dlp; arbitrary query/fragment redirect targets
are discarded. yt-dlp ignores ambient config. Auth, CSRF, rights, owner isolation,
idempotency, probing, file/duration limits and financial controls remain in force.

API generators normalize CRLF/LF to avoid Windows-only schema/hash drift. Existing
auth/workspace source hashes are refreshed. There is no new API schema or migration.

## Read-only staging findings and remaining blockers

No running staging configuration was changed for this feature. Host `warp-svc` and
`bgutil-pot` are active; WARP reports `warp=on`, and PO-token `/ping` returns 200 on
loopback port 4416. However, the AI worker has empty `LINK_PROXY_URL`, yt-dlp plugin
discovery returns `[]`, and its metadata-only probe fails with **Temporary failure
in name resolution**. No media was downloaded or application job created.

Real YouTube ingestion is not certified. An approved runtime/config release must
provide working worker DNS and private connectivity to the intended WARP/PO-token
runtime, with the provider plugin installed. Host service health is not a container
integration test. Do not expose those services publicly or weaken SSRF controls.
References: [yt-dlp PO-token guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide),
[bgutil configuration](https://github.com/Brainicism/bgutil-ytdlp-pot-provider).

Next.js 16.4.0 emitted a security-upgrade advisory during validation. Dependencies
were not upgraded in this feature. Resolve the advisory before approving a release.

## Changed files

Frontend:

- `components/generation-studio.tsx`: unified form, quote review and workflow recovery.
- `components/job-monitor.tsx`: shared polling/cancellation with status callbacks.
- `components/media-studio.tsx`: compatibility exports for existing callers.
- `components/customer-workspace.tsx`: always-visible studio and inline clip library.
- `lib/generation-flow.ts`, `lib/youtube-url.ts`: pricing/confirmation and URL handling.
- `lib/media-api.ts`: link errors and import-link response validation.
- `lib/workspace-resource.ts`: keep clips visible while refreshing.
- `scripts/generate-{auth,workspace,media}-api.mjs`: cross-platform contract checks.
- `lib/auth-schema.ts`, `lib/workspace-schema.ts`: generated source hashes.
- `package.json`: include feature tests/components in normal checks.
- `tests/generation-flow.test.mjs`, `tests/workspace-api.test.mjs`: URL security,
  price consent, insufficient balance, idempotency and background refresh regressions.
- `playwright.generation.config.ts`, `tests/browser/generation-studio.spec.ts`:
  isolated desktop/mobile generation, previews, downloads and credit rejection.
- This review document.

Backend:

- `src/zoclip/media/link_import.py`: canonical URL and ignore ambient downloader config.
- `src/zoclip/media/service.py`: compatibility dispatch with the admitted byte cap.
- `src/zoclip/media/worker.py`: enforce the admitted YouTube byte cap.
- `tests/test_link_import.py`, `tests/test_link_import_api.py`: URL and authenticated
  HTTP/worker/owner-isolation/idempotency/size-cap regression coverage.
- `tests/test_local_generation.py`: default local inference/selection uses no paid analysis.
- `tests/test_ai.py`, `tests/test_whisper_worker.py`: explicitly pin mocked Gemini and
  serial seam fixtures instead of inheriting changed production defaults.
- `docs/API_HANDOFF.md`, `docs/IMPLEMENTATION_STATUS.md`: scope/compatibility notes.

## Validation and review artifacts

Frontend: 86 unit tests and 5 browser tests pass. Browser coverage includes desktop
and mobile source tabs, valid/unsafe links, rights attestation without a checkbox,
upload-to-generation, exact quote consent, insufficient balance, automatic clip
display, authenticated download and real local MP4 playback. TypeScript, lint and
all three generated API contracts pass.

The bounded local production build passes. Next.js first halted for its security
advisory; its documented retry completed, without upgrading dependencies.

Backend: the broad selected suite initially had 238 passing, 31 failing and one
skipped case. Its failures were obsolete simulator assumptions (mocked Gemini vs
new local default; serial one-second seams vs new parallel/five-second defaults).
After making those test fixtures explicit, all 75 cases in the affected files
(including the new local-path regression) pass. The other 195 passing cases and
one skipped case cover ingestion, YouTube HTTP/worker, ownership, credit and local
selection checks. A final 28-case URL suite adds an encoded-control regression.
This is 271 distinct passing cases plus one skip across the broad run and targeted
reruns, not a claim of a fresh whole-repository test run. The skipped case requires
Windows symlink privilege and remains a Linux validation requirement.
Backend lint, formatting and mypy pass. Paid requests are mocked; the Python test
runner blocks non-loopback sockets and targets a newly initialized disposable DB.

The older browser suites require their separately seeded disposable account harness.
The new generation suite intercepts every API request and uses synthetic local media.
No customer credits were granted, no historical records were edited, and no paid
API, production, merge or deployment action occurred.

Screenshots in `test-results/`: `generation-desktop.png`, `generation-mobile.png`,
and `generation-{desktop,mobile}-complete.png`. These show test fixtures.
