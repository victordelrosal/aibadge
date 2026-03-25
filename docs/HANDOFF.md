# AI Badge Project: Handoff Document

**Date:** 2026-03-25
**Author:** Claudus (session handoff)

---

## What This Project Is

AI Badge is an AI competency assessment tool. Users self-rate across 6 dimensions (AI Foundations, Critical Evaluation, Productive Creation, Technical Building, Ethics & Governance, Tool Fluency) on a 1-5 scale, then receive a personalized competency report via email.

**Live at:** https://aibadge.fiveinnolabs.com/
**Repo:** https://github.com/victordelrosal/aibadge.git

---

## Architecture Overview

### Frontend (Static, Firebase Hosted)
- **`index.html`**: Marketing landing page with 3D badge hero, "Why Now" section, navbar
- **`explore.html`**: The assessment tool. Single-page app with sliders, radar chart, real-time scoring, report generation, and email submission

### Email Pipeline
- **`worker/index.js`**: Cloudflare Worker deployed at `aibadge-report-mailer.victordelrosal.workers.dev`. Receives POST with assessment data, sends formatted HTML email via Resend API
- **`worker/wrangler.toml`**: Config for the worker. `FROM_EMAIL` set to `AI Badge <victor@fiveinnolabs.com>`
- **Resend account**: Uses the **fiveinnolabs** Resend account (not victordelrosal). Domain `fiveinnolabs.com` is verified there. API key stored as Cloudflare secret `RESEND_API_KEY`

### Backend (Firebase)
- **Firebase Hosting**: Serves static files from project root
- **Firestore**: Stores assessments in `publicAssessments` collection
- **`functions/`**: Contains a Cloud Function (`sendReport`) that was built but **never deployed** because Victor's billing account hit the max linked project quota for Blaze plan. The Cloudflare Worker replaced this. The functions/ directory can be cleaned up or kept for future use.

### Key Files
| File | Purpose |
|------|---------|
| `explore.html` | Assessment tool (all logic is inline JS/CSS) |
| `index.html` | Landing page |
| `worker/index.js` | Cloudflare Worker email sender |
| `worker/wrangler.toml` | Worker config |
| `functions/index.js` | Unused Firebase Cloud Function (email sender) |
| `firebase.json` | Firebase hosting + Firestore config |
| `firestore.rules` | Firestore security rules |
| `assets/img/arrow.avif` | Hand-drawn arrow hint image |
| `assets/img/radar-preview.png` | Static radar chart for landing page |

---

## How the Report System Works

### The Permutation Problem
6 dimensions x 5 levels = 15,625 possible score combinations. Solved with a **compositional approach**:

1. **`DIM_REPORT`** object: Per-dimension narratives (strength description + growth recommendation) for each of 5 levels, for all 6 dimensions
2. **`detectPatterns(v)`**: Cross-dimension pattern detection (risk flags, strengths, opportunities, info notes)
3. **`generateRecommendations(v)`**: Personalized next-step guidance based on dimension scores
4. **`FRAMEWORK_INFO`**: Maps scores to 6 industry frameworks (UNESCO, Turing Institute, DigComp 3.0, SFIA 9, EU AI Act, OECD/EC AILit) with full verbose descriptions

### Email Flow
1. User fills sliders, enters email, clicks Submit
2. `submitEmail()` generates plaintext report + HTML report
3. `Promise.allSettled` fires two parallel calls:
   - Firestore save (`savePublicAssessment`)
   - Cloudflare Worker POST (which calls Resend API)
4. On completion, shows confirmation with rendered HTML report on-page
5. If user changes sliders after receiving a report, `resetReportGate()` re-enables the submit button

### Email Template
The Worker builds a table-based HTML email (for client compatibility) with:
- Score circle (CSS border trick, no images)
- Dimension bar charts (table-based)
- Flag/observation cards
- Full report text (HTML-escaped)
- Coaching CTA button

---

## Styling Notes

- **Gold-gradient 3D cards**: All `.card` elements use a "delicious" gold-gradient look with inset highlights, hover lift, active press. Dark and light mode variants exist.
- **Brand colors**: Navy `#000036`, Gold `#D4AF37`, background `#f5f5f7`
- **Slider hint**: Hand-drawn arrow + handwritten text ("Adjust sliders to explore!") positioned above the Dimensions card with `margin-left: 130px`
- **3D badge**: Three.js hexagonal prism in the hero section of index.html

---

## Deployment

### Frontend
```bash
firebase deploy --only hosting
```

### Cloudflare Worker
```bash
cd worker
npx wrangler deploy
```
The Resend API key is already set as a secret on Cloudflare (`RESEND_API_KEY`). If it needs updating:
```bash
npx wrangler secret put RESEND_API_KEY
```

---

## Known Issues / Future Work

1. **`functions/` directory**: Contains unused Cloud Function code. Can be removed or kept if Victor gets Blaze plan sorted
2. **Calibrated assessment**: Was removed this session. The original had 12 calibration questions. Code was fully stripped out but could be re-added later
3. **Email domain**: Must use fiveinnolabs Resend account (not victordelrosal) since that's where the domain is verified
4. **Firebase Blaze plan**: Victor's billing account has hit max linked projects. Cloud Functions won't deploy until this is resolved

---

## Git State

- Branch: `main`
- Remote: `origin/main` (up to date)
- `.gitignore`: covers `node_modules/`, `.DS_Store`, `*.log`
- Clean working tree (except `.DS_Store` files and `docs/logs/`)

---
*Written 2026-03-25 by Claudus for future instance continuity.*
