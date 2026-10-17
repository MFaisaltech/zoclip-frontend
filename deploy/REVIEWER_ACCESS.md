# Vercel private reviewer configuration — not applied

Owner selected WireGuard on2026-10-15; SSH is for operations. Follow
[VPN setup and verification](../../backend/docs/WIREGUARD_REVIEWER_ACCESS.md).
Reviewers use individual device keys and API-hostname→VPN-server-IP resolution,
not reviewer SSH accounts or localhost mappings.

Owner must approve team/project IDs and the reviewer roster before deployment.
Use project Settings → Deployment Protection → Vercel Authentication enabled,
scope **All Deployments**, Save. `vercel-protection.example.json` is the official
project-update request body for a separately approved operator/API workflow;
it is NOT a vercel.json build setting and is not applied by this repository.

Use project Viewer membership or individually approved Vercel access requests,
according to the owner's plan. Grant no deployment/settings permissions merely
to review the app. Confirm plan/seat/external-reviewer limits with the account;
no purchase is authorized. Disable share links, automation bypass credentials,
trusted-source exceptions, domain exceptions and OPTIONS allowlisting unless a
separate requirement is reviewed. No bypass secret is exposed to the browser.
Disable Toolbar injection and analytics for this private project.

Before reviewers enter, a signed-out client must be denied on the custom app
domain, generated deployment URL and prior deployment URLs. Then verify an
approved Vercel reviewer can enter, an unapproved user cannot, and removal revokes
access. Vercel access is separate from the WireGuard/private-network credential and
ZoClip invite. Only the first-admin invite grants ZoClip admin role; reviewers are
customers. Do not infer application identity/role from Vercel headers or cookies.

Reviewers first visit `/private-access` from the exact approved custom frontend
origin and explicitly check API reachability in their actual browser. A curl
probe or VPN handshake alone does not establish browser CORS/permission access.
Then open `/accept-invite#token=...` from the privately delivered invite, choose a
password, and sign in. Tokens never belong in query strings, Vercel settings,
source control, chat, analytics or ordinary logs. No automatic token consumption.

Revocation removes Vercel access, the individual WireGuard peer and ZoClip
reviewer access using the audited operator procedure, then verifies existing
sessions denied. Record owner roster approvals privately, not in this template.

Sources: [Vercel protection](https://vercel.com/docs/deployment-protection),
[Vercel authentication/access and official request body](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).
