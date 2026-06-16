# AI Badge Tutorials — Canonical Order

The order below is the proposed canonical sequence for the LMS. The `_lmsTutorials` array in `aibadge/index.html` is the single source of truth at runtime; this README is the planning view that includes lessons not yet recorded.

**Do not rename folders.** Each slug is referenced in multiple places: `lessonPath` in `_lmsTutorials`, `exerciseId` and `data-exercise-submission` inside each lesson HTML, `EXERCISE_ID` constants in inline submission JS, hardcoded asset paths, and cross-references between lessons. Folder names are stable identifiers, not positions.

When the order changes, update the `_lmsTutorials` array AND this README. Both, every time.

## Proposed canonical sequence (all 19 lessons)

| # | Folder | Title | Status | Duration | Level | Closes / Anchors |
|---|---|---|---|---|---|---|
| 01 | `ai-foundations/` | AI Foundations 101 | Planned | 13 min | beginner | AI Foundations L2-L3 |
| 02 | `hello-world/` | Hello World | Live | 7 min | beginner | Tech Building L2-L3 (build hook) |
| 03 | `hello-world-2/` | Hello World 2 | Live | 9 min | beginner | Tech Building (iteration) |
| 04 | `retro-game/` | Retro Game | Live | 12 min | beginner | Tech Building / Productive |
| 05 | `GitHub/` | Deploy to GitHub | Live | 11 min | beginner | Tech Building (deploy) |
| 06 | `evaluator-mindset/` | The Evaluator's Mindset | Planned | 15 min | beginner | Critical Eval L2-L3 + Tool Fluency L1 |
| 07 | `think-with-ai/` | Think With AI | Planned | 20 min | beginner | Critical Eval L4-L5 + Productive L3-L4. **Meta-lesson** |
| 08 | `eu-ai-act/` | EU AI Act in 20 Minutes | Planned | 20 min | beginner | Ethics & Governance L2-L3. **Credibility anchor** |
| 09 | `ai-interviews-you/` | AI Interviews You | Live | 15 min | beginner | Productive Creation |
| 10 | `five-innovators/` | The Five Innovators | Live | 24 min | beginner | Productive / Tool Fluency |
| 11 | `your-ai-workspace/` | Your AI Workspace | Live | 7 min | beginner | Tool Fluency / Productive |
| 12 | `your-ai-team/` | Your AI Team | Live | 19 min | beginner | Productive / Tool Fluency L4 |
| 13 | `your-first-skill/` | Your First Skill | Live | 17 min | beginner | Tech Building / Tool Fluency L4-L5 |
| 14 | `ai-for-real-work/` | AI for Real Work | Planned | 20 min | beginner | Productive Creation L2-L3 (docs/slides/data) |
| 15 | `power-tools/` | Power Tools | Planned | 17 min | beginner | Tool Fluency L2-L3 |
| 16 | `troubleshoot-with-ai/` | Troubleshoot With AI | Planned | 11 min | beginner | Cross-cutting (real-time companion) |
| 17 | `your-first-api-call/` | Your First API Call | Planned | 13 min | beginner | Tech Building L2 transition (optional) |
| 18 | `the-harness/` | The Harness | Live | 20 min | intermediate | **Level 2 (track 2)** · Context engineering / Tool Fluency L4-L5 |
| 19 | `ai-on-terminal/` | AI on the Terminal | Pending | 25 min | intermediate | Tech Building / Tool Fluency L4-L5 |

**Totals:** 10 Live, 8 Planned (PRD ready, folder ready, not yet recorded), 1 Pending (in array as `pending: true`, folder ready). Combined runtime ≈ 5h 10m self-paced. Distributed across the 6-week programme that's roughly 3 lessons per week between coaching check-ins.

## The pedagogical arc

The proposed sequence tells one story:

1. **Foundations & Build (01–05).** Understand the model, then build something today. Mechanics first so building is informed, not magical.
2. **Critical mind & ethics (06–08).** Once you can build, learn to evaluate, think with AI as a partner, and operate under regulation. The credibility spine of the badge.
3. **Personas & teams (09–13).** Day-to-day productive use. The "make AI part of your work" arc.
4. **Real-world application (14–16).** Documents, presentations, data, power features, real-time troubleshooting. Week 4 anchor and the "your own work" promise.
5. **Going beyond chat (17–18).** API direct, then terminal-native agents. The intermediate finale.

## Sequencing decisions (locked 2026-05-09)

After the full coverage audit (6×5 dimension/level matrix, 6-persona check, 7-line pricing-tier audit, named-feature cross-check), the four prior debates are resolved.

| Decision | Resolution | Confidence |
|---|---|---|
| `ai-foundations` placement | **Slot 01.** Mid-career / non-technical-leader audience responds better to "understand the technology of your career" than to "build a webpage." Vibe Coders self-select around lessons 02-05 anyway. | 88% |
| `eu-ai-act` placement | **Slot 08.** Lessons 06-07 (`evaluator-mindset` + `think-with-ai`) build the calibration mindset that makes regulatory content stick. Mark it visually in the LMS as a credibility anchor so it's unmissable. | 90% |
| `ai-for-real-work` placement | **Slot 14.** Sits naturally on the personas/teams scaffolding (lessons 09-13). PRD wording softened from "Week 4 anchor" to "Week 4-5 application arc." | 92% |
| Slots 17-18 framing | **Bonus / intermediate.** Badge's core arc is 01-16. Lessons 17-18 are for learners who want to push into developer territory after earning the badge. | 95% |

