# cold-verify.md — 🟡 Margot, re-tasked as COLD VERIFIER

> **Round 2 resolution (Purple Manager, after the verifier's DO-NOT-SHIP):** the catch was
> real and is now fixed. The `site/` folder is committed (`85bca83`) and the page is LIVE at
> **https://aibadge.fiveinnolabs.com/my-ai-workspace/ai-projects/FlexHaus-gym/Variation2/site/**
> (verified `HTTP 200`; headless render of the live URL: `__inkwell3D=true`, 46 frames, 0
> console errors, not flat). The `<title>` em dash is removed; the YA stat now reads 6.4%.
> Criterion 3 (the page actually runs + deploys) therefore moves PARTIAL → PASS. All 6 §7
> criteria now pass. STOP gate lifted.

Hostile, blind-to-build review against the frozen §7 criteria. Every number below was
re-computed with my own script (`/tmp/verify_inkwell.py`, independent of `_margot_analysis.py`).

---

## Verdict table

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Diagnosis is data-bound | **PASS** | Re-computed the headline shares from the CSV; they match diagnosis.md to the decimal (see below). One sub-decimal rounding nit on YA. |
| 2 | One metric, not five | **PASS** | diagnosis.md L55 + marketing.md L4: "Emails captured from under-35 readers." Email, all 3 posts, and the page all drive the single CTA "Claim your Library Card." |
| 3 | The page actually runs | **PARTIAL / FAIL-on-deploy** | Local server returns 200; all required 3D + fallback code is present (verified in source). BUT the README's claimed **live GitHub Pages URL returns HTTP 404** and `site/` is not git-tracked. It was never deployed. |
| 4 | On-brand, on-voice | **PASS (one nit)** | Shared "Inkwell Rewritten / Library Card" spine, Ink Navy/Parchment/Teal/Gold palette, Fraunces/Inter, the unhurried bookseller voice across page+email+posts. Not generic. Nit: em dash in the page `<title>` (Victor bans them); email body + captions are dash-clean. |
| 5 | GDPR-clean | **PASS** | Consent line present (index.html L266); checkbox has **no `checked` attribute** (not pre-ticked, L265); unsubscribe in email footer (marketing.md L41). |
| 6 | No hallucinated facts | **PASS** | Shipped headline stat "35% to 23%" is the computed sample figure (35.1→23.4), correctly cited. No invented numbers in the world-facing copy. |

---

## Numbers I independently re-computed (my own script, not `_margot*`)

Method: group lines by `basket_id`; first6 = 2024-06→2024-11, last6 = 2025-12→2026-05.

| Metric | My result | diagnosis.md claims | Reconciles? |
|--------|-----------|---------------------|-------------|
| Under-35 share of known-age revenue | **35.1% → 23.4%** (€13,925/€39,715 → €7,918/€33,814) | 35.1% → 23.4% | ✅ exact |
| Stamp-card usage rate | **6.15%** (1,157/18,819) | 6.1% | ✅ |
| Stamp rate under-35 / over-50 | **11.6% / 17.3%** | 11.6% / 17.3% | ✅ exact |
| AOV first6 → last6 | **€17.77 → €19.13** | €17.77 → €19.13 | ✅ exact |
| Baskets per window | **5,248 → 4,113** | 5,248 → 4,113 | ✅ exact |
| Unknown age-band share | **55.4% of lines / 55.5% of baskets** | 55.4% / "44.6% known" | ✅ |
| Maynooth / Galway / chain basket decline | **-31.5% / -27.8% / -21.6%** | -31.5% / -27.8% / -21.6% | ✅ exact |
| Romantasy unit share | **5.06% → 5.28%** | 5.1% → 5.3% | ✅ |
| Young Adult unit share | **6.25% → 6.445%** | 6.3% → **6.5%** | ⚠️ endpoint should round to **6.4%**, not 6.5% |

Total baskets 18,819 and 30,569 line rows also match the diagnosis header. Diagnosis is genuinely
data-bound: I could reproduce every load-bearing figure. The only blemish is the YA endpoint
rounded up (6.445 → stated 6.5) against the brief's explicit "round honestly; never inflate."

Prize maths check: 372k × (37%−22%) = €55,800/mo bleed; one-third clawback = €18,600/mo ≈
€223,200/yr ≈ 45× on €5,000. Arithmetic is sound.

## Page technical verification (source-confirmed, served over HTTP 200)

three.js r160 import map ✓ · `InstancedMesh` (520 books) ✓ · `THREE.Points` (2,600 particles) ✓ ·
`UnrealBloomPass` ✓ · `CatmullRomCurve3` camera + look curves with damped scroll ✓ · real `<form>`
with `<label>`s ✓ · `prefers-reduced-motion` gate at JS entry (`document.body.classList.add('flat')`) ✓ ·
no-WebGL capability check ✓ · `try/catch` around 3D init falling back to flat ✓ · consent checkbox not
pre-ticked ✓ · localStorage capture + Formspree/mailto fallback ✓. The build itself is excellent and
meets §5. (Note: README says particles "3–5k" in spec; build shipped 2,600 — within Søren's documented
degrade allowance, but Priya did not flag the cut.)

---

## The catch

**README.md L29-31 (Priya) asserts a "Live URL" — `https://aibadge.fiveinnolabs.com/my-ai-workspace/ai-projects/FlexHaus-gym/Variation2/site/` — that returns HTTP 404; the `site/` folder is not even git-tracked, so the page was never actually deployed.** The brief's Definition of Done and §5 require a real deployed GitHub Pages URL; this one is claimed-but-untrue.

(Runner-up: diagnosis.md L49 rounds YA's 6.445% up to "6.5%", a small inflation against the brief's "round honestly" rule.)

---

## Recommendation: **DO-NOT-SHIP (until deployed)**

The analysis, design, copy, and the page's *code* are all strong and pass on merit. But §7.3 cannot
pass while the only "live" URL 404s and the files are uncommitted. This is a hard blocker, not a polish
item. Before shipping:

1. Commit `site/` and actually publish it; confirm the README URL resolves with a 200 (the blank-engine
   rule: do not claim "live" until you have loaded it).
2. Fix the YA figure to 6.4% in diagnosis.md.
3. Drop the em dash from the page `<title>`.

Do those three and it ships clean.
