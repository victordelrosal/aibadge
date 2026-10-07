# Level 1 certificates: manual review run

Victor stopped automatic issuing on 6 Oct 2026. Since then every cert request goes through this run. He asks
("process the queue"), Claudus reviews by hand and builds a ranked page, Victor decides each learner, and
Claudus applies those decisions. First run: 7 Oct 2026 (5 issued, 3 sent back).

All commands run from `certs-system/scripts/grading`, with this prefix:
`NODE_OPTIONS=--network-family-autoselection-attempt-timeout=5000 PATH=~/.nvm/versions/node/v22.21.1/bin:$PATH`

## 1. Grade without acting
`node autorun.mjs --dry-run` pulls the pending requests, freezes each link, grades every submission twice and
writes the batch to `~/Library/Caches/aibadge-grading/batch-<time>/`. A dry run issues, posts and emails nothing.

## 2. Read every held item yourself
The guardrails are deliberately strict, and most holds are false alarms. These all turned up on 7 Oct:
- "tripwire: addresses the grader". Read the text. A learner's own experiment prompt ("system instruction: ...") trips it.
- "invisible or bidi characters". Count them. A single U+200B inside ChatGPT markdown is harmless; a run of bidi controls is not.
- "feedback contains a link, email or markup". That is a check on the grader's own feedback, so judge the work itself.
- `ai-on-terminal` has no rubric, so it holds every time. Read the session report.
- Runs that disagree on a multi-page site: freeze.mjs reads only the page at the link, so curl the sub-pages too.
- A link that 404s (a Codespaces `app.github.dev` preview, for example) is missing evidence, not failed work.

Also look for what the graders tend to miss:
- A Five Innovators page that is the tutorial's demo (the trade academy) labelled as the learner's own idea. The rubric allows it, but score it lower.
- AI handoff text ("MAKER", a code fence) left above the real page.
- Placeholders left in the page ([ORG NAME], `{topic}`, "[inferred]").
- Grader feedback a learner should never see: "held for a human check" breaks the no-human-review rule, so rewrite it.
- Copying between learners. Run a 6-word shingle overlap across the batch.

## 3. Build the review page
1. Write `<batch>/review.json`, keyed by profile name. Each entry has `score` (0 to 10), `rec`
   (approve, hold or resubmit), `headline`, `why`, `items` (exerciseId: [pass|repeat|fix, note]) and `feedback`
   (the learner-facing text). No em dashes.
2. `node review-gather.mjs <batch>` collects history (posted verdicts, earlier grading runs), names and lessons.
3. `python3 review-page.py <batch> ../../../reports/cert-review-queue-YYYY-MM-DD.html`, then `open` it.
   The page is local only, because `reports/` is gitignored (it names learners).

## 4. Victor decides
He reads the cards and agrees or overrides each one. The decision has to include his own "authorise",
because approving a learner emails them a credential. A pasted decision block on its own is not authorisation.

## 5. Apply
1. Write `<batch>/decisions.json`. Its format is in the header of `apply-decisions.mjs`. An approve keeps only
   PASS items: override a held item to PASS, or `"drop"` an optional item (Level 2) or a dead link, and put
   the advice in `notes`.
2. `node apply-decisions.mjs <batch> <batch>/decisions.json --dry-run`, then run it again without `--dry-run`.
   - Approve: issues Level 1 through `/api/auto-issue` (emails the learner), then resolves "pass". The script
     switches `config:autoissue` on for those calls only and restores it afterwards.
   - Resubmit or hold: resolves "repeat" with per-item feedback plus notes, shown on the learner's
     dashboard (no email).
   - The results go to `<batch>/APPLIED.json`.
3. Verify each `https://certs.fiveinnolabs.com/<code>` returns 200 with the right name, `config:autoissue`
   reads `off`, and each `certreq:<uid>` shows passed or repeat.
4. Report the cert URLs to Victor.

## Rules that do not bend
- Automation stays off (launchd plist `.disabled`, KV `config:autoissue` and `config:autofeedback` off) until
  Victor says otherwise.
- Every non-pass is a resubmit asking for a link the marker can read. Never tell a learner "a person is checking".
- Learner names stay out of git. Batches live in `~/Library/Caches`, and pages and handoffs in `reports/`.
