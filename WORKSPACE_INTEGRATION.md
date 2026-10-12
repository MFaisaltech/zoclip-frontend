# Phase 8, Milestone 2: workspace and credits

Only read integration is in scope. Milestone 1 cookie authentication and CSRF
mutations remain intact. No uploads, processing requests, editing, playback,
exports, checkout, payments or admin workflows are enabled by this frontend.

## Contracts and display behavior

| Resource | Existing GET endpoint | Pagination |
|---|---|---|
| Profile | `/api/v1/me` | None; M1 authenticated identity |
| Videos | `/api/v1/videos` | `limit=20`, `before=<last UUID>` |
| Jobs | `/api/v1/jobs` | `limit=20`, `before=<last UUID>` |
| Clips | `/api/v1/clips` | `limit=20`, `before=<last UUID>` |
| Wallet | `/api/v1/me/credits` | None |
| Ledger | `/api/v1/me/credit-transactions` | `limit=20`, authoritative `next_cursor` |
| Entitlements | `/api/v1/me/entitlements` | `limit=20`, `cursor=<last UUID>` |
| Plans | `/api/v1/plans` | None; public catalog |

`scripts/generate-workspace-api.mjs` reads the backend OpenAPI snapshot and
generates types, runtime response schemas and endpoint/cursor descriptors into
`lib/workspace-schema.ts`. `npm run api:check` checks both auth and workspace
contract drift. Backend tests independently check the snapshot against the app.
All workspace calls use credentialed GET, `cache: no-store`, bounded timeouts,
response validation and cancellation. They do not mint CSRF tokens or send
bearer tokens. Money/credits must be safe integers; PKR paisa formatting uses
integer arithmetic. A bad balance is an error, never a fabricated zero.

The backend has no aggregate dashboard or activity feed endpoint. Overview counts
are explicitly **loaded records, not all-time totals**. Jobs display their real
state/stage, reported progress (or unavailable), attempts and update time.
Video titles and thumbnails are not supplied, so video IDs identify them. Clips
display stored titles/preferences/revisions; the listing does not prove a render
is available. No score, thumbnail, export or completion is inferred.

List array pages have no total/next-page indicator. A full 20-record page offers
Load more; the following page can be empty. Ledger uses its explicit cursor.
Ledger and entitlements retain the backend's UUID order; media retains newest
creation order. Page retries preserve loaded records; refresh clears stale data.
Each resource has independent loading/empty/error/retry states. Job updates are
snapshots; use Refresh. The visible-page session timer also reloads workspace data.

Available and reserved credits are displayed separately. An entitlement uses
the backend's `active` flag, including future, expired or revoked periods.
Its plan name is shown only when the current catalog contains that exact price
version; historical versions keep their ID. No plan is inferred from a balance.
Null prices are labeled unconfigured, rather than free. Purchases stay disabled.

## Account isolation

The workspace is keyed by authenticated user ID. Each mount owns its resource
stores; there is no shared account cache or browser storage. Session revalidation
withholds and unmounts the workspace. Logout/account changes discard stores and
abort reads. Generation guards also reject late responses from fetches that ignore
abort. A 401 on any workspace read immediately clears the visible workspace and
CSRF memory and shows the M1 expiry screen; canceled old requests cannot invalidate
a newly authenticated account. BroadcastChannel coordinates other tabs; without
it, existing focus/visibility/pageshow/timer checks revalidate identity.

## Reproducing verification

Use the opt-in local service setup in [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md).
It always creates unique disposable data, and refuses occupied ports. For M2
browser checks, append synthetic fixtures to that new browser test database:

```powershell
cd D:\ZoClip-Project\backend
.venv/Scripts/python.exe scripts/seed_workspace_test.py --allow-disposable-local --state var/phase8-auth/<run-id>/state.json
```

The helper refuses other database hosts/ports/names and refuses an existing
fixture manifest. It inserts synthetic records only: no media files, outbox,
paid calls or payment evidence. Test prices/credits are fictional and must never
be copied into a real catalog. Private test credentials/IDs are saved only in
ignored `var/phase8-auth/<run-id>/workspace-fixture.json`.

In the frontend shell (keep the dev server running on localhost:3000):

```powershell
$env:ZOCLIP_AUTH_TEST_STATE='D:/ZoClip-Project/backend/var/phase8-auth/<run-id>/state.json'
npm test
npm run api:check
npm run typecheck
npm run lint
npm run test:browser
```

The six M2 Chrome tests cover actual owned data, all cursor conventions, real
prices/balances, account switching, reload, cross-tab changes and server revocation.
Controlled response overrides separately exercise pending reads, 503/retry and
malformed balances. Existing five M1 Chrome tests remain included. Artifacts
containing passwords/tokens remain disabled.

Backend focused command, using only the separate new disposable `_test` DB and
Redis database 15, is recorded in
[PHASE8_WORKSPACE_MILESTONE.md](../backend/docs/PHASE8_WORKSPACE_MILESTONE.md).
No production configuration or backend endpoint behavior changed.

The linter is pinned to Oxlint 1.0.0 for the installed Node 20.18 compatibility;
React/Next.js/accessibility correctness plugins and warning failures are enabled.
The lockfile adds only that dev tool and its optional platform binaries.

On this machine the C: drive was full during validation. Use workspace-local
`TEMP`, `TMP` and `npm_config_cache` if necessary; do not delete user data to
make a check pass. Windows also needs sufficient available virtual memory for
Next and Chrome. See the backend milestone report for the final execution result.

The verified production build used the optional one-worker configuration:

```powershell
New-Item -ItemType Directory -Force .tools/tmp | Out-Null
$env:TEMP='D:/ZoClip-Project/frontend/.tools/tmp'
$env:TMP=$env:TEMP
$env:npm_config_cache='D:/ZoClip-Project/frontend/.tools/npm-cache'
$env:ZOCLIP_LOW_MEMORY='1'
$env:RAYON_NUM_THREADS='1'
$env:NODE_OPTIONS='--max-old-space-size=512 --max-semi-space-size=4'
$env:NEXT_PUBLIC_API_ORIGIN='https://api.zoclip.example'
npm run build
```

The example origin is a placeholder for local build verification, not a deployment
target. Type checks remain enabled. Normal config is unchanged when the optional
low-memory variable is absent. Temporary test servers were stopped after checking;
their disposable data and visual review evidence were preserved.