## Coverage audit (the bet-weights view)

The 18-lesson set delivers what the badge promises at the badge's actual target tier (entry L1, exit L2-L3 with stretch into L4 for operational dimensions). Audited against the explorer rubric, the six personas, the seven pricing-tier inclusions, and every named feature in the sales copy.

**Coverage at L2-L3 across all 6 dimensions: complete. Zero gaps.**

| Dimension | L2 | L3 | L4 | L5 |
|---|---|---|---|---|
| AI Foundations | ✓ | ✓ | out of badge scope | out of badge scope |
| Critical Evaluation | ✓ | ✓ | ✓ | ✓ |
| Productive Creation | ✓ | ✓ | ✓ | partial |
| Technical Building | ✓ | ✓ | ✓ | ✓ |
| Ethics & Governance | ✓ | ✓ | out of badge scope | out of badge scope |
| Tool Fluency | ✓ | ✓ | ✓ | ✓ |

The two L4 gaps (Foundations embeddings/RAG, Ethics organisational policy design) are deliberately out of scope for an "AI curious to AI fluent" badge — they belong to a future advanced/sequel programme. The sales copy does not promise them.

**All 6 explorer personas (Newcomer, Policy Person, Vibe Coder, The Academic, Practitioner, Architect) have a home lesson speaking to their highest-scoring dimension.**

**All 7 pricing-tier inclusions are accounted for** (assessment via `explore.html`, pathway via coaching, 6 coaching sessions delivered live, exercises via per-lesson submissions, recorded tutorial library = these 18 lessons, dashboard via `portal.html`, before/after report via the explorer + report system).

**Every named feature in the sales copy and every "what to focus on next" string the explorer report serves to learners maps to at least one lesson.**

## Bet-weights position: 96%

The 18-lesson set, once recorded and consumed in the proposed order, delivers what was promised to a paying learner (€285 tier) at the badge's target competency tier.

The remaining 4% accounts for:
- 2% production fidelity — PRDs are right; on-camera delivery depends on recording day.
- 1% on the L4 Foundations/Ethics positioning — defensible as "out of scope for this badge tier" only as long as the sales copy doesn't promise expert content.
- 1% on calibration for L4-L5 entry-level learners (Architect-tier from day one) — the tutorial library would feel beneath them; coaching carries that value.

## Production priority order (record in this order if not all 9 ship at once)

If Victor's recording capacity is finite (and it is — €2.5k MRR by 26 July is the real deadline), this is the order I'd ship:

1. **`eu-ai-act/`** — biggest credibility/liability gap. Closes the EU AI Act readiness mapping. Must exist for the badge to be honest.
2. **`ai-foundations/`** — highest pedagogical leverage. Unblocks every other lesson's "what to focus on next" recommendation.
3. **`think-with-ai/`** — highest cognitive leverage. Changes how learners use the rest of the badge. The retrospective move alone is worth the lesson.
4. **`evaluator-mindset/`** — soft-prerequisite for #3. Pairs cleanly.
5. **`ai-for-real-work/`** — Week 4 anchor. Closes Productive Creation named-task gap.
6. **`power-tools/`** — Tool Fluency completion.
7. **`troubleshoot-with-ai/`** — short, high-perceived-value, persona-broadening.
8. **`ai-on-terminal/`** — already pending, completes the intermediate arc.
9. **`your-first-api-call/`** — optional bonus, last to record.

Ship 1–4 and the badge is honest to its six-dimension promise. Ship all 9 and it's complete.

## Adding a new tutorial (checklist)

1. Create folder under `tutorials/{slug}/` with kebab-case slug (the folder name is the identifier — choose carefully, it lives forever).
2. Write a PRD `README.md` matching the structure of `your-first-skill/README.md` (14 sections: pitch → why → audience → outcomes → duration → demo case → master prompt → on-camera flow → submission → LMS registration → files to produce → open questions → sequencing).
3. Build `master-prompt.md` if the lesson uses one.
4. Record. Produce `{slug}.pptx`, `{slug}.pdf`, `{slug}.mp4`, `{slug}.html`.
5. YouTube unlisted upload via `~/.youtube-upload-credentials/upload_youtube.py`.
6. Whisper transcript, structured into the lesson page's Transcript section.
7. Add entry to `_lmsTutorials` in `index.html` at the chosen sequence position.
8. Update this README's tables.
9. Verify per `feedback_tutorial_scaffolding.md`: grep `data-exercise-submission`, `exerciseId`, `EXERCISE_ID` all match the new slug.
10. Commit selectively (avoid the mp4 if over 100MB — YouTube hosts the canonical copy). The cache-buster in `index.html` line 3971 handles propagation.

## Section order standard (inside each lesson HTML)

Quick Start → Detailed Step-by-Step Guide → (Deploy if shipping a webpage) → Submit Your Work → Troubleshooting → Video Transcript.
