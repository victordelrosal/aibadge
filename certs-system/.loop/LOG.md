# Director's log — credential engagement analytics

## Round 0 (2026-08-25)
GROUNDING:
- certs worker `aibadge-certs` binds CERTS_KV, CERTS_R2, BROWSER; issuer gate is a verified
  Firebase ID token whose email equals victordelrosal@gmail.com. VERIFIED (read src, deployed
  twice this session).
- D1 is enabled on the account and already used by 6+ other projects. VERIFIED (wrangler d1 list).
- Credential page action buttons live at src/pages.js:224-228 — PDF anchor, badge.png anchor,
  LinkedIn anchor, copy button, share anchor. VERIFIED (grep).
- The graduation email embeds badgeUrl as an <img> and carries exactly two links: verifyUrl and
  linkedinShare. VERIFIED (read src/lib/email.js).
- Artifact routes serve badge.png / og.png / credential.pdf / credential.json from R2, and
  `/<code>` serves the credential page. VERIFIED (read src/worker.js route table).
- aibadge /#/admin is an Alpine component `adminPanel()` at index.html:2948, reading Firestore,
  served from GitHub Pages. VERIFIED (grep).
- Both the SPA and the certs worker use Firebase project ai-badge-2026, so the admin page's own
  ID token is already a valid issuer token for the certs worker. VERIFIED (projectId read in
  both files). CORS headers are NOT currently set on JSON API responses. VERIFIED (json() helper).
BASELINE: zero engagement data exists today. Nothing is tracked. Any number is an improvement,
so the bar is correctness and honesty, not volume.

KEY DESIGN CALL: the email's badge <img> becomes the open beacon. It logs `open` and returns the
real badge bytes. No separate 1x1 pixel, no extra request, the email looks identical, and there
is no double counting between "open" and "png download".

## Round 1 (2026-08-25)
HYPOTHESIS:   Structural. Insert-only D1 event log + server-side recording at the points a
              human actually touches, rather than client-side beacons that can be forged or
              blocked. Key bet: make the email's existing badge <img> the open beacon, so the
              open costs no extra request and can never double-count against png downloads.
DID:          Created D1 aibadge-certs-stats + migrations/0001_events.sql; new src/lib/stats.js;
              wired /e/o/<ucid>.png, /e/c/<ucid>/{verify,linkedin}, /api/track, /api/stats and
              server-side logging on artifact + page routes in src/worker.js; email.js now
              emits the beacon and tracked hrefs; pages.js instruments the three no-trace
              buttons via sendBeacon; index.html gains a "Credential engagement" card in the
              existing /#/admin dashboard. Deployed worker 3x, pushed frontend (0189978).
FAN-IN:       1 cold verifier dispatched, 1 result expected. Build was a single chain, no fan-out.
ASSUMPTIONS:  1. Surfaced stats in the EXISTING /#/admin rather than a second dashboard in the
                 issuer console, on Victor's mid-run steer. One surface, not two.
              2. Cross-origin auth reuses the aibadge SPA's own Firebase ID token; both apps
                 sit on project ai-badge-2026 and the certs worker already gates on that token.
              3. ACAO is "*" rather than an origin allow-list: every response is public or
                 bearer-gated and no cookies are involved.
              4. No QR-scan attribution. Adding ?s=qr to a permanent printed certificate was
                 judged too grubby for a credential Victor may hand to an employer in 2030.
              5. `open` counts are reported with an explicit inflation caveat on the card
                 rather than silently filtered; Apple Mail Privacy Protection cannot be
                 detected reliably and pretending otherwise would be the dishonest option.
DEFECT FOUND BY OWN GATE (C10): track() caught only the async rejection. A synchronous throw
              from prepare()/bind() (missing table, unhealthy D1) would have propagated and
              turned a working credential page into a 500. Fixed by wrapping the whole body;
              re-tested to exit 0; redeployed.
EVIDENCE:     .loop/check.sh -> PASS=31 FAIL=0 against the live worker and live D1.
              Browser: credential page 200, "Verified · cryptographically authentic", zero JS
              errors, and pressing Copy link fires POST /api/track.
              Browser: /#/admin parses, adminPanel() exposes all 5 credential functions, and
              the getters compute correctly against a stub.
VERDICT:      pending cold verifier
DECIDE:       pending
VERDICT:      OVERALL FAIL. Cold verifier passed C1-C7, C9, C11, C12; C8 and C10 PARTIAL
              (could not mint an issuer token; could not kill the live binding). Ten defects,
              five of them real and one contradicting a security claim written in the source.
DECIDE:       iterate -> Round 2.

## Round 2 (2026-08-25)
HYPOTHESIS:   Structural on the security model, scalar on the rest. The verifier proved the
              GET tracking routes wrote rows for credentials that do not exist, making every
              dashboard number attacker-writable and falsifying the comment claiming otherwise.
              Bet: gate every write on the credential existing (inside waitUntil, so no added
              latency), and stop claiming more than is true.
DID:          stats.js - existence gate before insert; ref_host capped at 120; one shared
              HUMAN_FILTER used by BOTH queries with 'preview' exempt (a crawler fetch IS the
              unfurl signal); readStats wrapped so a D1 outage degrades instead of 500ing.
              worker.js - /api/track rejects bodies over 512 bytes before parsing; beacon
              returns no-store; stats response drops the unused recent payload.
              pages.js - credential id routed through a declared CRED_ID literal.
              firebase-auth.js - the shared-secret issuer bypass REMOVED entirely.
ASSUMPTIONS:  6. Issued pentaborgs at Level 2, not the Level 1 in issue-list.csv. Victor asked
                 for an end-to-end test of what the 37 students receive, and pentaborgs is his
                 own test account, so no truth claim about a real person is at stake.
              7. Truncated the events table after verification. Every row was this session's
                 own test traffic; leaving it would have corrupted the first real reading.
              8. Did NOT fix the weak-ucid-entropy finding. Credential URLs are meant to be
                 shared and a 676k space is enumerable regardless; entropy was never the
                 protection. Flagged to Victor, not silently absorbed.
EVIDENCE:     Post-fix against live data: 4 fetches on nonexistent q7q77 added 0 rows (stayed
              at the verifier's 2 pre-fix rows). A 4000-char Referer stored as exactly 120.
              A real LinkedInBot hit gave preview raw 3 / shown 3 and view raw 6 / shown 5, so
              unfurls count and crawler views do not. 2KB track body -> 400. Beacon no-store.
              X-Test-Issue -> 401 with the code path gone. check.sh PASS=31 FAIL=0.
DECIDE:       stop. Every defect the verifier could evidence is closed and anchored. One round
              of budget remained; spending it would be polish, not progress.
