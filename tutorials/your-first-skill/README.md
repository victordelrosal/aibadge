# Tutorial PRD: Your First Skill

Lightweight notes for end-to-end recording. Not learner-facing. Companion lesson to `your-ai-team`.

## One-line pitch
Learners give one of their AI personas a reusable skill (a SKILL.md file) so the agent can run a real task the same way every time, on demand, without re-explaining.

## Why this lesson
Personas without skills drift. Skills without personas float. This lesson teaches the second half of the pattern: codify a repeatable task as a small markdown file the agent can be triggered to run. Closes the loop on **Tool Fluency** and introduces the mental model of agents-plus-procedures.

## Audience
Same as `your-ai-team`. Anyone who has finished Lesson 7 and has at least one persona file. Universal across roles.

## Learning outcomes
1. Distinguish persona (identity) from skill (procedure).
2. Use a guided interview to produce one well-formed SKILL.md.
3. Write a trigger description that actually fires the skill on real phrases.
4. Test the skill end-to-end in a chat with the matching persona loaded.

## Estimated duration
10 to 12 minutes recorded. Tighter than Lesson 7. Single skill, single take.

## Demo case (worked example for the video)
Heather, the same demo learner from Lesson 7. Pick her Scientist persona (e.g. "Aria"). Build the skill **weekly-funder-scan**: scan funders aligned to her cause, return a small ranked table.

## Master prompt artefact (already in this folder)
- `master-prompt.md` — the single copy-paste prompt learners run.

## On-camera flow (suggested)
1. **Hook (30s).** "Your AI team has personalities. Now give them recipes." Recall the persona/skill split: persona = WHO, skill = HOW.
2. **Persona/skill split (45s).** Two columns on screen. Left: persona file (identity). Right: skill file (procedure). One does not replace the other.
3. **Open the master prompt (20s).** Copy `master-prompt.md`. Paste into ChatGPT.
4. **Live interview (3 to 4 min).** Answer Q1 to Q5 as Heather. Paste Aria's persona for Q1. Keep answers short.
5. **The SKILL.md appears (1 min).** Scroll through. Save as `weekly-funder-scan.md` next to `aria.md`.
6. **Test the trigger (2 min).** New chat. Paste persona + skill. Say one of the trigger phrases verbatim. Watch the skill fire and produce the table.
7. **Trigger writing is everything (1 min).** Show one bad trigger ("a skill for funders") and one good trigger ("scan funders, what's open this week, any new grants"). Explain why the second wins.
8. **Close (30s).** "One persona, many skills. Build a backlog. Lesson 9 strings them together into a workflow." (If Lesson 9 is not yet on the roadmap, drop the last sentence.)

## Submission point (LMS)
- New `data-exercise-submission="your-first-skill"` on the lesson page.
- Submission artefact: a public link (Gist, Notion, GitHub Pages, Google Doc) containing one SKILL.md file plus a screenshot or transcript of it firing successfully when triggered.
- Pre-commit verification per `feedback_tutorial_scaffolding.md`: grep `data-exercise-submission`, `exerciseId`, `EXERCISE_ID` all match `your-first-skill`.

## LMS registration
In `aibadge/index.html`, add to `_lmsTutorials` after `your-ai-team`:
```js
{ id: 'your-first-skill', moduleId: 'your-first-skill', title: 'Your First Skill', icon: '🧰', iconBg: 'rgba(255,159,10,0.12)', level: 'beginner', durationMinutes: 11, type: 'video', lessonPath: 'tutorials/your-first-skill/your-first-skill.html' },
```

## Files to produce (when recording)
- `your-first-skill.pptx`
- `your-first-skill.pdf`
- `your-first-skill.mp4` (raw recording, local only if over 100MB)
- `your-first-skill.html` (LMS lesson page; clone from `five-innovators.html`, perl rename `fiv` → e.g. `yfs`)
- YouTube unlisted upload, paste video id into iframe.
- Whisper transcript, structured into the Transcript section.

## Open questions (resolve before recording)
- Show one chat tool only (ChatGPT) for clean flow, or split-screen with Claude to demonstrate cross-tool portability of the SKILL.md? Recommend single tool for simplicity, mention portability verbally.
- Should we suggest a starter list of "five common skills worth building" at the end, to seed Lesson 9 backlog? Probably yes, on the closing slide.

## Sequencing
- Direct companion to `your-ai-team`. Cannot land properly without Lesson 7 first.
- Sets up a possible Lesson 9 ("A Day in the Office") that chains multiple skills into a workflow.
