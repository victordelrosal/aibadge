# design-spec.md — 🔴 Søren, conversion-led WebGL experience designer

**Spine:** "Inkwell Rewritten." The lapsed reader starts a new chapter; the paper stamp card becomes a glowing digital Library Card. **The one job of this page:** capture a consented email from an under-35 reader. Claiming the Library Card *is* the sign-up. One CTA, repeated, never competing.

**Palette in use:** Ink Navy `#14213D` (3D field, deep space), Warm Parchment `#F4ECD8` (content panels), near-black ink `#0B0F1A` (type on parchment), Inkwell Teal `#2A9D8F` (focus rings, links, the single "free book" tick), Foil Gold `#C9A227` (the Library Card *only*). Display: Fraunces. Body: Inter.

---

## 1. Section-by-section wireframe (4 scroll scenes)

**Scene 1 — Ink bloom → logo hero.** Full-viewport canvas: ink drop falls, blooms into the Inkwell mark. Overlaid, lower-left, on a low-opacity parchment scrim for contrast: eyebrow ("A new chapter for Inkwell readers"), **H1 display "Inkwell, rewritten."**, one-line promise sub, and the primary button **"Claim your Library Card."** A quiet scroll-cue chevron sits bottom-centre. Hierarchy: H1 dominant → promise → CTA → eyebrow. CTA is the only interactive element above the fold. Copy intent: warm, knowing, "we lost touch, here's the way back."

**Scene 2 — The drift.** Camera flies forward through the floating candle-lit library; instanced books and page-particles drift past. 2–3 short brand-story lines pin one at a time, centred, fading in/out as the camera passes waypoints. Copy intent (not final): (a) the third place between work and home; (b) staff who actually read, recommendations by hand; (c) "you grew up here — come back." No CTA here; this scene earns trust, it does not sell. Minimal chrome so the 3D carries it.

**Scene 3 — The proof ("what you unlock").** Camera slows; three parchment cards rise out of the dark, revealed in sequence as they enter light. Each: small icon, short title, one supporting line. Beats: **1) A free book** (the stamp card, reborn — earn one on joining/first visit), **2) Members-only late-night author events** (the thing the survey explicitly asked for), **3) A card that lives on your phone** (no paper, no drawer). Hierarchy within each card: title → line → icon. These are the reasons-to-believe that feed the next scene. A secondary instance of the CTA sits after the third card.

**Scene 4 — The card (sign-up).** Camera arrives at a warm pool of light; the gold-foil ex-libris bookplate hovers and slowly turns. To its side (stacked on mobile), a parchment form panel: **email field**, **plain-English consent line** ("Yes, email me Inkwell news and events. Unsubscribe anytime.") with an **unticked** checkbox, and the primary button **"Claim your Library Card."** Microcopy under the field: "No spam, no stamp cards. One email when something's worth your evening." On success the bookplate flips to reveal the visitor's name + "Member since 2026." Hierarchy: card visual ↔ form share weight; the button is the brightest non-gold element.

---

## 2. 3D scene concept + scroll choreography

**One scene graph, scrubbed by scroll progress `p` (0→1).** A single normalised scroll value drives a camera spline; everything else is ambient.

- **Camera path:** position and quaternion sampled along a pre-baked `CatmullRomCurve3` (4 control points = 4 scenes). On each frame, target = `curve.getPointAt(pTarget)`; actual = `damp(current, target, λ≈4, dt)` (exponential smoothing, frame-rate independent). Look-target damped the same way. No direct scroll→transform binding — always through the damp, so fast flicks glide. Scene-pin text driven by `smoothstep` windows on `p`.
- **Scene 1 (p 0–0.15):** ink-drop = a single morphing blob (shader-displaced icosphere) collapsing into the logo plane; bloom-lit. Books idle in far background.
- **Scene 2 (p 0.15–0.6):** the drift. **`InstancedMesh`, ~400–600 book instances**, one geometry + one material, per-instance matrix with slow drift (sin/cos offset by instanceID in the vertex via instanced attribute or a cheap per-frame matrix update on a subset). **Pages = one `THREE.Points` system, ~3–5k GPU particles**, additive, gold-warm, drifting up like embers. Candles = a handful of emissive sprites feeding bloom.
- **Scene 3 (p 0.6–0.85):** three card meshes lerp Y-position + opacity as `p` crosses their thresholds.
- **Scene 4 (p 0.85–1):** bookplate mesh, gold emissive material, constant slow Y-rotation; the only object using the gold channel. Flip on success = quaternion tween.
- **Postprocessing:** `EffectComposer` → `UnrealBloomPass` (low threshold, moderate strength) for candlelight + gold. That is the whole stack.
- **Draw-call discipline:** books = 1 instanced draw; pages = 1 points draw; candles = 1 sprite batch; cards/bookplate = a few. Target **well under ~15 draw calls.** No per-book mesh, ever. Textures atlased; one book material, color varied per-instance via instanceColor.

