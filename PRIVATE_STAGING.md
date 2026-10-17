# Private staging frontend

2026-10-17 protected release is deployed: `dpl_GKrPNBvtPSBEhbbtg5THJ5graf1J`,
serving `https://zoclip.technabeel.com`. Production webpack/TypeScript build passed;
Vercel authentication still covers all deployments. Private API origin remains
`https://api.zoclip.technabeel.com:18443`. The existing video now receives a real
60-credit preview; generation and checkout stay disabled. See the
[verified release result](../backend/docs/PRIVATE_RELEASE_RESULT_2026-10-17.md)
for preserved data, authenticated encrypted backup checks, exact deployed image,
test evidence and the outstanding signed-in staging browser check.

2026-10-15 live deployment and upload fix:
[verified upload behavior and owner retry steps](../backend/docs/PRIVATE_STAGING_UPLOAD_FIX_2026-10-15.md).
Local hashing is distinct from server-confirmed transfer/finalization. Closed
private staging permits upload validation without provisioning commercial prices
or credits; AI/spending/payments remain disabled. Historical preparation follows.

2026-10-15: reviewer transport is WireGuard, with SSH for operations.
[VPN access procedure](../backend/docs/WIREGUARD_REVIEWER_ACCESS.md).
Vercel remains outside the VPN; each reviewer browser must verify private API access.

Milestone6 preparation only. No Vercel deployment or domain change executed.
Use the coordinated [deployment runbook](../backend/docs/PHASE8_PRIVATE_STAGING_RUNBOOK.md).

Blocker follow-up adds `/accept-invite` for owner-authorized single-use invitations
and `/private-access` for an explicit browser-to-private-API readiness probe.
See [reviewer configuration](deploy/REVIEWER_ACCESS.md) and
[operator/account/recovery procedures](../backend/docs/STAGING_BLOCKERS_RESOLVED.md).
Vercel never connects through a reviewer's SSH tunnel; actual browser access must
be verified before admission. New invitation code has focused checks only; the
earlier production build result does not include these follow-up pages.

Set public build variables from `deploy/private-staging.env.example` for an owned
same-site frontend/API domain. Backend secrets never belong in Vercel. Private
build fails on missing origins, cross-site addresses or enabled signup/analytics.
Vercel All Deployments authentication protection and reviewer membership must be
configured externally before upload. No robots/header setting replaces that gate.

`pnpm run build:staging` validates configuration and builds with webpack, retaining
TypeScript checks. `pnpm run build:verify` performs a local memory/disk-guarded build
with one compiler worker and384MiB heap; it never invokes Vercel. The local PASS used
reserved example.invalid origins and Node20.18; rebuild with real domains under
the deployment target Node22/Corepack. A fresh frozen install and actual Vercel
packaging remain unverified. Do not copy the placeholder `.next` output to staging.

Private mode hides signup, removes analytics and adds restricted CSP/security
headers. `/health` is frontend liveness only; backend `/health/ready` checks its
dependencies. Admin screens continue using existing server-side role enforcement.
API calls originate from the reviewer's browser through the approved SSH tunnel;
Vercel cannot reach that loopback listener. Browser local-network permission, TLS,
cookie/CORS/CSRF and customer/admin access require an actual staging smoke check.

Offline verification: `node tests/staging-config.test.mjs` —13 passing. This direct
Node invocation avoids the RAM/sandbox overhead of spawning a test-runner child.
Production build including TypeScript PASS; focused Oxlint PASS. No browser tests,
live AI, purchase, financial write or acceptance authorization performed.
