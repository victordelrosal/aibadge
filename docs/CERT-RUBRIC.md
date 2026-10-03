# AI Badge — Level 1 Marking Rubric

- **Owner:** Lars. Refine as cohorts show where the line really is.
- **Read by:** the `aibadge-review` marking loop, as the single source of "meets the bar".
- **Companion:** `CERT-REVIEW-SOP-AND-DESIGN.md`.

---

## The bar (one sentence)

**Pass = the learner genuinely did the thing the exercise teaches, in their own work, at basic working competence.** Not perfection. Evidence of real engagement and a working artifact. When in doubt, escalate — do not fail silently and do not pass to be kind.

## Confidence calibration (what Lars stages per exercise)

- **HIGH pass (≥90%)** — clearly their own work, the artifact works, the skill is demonstrated. Stage *recommend approve*.
- **MEDIUM (60–89%)** — probably fine but something is thin, generic, or ambiguous. **Escalate to Victor** with the specific doubt.
- **LOW / fail (<60%)** — empty, copied, off-task, or unsafe. **Escalate** with the reason; default outcome is coach-to-resubmit.

A learner is **recommend-approve only if every required exercise is HIGH.** One MEDIUM anywhere → the whole learner escalates.

**Autonomous Level 1 policy v1.1 (3 Oct 2026, `autorun.mjs`):** an exercise passes when two independent no-tool runs both say PASS at HIGH or MEDIUM, each evidence quote is found verbatim, injection is not suspected and no tripwire fires. LOW, disagreement or any failed check holds the learner and reports to Victor. Every credential is revocable.

## Universal auto-escalate / auto-fail triggers (any exercise)

- Empty or near-empty submission.
- Copied verbatim from the tutorial's sample/solution (no personalisation).
- Obviously AI-generated boilerplate with no sign the learner engaged.
- Anything the **safety scan** flags: `<script>` calling out to suspicious domains, obfuscated/minified-to-hide code, `eval`/`Function(...)` on remote strings, crypto-miner patterns, credential/keylogging patterns, links to malware/phishing, illegal or NSFW content. Flag to Victor regardless of mark — never execute to test it.

---

## Per-exercise criteria (Level 1 · Foundations, track 1)

Updated 3 Oct 2026 to match the LMS: only five Level 1 lessons have a submission point. The other four (Hello World, Hello World 2, Retro Game, Deploy to GitHub) are satisfied by completion. A learner qualifies when all nine Level 1 lessons are complete AND at least one build artifact (`ai-interviews-you` or `five-innovators`) is submitted and passes; any other submission that is present must also pass. A lesson completed without a submission counts as completion only.

Submissions arrive as live links and are frozen to plain text before marking: a deployed page becomes its title and visible text; a chat share becomes the rendered conversation, including the chat app's own menu text, which you ignore.

| Exercise (id) | What a PASS looks like |
|---|---|
| AI Foundations 101 (`ai-foundations`) | A real conversation or quiz where the learner answers questions about how models work (tokens, temperature, hallucination, context window) in their own words. Wrong answers are fine; engagement is the bar. |
| AI Interviews You (`ai-interviews-you`) | A deployed personal page (portfolio, CV or profile) built from the AI interview: their real name, real background, real specifics. Not a template with placeholder text. |
| The Five Innovators (`five-innovators`) | A deployed landing page for a product idea with the tutorial's structure (hero, three reasons, a qualifier). Following the tutorial's worked case (family finance, Money Smarts) is fine if the copy is their own; their own idea is stronger. |
| Thinking Partner (`thinking-partner`) | A conversation where the learner uses AI to pressure-test their own idea, plan or question, with substantive back-and-forth on something specific to them. |
| The EU AI Act (`eu-ai-act`) | An audit or analysis of one real AI workflow against the EU AI Act, with the learner's own answers about their own use case. |

**Level 2 (track 2: OpenCode, Your AI Workspace/Team/First Skill)** is optional and **not required** for the Level 1 certificate. When the Level 2 cert opens (17 June 2026), extend this rubric with its build exercises (e.g. "Your First Skill" = a working skill the learner authored).

---

## Notes for the marker

- Mark the **frozen text** of the submission, never a live link.
- "Their own work" is judged generously: beginners reuse tutorial scaffolding — that's fine. The fail case is *no engagement*, not *imperfect work*.
- Personalisation is the strongest pass signal: any sign the learner made it theirs (their content, their tweak, their voice).
- Keep a one-line justification per exercise so Victor can sanity-check an approval in seconds.
