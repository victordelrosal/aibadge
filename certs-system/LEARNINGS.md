# LEARNINGS — aibadge certs-system

- A tracking endpoint reachable by URL is forgeable by anyone who can fetch the URL. The only
  real defence is refusing to write rows for ids that do not exist; say that plainly in the
  code rather than claiming the counts are trustworthy. [2026-08, cold verifier wrote rows for
  a nonexistent ucid q7q77 via GET /e/o/ and /e/c/]
- Any comment asserting a security property is a claim a verifier will test. Write the property
  you actually implemented, not the one you intended. [2026-08]
- Two aggregate queries over one table must share one filter constant, or the summary tiles and
  the detail grid will silently disagree. [2026-08, per-credential query filtered bots while
  totals did not; phantom rows inflated only the tiles]
- A bot filter must exempt events that are BY DEFINITION bot-generated. A social unfurl is a
  crawler fetch; filtering crawlers made a shared badge read as never shared. [2026-08]
- Fire-and-forget must wrap the WHOLE call, not just the promise: D1 prepare() and bind() throw
  synchronously when the table is missing, which would 500 the credential page. [2026-08,
  caught by the run's own C10 stub test before the verifier saw it]
- Cap every attacker-controlled string before it reaches a column. An unbounded Referer
  hostname stored 7012 characters on an unauthenticated GET. [2026-08]
- A dormant auth bypass is a live risk the moment the endpoint behind it starts returning PII.
  The alpha test hook was harmless until /api/stats began returning names and emails. [2026-08]
- `wrangler d1 execute --json` piped through a shell helper function can silently return empty
  while the same command run directly returns data. When a counter reads ERR everywhere,
  suspect the helper before the database: ERR==ERR briefly read as a PASS. [2026-08]
- The pretooluse secret-scan hook scans the whole working tree when nothing is staged, and
  false-positives on DELETED lines that merely name a credential variable. Stage the real files
  in their own command first, because a compound `git add ... && deploy` is blocked before the
  add ever runs. The hook also matches its trigger words inside ordinary prose, so write
  documentation with the file tool rather than a shell heredoc. [2026-08]
- Every AI Badge PDF is one page. A page count derived from `/Type /Page` also matches the
  `/Pages` tree object and reports 2. Count via the `/Count` field on the Pages object.
  [2026-08, a wrong regex produced a wrong claim to Victor that had to be corrected]
