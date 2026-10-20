# Capacity acceptance - inactive two-plan preview

Owner targets remain Creator PKR2,000 /3,700 credits and Pro PKR5,000 /9,500
credits. The local preview now uses the final owner-cost review instead of the
superseded lower-allocation table. It explains61/158 five-minute jobs, up to
183/474 conditional initial clips, unchanged quotes and capacity acceptance.

Activation is BLOCKED: available staging/local media is about25-27 seconds,
not representative5/30/120-minute inputs. The isolated staging diagnostic used
real extraction, Whisper and captioned rendering with explicitly mocked Gemini;
no real-provider end-to-end or monthly throughput claim is made.

The active pricing module, pricing/landing cards, dashboard/API catalog and
historical purchase views are unchanged. The preview remains dynamically gated
by ZOCLIP_PRICING_PROPOSAL_PREVIEW=1, otherwise404. No purchase actions,
subscription, credit grant, integration enablement or deployment is included.

Changed files:
- scripts/generate-pricing-proposal.mjs
- lib/pricing-proposal.ts
- components/pricing-proposal.tsx
- tests/browser/pricing-proposal.spec.ts
- docs/CAPACITY_ACTIVATION_2026-10-20.md

Verification:55 frontend API tests pass; TypeScript, lint, active/proposal
pricing generation checks pass. Production build/browser closeout below.
Full backend capacity/economics/protection evidence and remaining activation
conditions are in backend/docs/CAPACITY_ACTIVATION_2026-10-20.md.

Final closeout: production webpack build passed with minimum sampled free RAM
1,597MiB and unchanged guard. Browser preview-on3 passed/1 skipped, preview-off
1 passed/1 skipped (opposite flag branches). Desktop/mobile owner targets and
conditional clips passed; default proposal404 and active pricing/landing
unchanged. Temporary servers stopped. No deployment.
