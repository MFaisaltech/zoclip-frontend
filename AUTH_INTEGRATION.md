# Phase 8, Milestone 1: authentication

The frontend uses the existing FastAPI `/api/v1` contract. Authentication is real.
Milestone 2 now connects workspace and credit reads; see
[WORKSPACE_INTEGRATION.md](WORKSPACE_INTEGRATION.md). Milestone 3 now connects
uploads and processing; see [MEDIA_INTEGRATION.md](MEDIA_INTEGRATION.md).
Editing, payments and admin workflows remain unavailable. See the backend's
[`PHASE8_AUTH_MILESTONE.md`](../backend/docs/PHASE8_AUTH_MILESTONE.md) for outage
recovery and verification evidence.

## Local development on this Windows workspace

The backend's Python 3.12 environment has been repaired for `D:\ZoClip-Project`.
The earlier environment under `.tools/venv-before-phase8` still references the
old folder and is preserved for recovery. Use the current `.venv` only.

In a backend terminal, synchronize the existing locked environment if needed:

```powershell
cd D:\ZoClip-Project\backend
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup_local.ps1 -Offline
```

The execution-policy override applies only to that child process. It does not
change Windows policy. The script uses ignored, already installed local Python
and uv binaries; it is not a clean-machine installer.

The available Docker engine already has older verification containers, including
an API on port 8000. Leave those containers and their volumes alone. This opt-in
harness creates a fresh private PostgreSQL cluster and separate browser/backend
test databases on every start, with loopback-only services and no paid providers:

```powershell
.venv/Scripts/python.exe scripts/auth_dev.py --allow-disposable-local --postgres-bin 'C:/Program Files/PostgreSQL/17/bin' --redis-binary '.tools/redis-7.4.9/Redis-7.4.9-Windows-x64-msys2/redis-server.exe' --api-port 8008 --auth-rate-limit 100
```

The higher limit is explicit for repeated automated tests; the script's default
and normal backend default stay 10. All new data/evidence is preserved under
`backend/var/phase8-auth/<run-id>`. Occupied ports are refused. Ctrl+C stops the
new services. No existing database is migrated, reset or removed.

In a frontend terminal:

```powershell
cd D:\ZoClip-Project\frontend
$env:NEXT_PUBLIC_API_ORIGIN = 'http://localhost:8008'
npm run dev -- --hostname localhost
```

Open `http://localhost:3000`. Use `localhost` consistently for both services,
because session cookies are host-only and CSRF requires the exact app Origin.
For a different API, set `NEXT_PUBLIC_API_ORIGIN` in ignored `.env.local` or the
process environment. It contains only a public origin, never credentials.

The existing pinned pnpm is available locally. The recovered dependencies were
installed from the existing lockfile/cache with this command:

```powershell
node .tools/pnpm/node_modules/pnpm/bin/pnpm.mjs install --frozen-lockfile --offline --store-dir .tools/pnpm-store --package-import-method copy
```

If a moved/interrupted installation is incompatible, preserve it before repair;
do not let a reinstall remove project work. The remaining prior dependency files
are preserved at `.tools/node_modules-outage-recovery`. These local tools/caches
are ignored and are not distributed in Git.

## Email and session behavior

Local development delivery writes private JSON files in the harness mailbox,
not actual email. Read the `verify-email` or `password-reset` message privately
and paste its token into the corresponding form. There is no public mailbox API.
Never paste tokens/passwords/state.json into logs, issues or chat. Verification
and reset pages also accept `#token=...` fragments and remove them from the address
bar after reading; they never submit tokens automatically. The backend currently
provides tokens, not a production email/link delivery adapter.

The browser sends cookies with every API request. CSRF stays only in memory;
GET `/auth/csrf` bootstraps it and login/rotation replace it. Mutations serialize
within each page and are never automatically replayed after timeout or CSRF
failure. Another tab may change CSRF; retrying explicitly obtains a fresh token.
Logout revokes the server session. Reset revokes all authenticated sessions.
GET `/me` checks restore login, and focus/visibility/pageshow plus a 60-second
visible-page timer detect expiry/revocation. Background checks preserve mounted
transfers; any failed check still hides and disposes private data. Explicit refresh
and cross-tab identity changes withhold the workspace during validation.
BroadcastChannel synchronizes local
login/logout/reset changes across tabs where supported. Without it, focus/polling
still revalidate against the server. Server APIs enforce authorization themselves.

The workspace is withheld while the first session check is pending, after a 401,
or after a failed/malformed session check. Network/API errors have retry actions;
password confirmation and backend-derived field limits apply before submission.
Normal customers do not see staff navigation. The original visual design remains.

## Checks

```powershell
npm test
npm run api:check
npm run typecheck
# Choose the actual HTTPS API origin before building a deployable client.
$env:NEXT_PUBLIC_API_ORIGIN = 'https://api.your-domain.example'
npm run build
```

`api:generate` regenerates auth types/field limits from the adjacent backend's
actual `docs/openapi.json`; `api:check` detects drift. Browser tests require the
running development frontend and the explicitly started disposable harness:

```powershell
$env:ZOCLIP_AUTH_TEST_STATE = 'D:/ZoClip-Project/backend/var/phase8-auth/<run-id>/state.json'
npm run test:browser
```

The suite uses installed Chrome; set `PLAYWRIGHT_CHANNEL=msedge` for installed
Edge. It refuses a state/mailbox outside the disposable harness tree. Real
registration/verification/login/logout/recovery/reset, cookies, session restore,
revocation and CSRF/Origin checks use FastAPI. Outage, pending, malformed-response
and rate-limit UI cases use controlled browser network responses. Traces, video,
screenshots and automatic page snapshots are disabled to avoid token artifacts.
No production URL, mailbox, provider or payment is used.

## Remaining launch configuration

No local Milestone 1 implementation blocker remains once its recorded checks pass.
Live email delivery is still a backend launch requirement; Google remains disabled
and is outside this milestone. Production needs reviewed same-site HTTPS app/API
origins, `COOKIE_SECURE=true`, exact CORS/Origin configuration and the public API
origin set at build time. HTTP API origins are refused by the production client.
The local build verification used an example HTTPS origin and is not deployable
configuration. No deployment or VPS changes are included.
