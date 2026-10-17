# Phase 8, Milestone 5 — billing and administration

Implemented on 2026-10-14. No merchant checkout, recurring billing, AI acceptance,
deployment or live financial mutation was performed.

## Product surfaces

- `/billing` and workspace **Credits & plans**: existing real wallet/ledger and
  entitlement components, applied plan/version, access expiry, UTC daily/monthly
  credit usage, held/settled/released reservations, job hold pagination and sandbox
  order history. Applied historical plan versions are resolved by the backend,
  even when the catalog has a newer version.
- **Plans & upgrades**: actual configured prices, allocations and usage rules.
  Missing/unapproved terms are labeled. Compare/review is available; purchases
  stay disabled and do not create orders, payment success or credits. Access is
  prepaid, with no automatic renewal; credit expiry remains disabled.
- `/admin` and the administrator-only workspace entry: customer search and
  balances, customer usage/applied plan, configured plan management, global job
  states and paginated job records, exact recorded USD costs and uncertain
  exposure, read-only budgets, paginated sandbox payment monitoring and audits.
- Credit adjustments, plan-version creation and reviewed staff access awards use
  existing audited backend routes. Blank unconfigured plan fields have no invented
  defaults. Reasons and explicit confirmation are required. The access selector
  permits only configured, approved terms and labels the allowance effect.

Responsive light surfaces reuse the existing shell, colors and wallet/ledger
components. New panels have loading, empty, retry/error and permission states;
tables scroll on narrow screens. Management dialogs trap keyboard focus, restore
focus and support Escape when idle.

## Authorization and financial requests

The existing authenticated profile bootstrap gates the page shell. Non-admins
receive a permission-denied view, no administrative hook is mounted, and the
admin navigation entry is hidden. No private admin data is server-rendered.
FastAPI `AdminUser` independently authorizes every administrative read and write;
the browser role gate is not the security boundary. Existing session expiry,
CSRF, server RBAC, reasons, idempotency and immutable audit semantics are reused.

The generated media client now also covers billing/admin operations, reusing
cookie transport, no-store requests, response validation and the auth CSRF queue.
There is no checkout, refund, AI-enablement or spending-policy mutation in this
client. All financial integer values must be safe integers; PKR is formatted
using integer paisa and USD accounting values remain exact strings.

Financial action payloads/keys are saved in per-admin **sessionStorage**, before
dispatch. Ambiguity is persisted before network IO, and unknown outcomes retain
the exact request through reloads in that tab. A malformed success is unresolved.
After uncertainty, a later auth/validation rejection does not erase the original
intent. Only a validated success clears it; a conclusive first rejection can be
corrected. Storage failure blocks submission. This is tab recovery, not a shared
cross-device operation journal. Backend idempotency/audits remain authoritative;
after losing browser state, review those records before repeating a manual change.

## Contracts

New reads:

| Method/path | Purpose |
|---|---|
| GET `/me/billing` | Applied plan, prepaid access and scoped credit usage |
| GET `/me/credit-reservations` | Scoped reservation/job holds with cursor pagination |
| GET `/admin/dashboard` | Aggregate customers, wallets, access and job states |
| GET `/admin/customers` | Customer search and paginated real balances |
| GET `/admin/customers/{user_id}/billing` | Audited customer usage/plan read |
| GET `/admin/jobs` | Audited bounded job views, excluding private payloads/checkpoints |

All paths are under `/api/v1`. Existing integrations include `/plans`,
`/me/credits`, `/me/credit-transactions`, `/me/entitlements`, `/billing/history`,
`/admin/usage-costs`, `/admin/limits`, `/admin/payments`, `/admin/audit-logs`, and
the existing POST plan-version, credit-adjustment and entitlement routes.

OpenAPI is exported from actual routes. All three existing schema generators are
updated; generated authentication/workspace files also receive the new source
digest. No dependency, environment-variable or database-schema change is required.

## Focused verification

- 11 new billing-client cases pass: exact integer money, scoped storage,
  authorization errors, validation, idempotent recovery, malformed success,
  unavailable storage and later auth rejection after uncertainty.
- 11 media and 10 workspace regression cases pass for the reused transport.
- TypeScript, focused Oxlint (14 files, zero warnings/errors), and all three
  generator drift checks pass.
- Backend: six billing/dashboard PostgreSQL cases pass in new preserved schemas
  of the separate mock DB; ten configuration/OpenAPI cases also passed. Covers
  quota period semantics, owner isolation, cursor bounds, admin RBAC, search,
  audits, CSRF/idempotency, plan versions and historical entitlement resolution.
- Focused backend Ruff/format and mypy checks pass. Two existing HTTPX deprecation
  warnings remain. No heavy full suite, build or browser automation was run.

## Files changed for M5

Frontend: `app/billing/page.tsx`, `app/admin/page.tsx`,
`components/billing-view.tsx`, `components/admin-dashboard.tsx`,
`components/finance-ui.tsx`, `components/workspace-view.tsx`,
`components/zoclip-app.tsx`, `lib/billing.ts`, `lib/finance-actions.ts`,
`lib/use-finance.ts`, `lib/media-api.ts`, `lib/workspace-api.ts`,
the three generated `lib/*-schema.ts` files, `scripts/generate-media-api.mjs`,
`tests/billing-api.test.mjs`, `package.json` and this integration document.
The pre-existing `WORKSPACE_INTEGRATION.md` change is preserved, not part of M5.

Backend: `src/zoclip/billing/dashboard.py`, `src/zoclip/main.py`,
`tests/test_billing_dashboard.py`, `docs/openapi.json`, `docs/API_HANDOFF.md`,
`docs/IMPLEMENTATION_STATUS.md` and `docs/PHASE8_BILLING_ADMIN_MILESTONE.md`.
Pre-existing AI/continuation changes are preserved, not edited for this milestone.

## Decisions and private staging work

Approve commercial prices, included credits and consumption limits. Select and
onboard a merchant provider; verify its authenticated callback, checkout,
idempotency, reconciliation/refund and fee contracts before implementing a real
adapter. The current order contract explicitly represents sandbox records and
must be updated before live checkout. Decide tax/receipt, refunds/support and
prepaid upgrade/renewal terms. Recurring billing is unavailable.

Before private staging: run the production frontend build and responsive/keyboard
UI checks on a host with adequate resources; verify real cookie/CSRF origins,
admin/customer roles, staff actions and interrupted requests using staging-only
fixtures; configure private TLS/secrets/backups and keep merchant payments, AI
and spending closed until separately authorized. No runtime wallet, policy,
one-shot evidence, guards or approvals were changed by this milestone.
