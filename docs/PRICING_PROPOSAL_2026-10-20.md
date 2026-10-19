# Inactive two-package pricing review

The owner proposed Creator Rs. 2,000/3,700 credits and Pro Rs. 5,000/9,500 credits.
Those amounts failed the existing 60% scenario margin. The owner requested review
of lower allocations before activation; no alternative is approved yet.

The current deployed catalog/page is unchanged. No frontend deployment was made.
Only a local review page was added: `/pricing/proposal`, returning 404 unless
`ZOCLIP_PRICING_PROPOSAL_PREVIEW=1`. It shows two paid cards, the failed original
proposal and conditional lower options 191/486 or 61/155. Its no-purchase warning
is explicit; trial behavior, account balances, dashboard and history are unchanged.

Generate/check this review module with:

```text
node scripts/generate-pricing-proposal.mjs
node scripts/generate-pricing-proposal.mjs --check
```

Backend `deploy/pricing-proposal-20261020.json` and
`deploy/pricing-economics-20261020.json` are the only sources. The generator never
replaces `lib/pricing-catalog.ts` or changes live terms. Targets 61/158 for the
original failed proposal use the backend quote engine's five-minute/one-output/
no-edit 60-credit assumption. They are conditional targets, never guarantees.
Lower review targets are 3/8 or 1/2 on the same assumption. No bonus is added.

Test evidence: 55 frontend unit cases pass; preview-enabled desktop/mobile and
unchanged active-pricing browsers 3 pass/1 skip; preview-disabled closure 1 pass/
1 skip. The skips deliberately select the opposite environment-flag branch.
Typecheck, focused lint and production build with preview off pass. No user
credentials, real API mutations, paid calls or payment activation are involved.

Files: `app/pricing/proposal/page.tsx`, `components/pricing-proposal.tsx`,
`lib/pricing-proposal.ts`, `scripts/generate-pricing-proposal.mjs`,
`tests/browser/pricing-proposal.spec.ts`, this document.

Activation remains blocked pending a specific allocation decision and defensible
cost/account-rate/payment-fee evidence. Future activation must switch backend and
frontend together, preserve immutable old order/entitlement terms, verify a fresh
recoverable backup and retain VPN/Vercel/public-AI/payment protections. See backend
`docs/PRICING_REVIEW_2026-10-20.md` for exact arithmetic and actual live state.
