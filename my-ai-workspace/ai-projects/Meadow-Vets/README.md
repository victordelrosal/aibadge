# Meadow Vet Care — customer chatbot (class demo)

**Live:** https://meadow-vets.pages.dev

H9CEAI class demo: a customer chatbot that answers real questions from the clinic's
live data. This is the MCP idea in miniature: the LLM is given a **live tool**.

## How it works (the teaching diagram)

1. **Front end** (`public/index.html`): a single-file chat page. Sends the conversation
   to `POST /api/chat`.
2. **The brain** (`public/_worker.js`, Cloudflare Pages advanced-mode Worker): calls
   Claude (`claude-sonnet-5`) with one tool defined: `get_clinic_services`.
3. **The live tool**: when Claude decides it needs clinic data, it calls the tool;
   the Worker fetches the clinic's Google Sheet as CSV
   (60s cache), optionally filtered by species/category, and hands the rows back.
4. Claude reads the rows and replies in natural language. The UI shows a chip:
   "Checked the live clinic sheet · N rows" so the class can SEE the tool fire.

Edit the Sheet in class → ask again → the answer changes. That's the demo.

- Sheet: https://docs.google.com/spreadsheets/d/1JhSODtviGHzXru6Eb5MhfXfVIF5vtJk3pclzzv7j2l4/edit
- `data-snapshot.csv` is a reference snapshot of the sheet (2026-07-14), not used at runtime.

## Test questions (from the slide, all verified live 2026-07-14)

- What dog services do you offer?
- Are there any offers on microchipping?
- Do you have telehealth services?

Prices are reported EXACTLY as the sheet has them (dog consult €550, dog telehealth
€2300 — deliberate odd values that prove the answers come from the sheet, not the
model's imagination; the system prompt forbids "correcting" them).

## Deploy

```
npx wrangler pages deploy        # uses pages_build_output_dir = public
```

Secret (set once; bound on next deploy):

```
printf '%s' 'sk-ant-...' | npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=meadow-vets
```

`.dev.vars` holds the key for local `npx wrangler pages dev public` (gitignored).
Note: the key that was in `aibadge-l3/.dev.vars` is dead (401); this project uses the
key from `sBs/eBooks/.env` (verified 200 on 2026-07-14).

## Guardrails

- Answers only from the sheet; no medical advice (recommends a consult / emergency line).
- Tool loop capped at 3 rounds; 20 turns, 2k chars per message sent upstream.