**Trade-off flags (cut ambition, not bars):** page-turning geometry is expensive and fragile — *use the Points ember-drift instead of animated page-flip meshes.* If bloom + particles drop below 30fps on mid hardware, **first** halve particle count, **then** lower bloom resolution, **then** reduce instance count to ~250; keep the camera glide last. Per-book unique drift can stay on the GPU; if it costs, animate only the nearest ~80 books and leave the rest static — visually indistinguishable at depth.

---

## 3. The single primary CTA

**"Claim your Library Card."** Identical label every time. Three placements, all the same action (scroll-to/anchor to the Scene 4 form, or submit when already there): (1) hero, Scene 1; (2) after the third proof card, Scene 3; (3) the form button itself, Scene 4. A persistent slim sticky bar ("Claim your Library Card →") fades in after the user scrolls past the hero and hides once the form is in view, so the ask is always one tap away without nagging. No competing secondary CTA anywhere. The gold treatment is reserved for the card mesh, not the buttons — buttons are Ink Navy fill / parchment text so gold stays the reward.

---

## 4. States (form + card)

**Email field & consent — default:** parchment field, 1px ink-navy hairline, ink-navy label *above* the field (real `<label>`). Checkbox unticked. Button enabled but submit is gated by validation.
**Hover:** button darkens ~8%, subtle lift; field border deepens to navy.
**Focus:** 2px **Teal** focus ring (3:1 against parchment), visible on keyboard tab; label unchanged.
**Success:** form panel fades; bookplate flips with a soft gold bloom pulse; reveals "[Name] · Member since 2026"; confirmation line "Check your inbox — your first chapter's on the way." Sticky bar removed. Live region announces success.
**Error — invalid email:** field border + helper text in an accessible red (`#B3261E`, AA on parchment), message "That email doesn't look right — mind checking it?"; field keeps focus.
**Error — consent unticked:** inline note by checkbox "We need your okay to email you." Submit blocked, no page reload.
**Error — network/provider fail:** non-destructive banner above button "Couldn't save that just now — try again?"; entered email preserved; documented `mailto`/Formspree fallback so capture still works.

**Library Card mesh states:** idle (slow turn, warm-lit) → submitting (turn pauses, faint pulse) → success (flip + gold bloom + name) → reduced-motion/no-WebGL: the card is a static gold-foil bookplate image that simply swaps to the "Member since 2026" face on success.

---

## 5. Fallbacks

**`prefers-reduced-motion`:** no camera fly-through, no particle drift, no auto-rotation. Serve a **still, beautiful ink-bloom hero image** (pre-rendered logo bloom as a static asset) and let the page **scroll normally** as stacked parchment sections (hero → drift copy → 3 proof cards → form). All copy, all three CTA placements, the full working form, and the static gold bookplate remain. Nothing essential lives only in motion.

**No-WebGL (detect via failed context / `WEBGL.isWebGLAvailable()`):** skip the canvas entirely, render the same styled static hero (ink-navy field, parchment headline panel, static logo image) and the identical scrolling page + working form. The sign-up must complete with zero 3D. Canvas is never load-blocking; the DOM form is server-of-record either way.

---

## 6. Accessibility plan

- **Canvas is decorative:** `aria-hidden="true"`, not focusable. All meaning lives in real DOM: `<h1>`, story `<p>`s, proof `<section>`s, the `<form>`. The 3D is enhancement, never the only source of content.
- **Focus order:** skip-link → primary hero CTA → (scroll/sticky CTA) → proof-card CTA → email input → consent checkbox → submit. Strict DOM order matches visual order; no positive `tabindex`.
- **Labels & form semantics:** real `<label for>` on email and checkbox; `type="email"`, `inputmode="email"`, `autocomplete="email"`; consent is a true `<input type=checkbox>` (no pre-tick), `required` validated in JS not just HTML; errors via `aria-describedby` + `aria-live="polite"` region; success announced in the same live region.
- **AA contrast (mind parchment-on-light):** body/type on parchment uses near-black **`#0B0F1A`** (≈15:1) — never mid-grey. Links/inline emphasis use Teal **`#2A9D8F`** *only at large/bold sizes or with underline* (its ratio on parchment is ~3:1, fine for ≥18.66px bold or non-text UI like the focus ring, **not** for small body text). For small interactive text use Ink Navy `#14213D` (≈12:1). **Gold `#C9A227` is never used as text** — decorative foil only. Buttons: parchment text on Ink Navy fill (≈11:1).
- **Keyboard:** every CTA is a real `<button>`/`<a>`; sticky bar reachable; form fully operable and submittable by keyboard; visible Teal focus ring everywhere (never `outline:none` without replacement).
- **Alt text:** static hero logo `alt="Inkwell Books — the ink-drop logo"`; bookplate `alt="Your Inkwell Library Card"`; proof-card icons decorative (`alt=""`), meaning carried by adjacent text.
- **Motion safety:** `prefers-reduced-motion` honoured at the JS entry point (gate the whole render loop), not just CSS; no parallax or auto-rotate when set.
