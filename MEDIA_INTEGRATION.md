# Phase 8, Milestone 3: video uploads and AI processing

The Videos tab connects to the existing FastAPI contract. Authenticated users can
upload MP4/WebM, import authorized direct HTTPS media, review a quote, explicitly
confirm a credit reservation, and track/cancel the resulting job. Editing,
render selection, playback, billing and admin workflows remain later milestones.

## Contract and recovery

`scripts/generate-media-api.mjs` reads `backend/docs/openapi.json` and generates
request/response types, schemas, paths, methods, binary-body and idempotency-header
requirements. `npm run api:check` verifies drift for auth, workspace and media.
No new backend endpoint, schema, migration or provider dependency was needed.

Uploads use POST `/uploads`, GET `/uploads/{upload_id}`, PUT
`/uploads/{upload_id}/parts/{part_number}` and POST `/uploads/{upload_id}/complete`.
Parts are zero-based and sized by the returned `part_bytes`. Initiation/completion
keys persist before dispatch; a lost acknowledgment reuses the same request.
Parts send exact bytes and SHA-256; identical part retries are safe. Automatic
upload retries stop after three attempts, use bounded exponential backoff/jitter,
respect Retry-After (long waits return control), and never retry authentication,
integrity or definitive credit errors. The user can resume after interruptions.

Whole-file SHA-256 reads 1 MiB slices using an incremental implementation checked
against native Node crypto; parts also hash in bounded slices. One part at a time
is submitted as a Blob, with the backend's 8 MiB maximum enforced. No whole-file
arrayBuffer or base64 copy is created. Hashing yields between slices. Upload
progress means bytes confirmed by the server, with separate checksum progress.

Pause aborts local IO and keeps resume metadata. Reload requires reselecting the
original file and attesting rights again; size and full SHA-256 must match before
any resumed request. GET determines which parts remain. FINALIZING/COMPLETE
replays completion rather than writing parts again. Cancel saved upload uses the
existing DELETE endpoint; cleanup can remain asynchronous. Definitively rejected
initiation discards local intent; uncertain initiation preserves its key.

Minimal resume metadata (size, checksum, IDs and request keys) lives under an
account-specific localStorage key. It contains no file bytes, filename, URL,
password, cookie or CSRF token. This intentionally survives logout for the same
account; another account does not load it. The server independently scopes every
upload and job operation to its authenticated owner. Clearing browser storage
loses automatic resume discovery; the backend expires abandoned uploads after
24 hours. Native file-picker state is cleared after completion/cancellation.

Imports use POST `/videos/import-url` with a user-selected byte ceiling and
`rights_attested: true`. Only direct HTTPS media on exact backend-approved hosts
is supported. The server retains its DNS/connected-IP/redirect/TLS/size/media
checks. No client host list or provider exception replaces server policy.
YouTube/Vimeo/Drive page imports are not offered. The default backend allowlist
is empty; operators must configure authorized direct-media hosts separately.

Quote requests use the owned READY video's authoritative integer
`metadata_json.duration_seconds`, never browser metadata. POST `/jobs/quote`
does not charge. The confirmation shows returned credits, options and expiry;
only an explicit action sends POST `/videos/{video_id}/generate`. Confirmed
requests retain quote/key/approval in account-and-video-specific sessionStorage
before dispatch, allowing same-key recovery after lost acknowledgments/reload.
An uncertain confirmed request cannot silently switch to a new quote. Expired
unconfirmed quotes require fresh review. The backend revalidates all prices,
balance, duration, plan and budget limits and reserves credits atomically.

Selected jobs poll GET `/jobs/{job_id}` without overlapping requests, every
3 seconds normally, up to 30 seconds after failures; hidden pages pause polling.
Terminal jobs stop. Refresh and recent events use existing reads. Cancellation
uses POST `/jobs/{job_id}/cancel`; CANCEL_REQUESTED remains pending until worker
acknowledgment. Only returned percentages are displayed. WAITING_ENGINE means
unavailable processing; SUGGESTIONS_READY means suggestions, with no rendered
clip or settled credit claim. Inactive suggestion/waiting holds expire after
24 hours. A fresh attempt after final failure requires a fresh quote/confirmation.

All mutations share M1's serialized, in-memory CSRF queue and credentialed
cookies. Account unmount aborts pending media IO; late aborted responses cannot
invalidate a new account. Background focus/visibility/timer identity checks keep
active transfers mounted; failed identity checks still hide/dispose the workspace.
Explicit refresh and cross-tab account changes retain their fail-closed checks.
No bearer token or provider credential is stored in the frontend.

## Local verification

Start a fresh disposable harness as described in AUTH_INTEGRATION.md, adding
`--media-test-mode`. Set FFPROBE_BINARY and FFMPEG_BINARY to existing local
binaries before starting the API. The flag only selects 64 KiB parts and the
synthetic `media.example.com` allowlist; AI/payments remain disabled in the API.
Do not reuse a deployment database or seed fictional prices in a real catalog.

In a backend terminal, using the new run's private state:

```powershell
.venv/Scripts/python.exe scripts/media_browser_fixture.py --allow-disposable-local --state var/phase8-auth/<run-id>/state.json --ffmpeg-bin <local-ffmpeg-bin> --seed
.venv/Scripts/python.exe scripts/media_browser_fixture.py --allow-disposable-local --state var/phase8-auth/<run-id>/state.json --ffmpeg-bin <local-ffmpeg-bin>
```

The test-only worker uses the existing Simulator from tests/test_ai.py, real
outbox/Redis/RQ and local FFmpeg. Synthetic URL transport replaces external
download only in this opt-in script. It never contacts Gemini, Deepgram or a
public media origin. Production SSRF/TLS behavior remains covered separately
by existing backend tests. Maintenance cleans revoked fixture files/reservations.
Browser tests revoke only their synthetic accounts' sources after each case;
financial history remains intact. Keep workers running while browser tests run.

Run the frontend on localhost:3000 with NEXT_PUBLIC_API_ORIGIN=http://localhost:8008.
Keep TEMP/TMP/npm cache under D: as documented in WORKSPACE_INTEGRATION.md.

```powershell
$env:ZOCLIP_AUTH_TEST_STATE='D:/ZoClip-Project/backend/var/phase8-auth/<run-id>/state.json'
npm test
npm run api:check
npm run typecheck
npm run lint
npx playwright test media.spec.ts
```

Run the existing auth/workspace browser suite in its separate M2-seeded harness
before M3 seeding; the two fixture sets intentionally configure different catalog
data. See the backend milestone report for exact results and production-build
commands. All service data/evidence stays ignored on D:. Stop the temporary
worker/frontend/harness processes after verification; preserve their directories.

Live provider quality, public-media-origin imports, 4 GiB/120-minute browser
capacity tests and deployment remain unverified. Paid AI still needs separate
approval and configured models/rates/budgets; real accounts may have unconfigured
plans or insufficient credits. No paid enablement or deployment is part of M3.
