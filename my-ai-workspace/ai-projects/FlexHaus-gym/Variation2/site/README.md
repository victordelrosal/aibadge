# Inkwell, rewritten — the landing page (🔵 Priya)

The three.js "Infinite Library" sign-up page. Single file, zero build step, deploys free on GitHub Pages.

## Run locally
Any static server (three.js loads as ES modules over HTTPS from a CDN, so `file://` will not work):
```bash
cd site
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

## What it is
- `index.html` — everything: DOM content, CSS, the form logic, and the WebGL scene.
- three.js **r160** via an ES-module import map (`three` + `three/addons/` from jsDelivr). No bundler.
- Scene: ink-bloom hero → instanced-book drift (1 draw call, ~520 books) + GPU page-particles (~2,600 points) + candle sprites → gold ex-libris **Library Card** that flips on sign-up. `UnrealBloomPass` for candlelight.
- Camera is a `CatmullRomCurve3` scrubbed by damped scroll progress (frame-rate independent).

## Fallbacks (both tested)
- **`prefers-reduced-motion`** or **no WebGL** → the canvas is dropped and the page renders as a still ink-bloom hero plus normal stacked parchment sections. All copy, all three CTA placements, and the full working form remain. Set at the JS entry point, so the render loop never starts.
- Any 3D init error is caught → same flat experience. The DOM form is the source of record either way.

## The sign-up form
- Captures `email`, shows the plain-English **consent line** (unticked checkbox, no pre-tick), with success + error states (invalid email, missing consent, provider failure).
- **Capture wiring:** every valid submit is stored to `localStorage` (`inkwell_signups`) so capture is genuine and provider-independent. To send to a real inbox, set `FORMSPREE_ENDPOINT` near the top of the form `<script>` to your own free [Formspree](https://formspree.io) form id (replace `REPLACE_WITH_FORM_ID`). If a provider call fails, a `mailto:` fallback to `INKWELL_INBOX` is offered so a reader can still claim. No backend required (Inkwell has none).

## Deploy (GitHub Pages)
This folder lives inside the `victordelrosal/aibadge` repo, which is published by GitHub Pages at
`aibadge.fiveinnolabs.com`. Pushing to `main` publishes it. Live URL:

**https://aibadge.fiveinnolabs.com/my-ai-workspace/ai-projects/FlexHaus-gym/Variation2/site/**

To deploy a standalone copy instead: drop `index.html` in any repo, enable Pages on the branch, done.

## Accessibility
Skip link, real `<label>`s, `type=email` + `autocomplete`, JS-validated required consent, `aria-live` errors/success, canvas `aria-hidden`, Teal focus rings (never `outline:none` without a replacement), near-black `#0B0F1A` body type on parchment (~15:1), gold used as foil only never as text.
