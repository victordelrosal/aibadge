# Tutorial PRD: Your AI Team

Lightweight notes for end-to-end recording. Not learner-facing. Mirrors the production pattern of `tutorials/five-innovators/`.

## One-line pitch
Learners build their own private team of five AI personas (Scientist, Designer, Maker, Communicator, Manager) tailored to their own life and work, by pasting one master prompt into ChatGPT, Claude, or Gemini.

## Why this lesson
Lesson 6 (Five Innovators) gave learners four generic agents to ship a product launch. This lesson upgrades the generic agents into sui generis personas the learner actually wants on their team. Closes a gap in **Productive Creation** and seeds the next lesson on Skills.

## Audience
Universal: solopreneur, non-profit lead, teacher, parent, student, retiree, employee. The interview is deliberately context-free so the prompt works for any role.

## Learning outcomes
1. Understand the Five Innovators Framework as a system of five complementary roles.
2. Run a guided interview that produces five personalised AI personas in markdown.
3. Generate matching LinkedIn-style headshots for each persona.
4. Save and deploy each persona as a Custom GPT, Claude Project, Gemini Gem, or system prompt.

## Estimated duration
12 to 15 minutes recorded. Single demo, single take ideal.

## Demo case (worked example for the video)
Heather O'Malley. Use her real-ish profile (non-profit founder, fundraising and programme delivery, warm tone) so the personas come out distinctive on camera. Save the five demo files into `img/` or a public folder for screenshots.

## Master prompt artefacts (already in this folder)
- `master-prompt.md` — the single copy-paste prompt learners run.
- `headshot-prompt.md` — standalone image-generation template (the master prompt also embeds a headshot prompt inside each persona file, so this is optional).

## On-camera flow (suggested)
1. **Hook (30s).** "Most people use AI like a vending machine. Today you build a team." Show the five archetype names on screen.
2. **Frame the framework (60s).** Quick visual of the five archetypes from `VdR/frameworks/five-innovators-framework.md`. One sentence each.
3. **Open the master prompt (30s).** Click copy on `master-prompt.md`. Paste into ChatGPT (or pick the model on screen).
4. **Live interview (3 to 4 min).** Answer Q1, Q2, Q3 as Heather. Keep answers short and real. Accept the model's offer to name the team.
5. **Five personas appear (2 min).** Scroll through them on camera. Save each fenced block as `{firstname}.md`.
6. **Headshots (2 to 3 min).** Open ChatGPT image (or Gemini Nano Banana). Use either the embedded headshot prompts or `headshot-prompt.md`. Generate five portraits side by side.
7. **Deploy one (1 to 2 min).** Open Claude Projects (or Custom GPTs). Paste one persona as system prompt. Ask it a question. Show it answering in the persona's voice.
8. **Close (30s).** "Tomorrow, we teach this team a skill. That is Lesson 8."

## Submission point (LMS)
- New `data-exercise-submission="your-ai-team"` on the lesson page.
- Submission artefact: a public link (Gist, Notion, GitHub Pages, Google Doc) containing the learner's five persona files plus their five headshots.
- Pre-commit verification per `feedback_tutorial_scaffolding.md`: grep `data-exercise-submission`, `exerciseId`, `EXERCISE_ID` all match `your-ai-team`.

## LMS registration
In `aibadge/index.html`, add to `_lmsTutorials` after `five-innovators`:
```js
{ id: 'your-ai-team', moduleId: 'your-ai-team', title: 'Your AI Team', icon: '👥', iconBg: 'rgba(94,200,229,0.12)', level: 'beginner', durationMinutes: 14, type: 'video', lessonPath: 'tutorials/your-ai-team/your-ai-team.html' },
```

## Files to produce (when recording)
- `your-ai-team.pptx` (slides)
- `your-ai-team.pdf` (export)
- `your-ai-team.mp4` (raw recording, local only if over 100MB)
- `your-ai-team.html` (LMS lesson page; clone from `five-innovators.html`, run perl rename `fiv` → some new prefix, e.g. `yat`)
- YouTube unlisted upload, paste video id into iframe.
- Whisper transcript, structured into the Transcript section.

## Open questions (resolve before recording)
- Will learners use ChatGPT, Claude, Gemini, or all three on camera? Pick one for the demo (recommend ChatGPT for widest reach), mention the others work too.
- Image gen choice: ChatGPT image, Gemini Nano Banana, or both shown? Suggest one to keep flow tight.
- Does the LMS lesson page need a worked-example PDF of Heather's five personas? Probably yes, in `img/` for screenshots.

## Sequencing
- Comes after `five-innovators` (Lesson 6).
- Direct prerequisite for `your-first-skill` (companion lesson).
