WHAT:         Engagement analytics for issued AI Badge credentials: email opens, email link
              clicks, credential page views, PDF/PNG downloads, LinkedIn share, copy link,
              social-preview scrapes. Stored on Cloudflare D1, surfaced in the EXISTING
              aibadge /#/admin dashboard.
WHY:          Victor is about to issue 39 credentials and expects 10-15%+ of holders to post
              them on LinkedIn. That wave is his best organic marketing of the year and he
              currently has zero visibility into it. He also wants to know which students
              engaged at all, which is pastoral as much as commercial.
WHO:          Victor, as sole issuer and admin. Not the students, not the public.
CRITERIA:     12 binary tests, see CRITERIA.md
PRD:          no (single feature inside an existing system)
FLEET:        director+builder (Claudus, opus/drive) owns C1-C12 build;
              cold-verifier (opus/drive, fresh context) owns the verdict on all 12.
              No fan-out: fake-edge test found no two workstreams that can run concurrently,
              because worker.js is a hidden edge shared by nearly every one of them.
EDGES:        D1 schema -> tracking endpoints -> email/page instrumentation -> stats API ->
              admin UI. All real edges; each consumes the prior artifact. It is a chain.
LOOP BUDGET:  3 rounds
EXIT:         Victor can open /#/admin and see, per credential, who opened the email, who
              clicked through, who downloaded, who shared, with the open-rate caveat stated
              on the page rather than buried.
DOWNGRADES:   C9 (CORS from the admin origin) may fall back to a stats view inside the issuer
              console if cross-origin auth proves unworkable. Nothing else may be relaxed;
              C7 (no raw IP) is not downgradable under any circumstances.
