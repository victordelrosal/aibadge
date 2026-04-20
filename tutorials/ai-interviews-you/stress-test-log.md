# AI Interviews You — Prompt Stress Test Log

Running the v1 prompt against 12 diverse learner personas, mentally simulating LLM behaviour on each, logging failure modes, patching the prompt, and locking a v2.

## Test personas

| # | Persona | Answers given |
|---|---------|---------------|
| 1 | AI Executive (Victor) | a, b, CV upload, a |
| 2 | Software engineer at a startup | a, c, types 2 sentences, d |
| 3 | Unemployed graphic designer (job-hunting) | a, b, uploads portfolio link, b |
| 4 | Stay-at-home parent writing a novel | c, d, "I write YA fiction from home", d |
| 5 | PhD student in climate science | e, c, typed paragraph, a |
| 6 | Volunteer coordinator at nonprofit | c, d, types 1 sentence, c |
| 7 | Retired woodworker (hobby) | d, d, types full paragraph, e |
| 8 | 17-year-old self-taught coder | a, b, "I build bots on Discord", e |
| 9 | C-suite executive | a, c, LinkedIn screenshot upload, a |
| 10 | Non-native English speaker, short Spanish answers | "a", "a", one-line Spanish, "b" |
| 11 | Snarky user with generic input | "a", "a", "I do stuff", "d" |
| 12 | User uploads CV on Q1 (wants everything auto-filled) | CV upload, -, -, - |

## Failure modes observed (v1 prompt)

| Tag | Failure | Occurs in |
|-----|---------|-----------|
| F1 | User picks `(f) Other` without specifying — AI may ask "other what?" | 11 |
| F2 | AI prepends "Sure, let's start!" despite "Do not greet" | 1, 9 |
| F3 | Q3 too thin ("I do stuff") → Brief becomes marketing-flavoured fiction | 11, 6, 8 |
| F4 | Non-English user gets English Brief, awkward bilingual mush | 10 |
| F5 | User replies with a question ("what do you mean by focus?") — AI abandons interview | 4, 7 |
| F6 | Early upload (Q1) — AI only uses it for Q1, re-asks Q2/3/4 from scratch | 12 |
| F7 | User says "I don't know" on Q3 — Brief hollow | 6, 8 |
| F8 | [inferred] fields invent specifics (numbers, client names) not in input | 3, 5, 9 |
| F9 | Brief reads like LinkedIn spam ("award-winning, industry-leading…") | 9, 1 |
| F10 | No invitation to correct the Brief — user must guess how to edit | all |
| F11 | URL link (LinkedIn) can't be fetched by chat UI — AI stalls | 3 |
| F12 | Multiple uploads in one turn confuse the AI | 9 |

## Patch list (v1 → v2)

| Patch | Fixes | Change |
|-------|-------|--------|
| P1 | F1 | If answer is just `f` with no specification, silently pick the best-fitting lettered option instead |
| P2 | F2 | "Start your FIRST reply with Question 1. No preamble, no 'Sure', no 'let's begin'." |
| P3 | F3, F7 | "If my Q3 answer is one sentence or less, infer the rest from Q1+Q2 context — never invent achievements, client names, numbers, dates, or awards not present in my input." |
| P4 | F4 | "If I reply in a language other than English, mirror my language for all remaining questions and the Brief. Do not translate my words." |
| P5 | F5 | "If I reply with a question instead of an answer, answer it in ONE short line, then re-show the same question in full." |
| P6 | F6 | Upload on ANY question pre-fills all subsequent questions where possible; still show each later question so I can override with a letter. |
| P7 | F8 | "`[inferred]` must only flag things you can defend from my inputs or uploads. Do NOT fabricate specifics." |
| P8 | F9 | "The Brief must sound like me, not generic marketing. Avoid superlatives I did not use (no 'award-winning', 'industry-leading', 'cutting-edge') unless they appear in my input." |
| P9 | F10 | After the Brief, add ONE line: `Reply 'build' when you want the page, or correct any field and I'll update.` |
| P10 | F11 | "If I paste a URL you cannot open, say one line: 'I can't open links — paste the content or upload a file.' Then wait." |
| P11 | F12 | "If I upload multiple files at once, use all of them together as one combined input for Q3 and for any MCQ inference." |

## Iteration decisions

- v1 had follow-ups allowed once. v2 keeps ZERO follow-ups — inference wins.
- v1 mixed MCQ + open. v2 keeps the same 4-question structure (3 MCQ + Q3 open-or-upload). Shortening further loses brief quality.
- Considered dropping Q4 (can be inferred from Q2). Kept — it drives the CTA and hero framing, which materially changes the page design.
- Considered adding a 5th question for tone. Rejected — tone is better inferred from Q2+Q3 than self-declared.

## Verdict

**v2 = v1 + patches P1–P11.** Locked below and in `ai-interviews-you.md`.
