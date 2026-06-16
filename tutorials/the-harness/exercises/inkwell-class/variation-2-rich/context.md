# context.md: Inkwell Books re-engagement campaign (HARNESS)

> **What this file is.** This is the full operating brief for an Octopus pipeline.
> It is the *harness*: the backstory, the data, the specialist agents, the brand, and
> the artifact spec, all in one place. Read it top to bottom before you delegate a
> single task. Everything you need to do world-class work is below. Do not invent
> facts that contradict it; if a number you need is missing, mark it `[ASSUMPTION]`
> and state it plainly. Treat every figure here as ground truth for this exercise
> (it is synthetic, generated for teaching).

---

## 0. Mission (one sentence)

Win back the under-35 customers Inkwell has lost by shipping a launch-ready re-engagement
campaign whose centrepiece is a **three.js "spectacular" sign-up landing page** good enough
to make a lapsed reader stop scrolling, plus the launch email and three social posts that
drive traffic to it. Budget **€5,000**. Window **six weeks before Christmas**.

**Definition of done:** a deployed GitHub Pages URL (the landing page), an email, three
posts, and a one-page diagnosis that sizes the prize. Marks are for the *catch and the
judgement*, not for a pretty page alone.

---

## 1. Backstory

Inkwell Books began in 1991 as a single shop on Dublin's Camden Street: creaking floors,
a resident cat called Tolstoy, handwritten staff "shelf-talker" recommendations, and a
Saturday-morning crowd three deep at the till. Over thirty years it grew, carefully, to
**nine branches** across Ireland. It never tried to be Amazon. It won on taste, on staff
who actually read, and on being the warm third place between work and home.

Then two things happened at once. The founders, Niamh and Daithí Brennan, stepped back in
2023 and handed day-to-day running to their daughter, **Aoife Brennan** (now MD, 34). And
the customers who had grown up in the shop in the 2000s, the under-35s, quietly stopped
coming. Footfall is **down 28% in two years**. The loyalty scheme is still a **paper stamp
card** ("buy 9, get the 10th free") that nobody under 30 carries. There is **no email list**
at all: thirty years of loyal customers and Inkwell cannot send a single one of them a
message. Meanwhile the over-50 segment is loyal as ever, which masks the bleed in the
monthly totals and makes the board complacent.

Aoife knows the next two Christmases decide whether Inkwell is a chain or a memory. She has
freed up **€5,000** and **six weeks**. She does not want a rebrand. She wants the lapsed
twenty-somethings back through the door, and she wants a way to *reach* customers that does
not involve a rubber stamp. This campaign is the test.

**Voice of the customer (verbatim, from a 40-person exit/lapsed survey):**
- "I love the shop but I only remember it exists when I walk past it." (F, 27, Galway)
- "Waterstones emails me a 3-for-2 every week. Inkwell has never emailed me once." (M, 31, Dublin)
- "The stamp card is in a drawer somewhere. I'm not carrying a piece of card." (F, 24, Cork)
- "I'd come to events. Author nights, a book club, anything. They don't tell me about them." (M, 29, Dublin)
- "Honestly I just buy on my phone at 11pm now." (F, 33, Limerick)

---

## 2. The business, in numbers (synthetic, internally consistent)

> **The tables below are summaries. The raw evidence is the file `inkwell_pos_transactions.csv`**
> (≈30,600 line-item rows / ≈18,800 baskets, 21 fields, 24 months across all 9 branches; see
> the data dictionary in §2.8). Inkwell has no CRM and no email list, but every till logs sales,
> so this anonymised POS export is the one real dataset they hold. **Margot must derive the
> diagnosis from this CSV, not merely quote the summaries here**: the summaries exist so you
> can sanity-check your own analysis against them.

### 2.1 Branch network (last full month)

| # | Branch | Opened | Floor m² | Weekly footfall (now) | Weekly footfall (2 yrs ago) | Monthly revenue €k |
|---|--------|--------|---------|----------------------|----------------------------|--------------------|
| 1 | Camden St (Dublin, flagship) | 1991 | 240 | 3,100 | 4,450 | 86 |
| 2 | Rathmines (Dublin) | 1998 | 120 | 1,450 | 2,050 | 41 |
| 3 | Dún Laoghaire | 2003 | 95 | 1,180 | 1,520 | 33 |
| 4 | Galway (Shop St) | 2006 | 160 | 1,920 | 2,760 | 52 |
| 5 | Cork (Oliver Plunkett St) | 2009 | 150 | 1,640 | 2,300 | 47 |
| 6 | Limerick | 2012 | 110 | 980 | 1,410 | 28 |
| 7 | Kilkenny | 2015 | 85 | 760 | 980 | 22 |
| 8 | Dundrum Town Centre (Dublin) | 2018 | 130 | 1,540 | 2,180 | 44 |
| 9 | Maynooth (campus-adjacent) | 2021 | 70 | 720 | 1,090 | 19 |
| | **Total / blended** | | **1,160** | **13,290** | **18,740** | **372** |

Footfall decline blended: **-29.1%** over two years (the "28%" Aoife quotes is rounded).
The Maynooth and Galway branches (most student-heavy) fell hardest: **-34%** and **-30%**.

### 2.2 Who is leaving (sales share by age band)

| Age band | % of revenue (2 yrs ago) | % of revenue (now) | Direction |
|----------|--------------------------|--------------------|-----------|
| Under 25 | 14% | 7% | ▼ halved |
| 25–34 | 23% | 15% | ▼ falling fast |
| 35–49 | 28% | 30% | ▬ stable |
| 50–64 | 21% | 28% | ▲ growing |
| 65+ | 14% | 20% | ▲ growing |

The **under-35 segment has gone from 37% to 22% of revenue**. The over-50s have gone from
35% to 48%. The chain is ageing into a cliff. This is the single most important chart in the brief.

### 2.3 Sales mix, basket, margin

| Category | % of units | Gross margin |
|----------|-----------|--------------|
| Fiction (incl. literary, crime, romantasy) | 41% | 32% |
| Children's & YA | 19% | 35% |
| Non-fiction / business / self-dev | 17% | 30% |
| Stationery, cards, gifts | 14% | 54% |
| Coffee / café (3 branches) | 9% | 68% |

- Average transaction value: **€18.40** (was €17.10 two years ago: price, not volume, is holding revenue up).
- Conversion of footfall to purchase: **~31%**.
- "Romantasy" and YA are the fastest-growing categories nationally and skew heavily under-35: Inkwell under-indexes here.

### 2.4 The loyalty problem

- Stamp cards issued (lifetime): ~92,000. Estimated still active: **unknowable** (paper, no database).
- Redemption rate (cards fully completed and redeemed): **~6%**.
- Customer records held digitally: **0**. No CRM. No POS-linked email capture.
- Email list size: **0**. SMS list: **0**.

### 2.5 Digital & social presence (current)

| Channel | State | Followers / traffic |
|---------|-------|--------------------|
| Website | Static brochure site, no e-commerce, no sign-up | ~4,200 visits/mo, 78% bounce |
| Instagram | Posts ~1×/week, mostly shelf photos | 6,800 followers, ~1.2% engagement |
| Facebook | Dormant since 2022 | 9,100 followers |
| TikTok | None |: (BookTok is where the under-25s now are) |
| Google Business | Unclaimed for 4 of 9 branches |: |

### 2.6 Competitive context

- **Amazon / Kindle:** price + 11pm convenience. Cannot be beaten on either. Do not try.
- **Waterstones (IE):** weekly email, 3-for-2, loyalty app, polished events programme. This is the benchmark Inkwell's lapsed customers compare it to.
- **Eason:** mass-market, gifting, footfall-heavy at Christmas.
- **Local café-bookshops & BookTok:** where the under-35 "discovery" now happens. Inkwell's *real* edge: curation, staff taste, physical events, the third-place feeling. Lean into what Amazon structurally cannot do.

### 2.7 Constraints (hard)

- Budget **€5,000 all-in** (build + ads + incentive). The landing page itself should cost ~€0 (GitHub Pages + free tier email capture).
- **Six weeks.** Live before the first weekend of December.
- **GDPR:** every email/SMS capture needs a lawful basis (consent), a clear purpose, and an unsubscribe. The sign-up form must show a plain-English consent line. No pre-ticked boxes.
- No rebrand. Evolve the existing brand, do not replace it.
- Accessibility is non-negotiable: the page must work for a screen-reader user and a keyboard-only user, and must degrade gracefully where WebGL is unavailable.

### 2.8 The raw data: POS export (`inkwell_pos_transactions.csv`)

One row per **line item**; group by `basket_id` to roll up to a transaction. ~30,600 rows,
24 months (2024-06 to 2026-05), all 9 branches. It is a ~7% anonymised sample of completed
baskets, so *shares, trends and ratios are representative; absolute totals scale up to the
full-population figures in §2.1*. There is no customer identity field (that is the whole
point: no CRM = no email list). `member_age_band` is captured at the till only sometimes
(~45% of baskets, more often when a stamp card is used), so a large share reads `unknown` : 
reason under uncertainty, do not discard it.

| Field | Type | Notes |
|-------|------|-------|
| `line_id` | string | basket_id + line number |
| `basket_id` | string | groups lines into one transaction |
| `date` | date | YYYY-MM-DD |
| `time` | time | HH:MM, retail hours |
| `day_of_week` / `is_weekend` | string / Y\|N | seasonality + weekend skew live here |
| `branch` | string | one of the 9 (§2.1) |
| `category` | string | Fiction · Children's & YA · Non-fiction · Stationery & Gifts · Cafe |
| `genre` | string | sub-category (e.g. Romantasy, Young Adult, Business, Coffee) |
| `title` | string | synthetic title (invented; not a real book) |
| `quantity` | int | units on the line |
| `unit_price_eur` | float | price per unit |
| `discount_eur` | float | promo or stamp-redemption value |
| `line_total_eur` | float | `quantity*unit_price - discount` |
| `payment_method` | string | contactless · card · cash · giftcard |
| `channel` | string | in-store · click-collect |
| `stamp_card_used` | Y\|N | paper-loyalty redemption flag (~6% of baskets) |
| `promo_applied` | Y\|N | a promotion touched this line |
| `staff_pick` | Y\|N | sold off a shelf-talker recommendation |
| `member_age_band` | string | Under 25 · 25-34 · 35-49 · 50-64 · 65+ · **unknown** |
| `returned` | Y\|N | line subsequently returned |

**Five analyses Margot should actually run (not optional):**
1. Monthly basket count per branch over 24 months → quantify the footfall decline and name the worst-hit branches.
2. Under-35 revenue share (known-age rows) over time → size the collapse and the prize of reversing it.
3. AOV and basket size, now vs two years ago → show whether revenue is held up by price, not volume.
4. Genre trend, esp. Romantasy / Young Adult → is Inkwell under-indexing the categories under-35s buy?
5. Stamp-card redemption rate + payment-method mix by age → evidence the paper scheme is dead for under-35s.

The landing-page hero and the launch email may each feature **one** headline stat, but only if
it is computed from this CSV and cited (e.g. "under-35 spend has fallen by N% in two years").
Round honestly; never inflate.

---

## 3. Brand direction (so Design and Maker do not guess)

- **Personality:** literary, warm, witty, a little bit ink-stained and handmade. The opposite of a logistics warehouse. Think "your cleverest friend's front room," not "retail chain."
- **Palette:** Ink Navy `#14213D` (primary), Warm Parchment `#F4ECD8` (field), Inkwell Teal `#2A9D8F` (one accent, used sparingly), Foil Gold `#C9A227` (rare, for the "ex-libris" sign-up moment only). Near-black ink `#0B0F1A` for type on parchment.
- **Type:** a high-contrast serif for display (e.g. *Fraunces* or *Playfair Display*), a clean humanist sans for body (e.g. *Inter* or *Söhne*). Generous line height. Editorial, book-like.
- **Tone words for copy:** curious, generous, unhurried, knowing. Never salesy, never "Hurry, limited time!!!". A bookseller's recommendation, not a billboard.
- **The hook idea (give the campaign a spine):** **"Inkwell Rewritten."** The lapsed reader gets to start a new chapter. The loyalty card becomes a digital **"Library Card"** (a glowing ex-libris bookplate) that lives on the phone, earns a free book, and unlocks members-only late-night author events. This single idea should thread through page, email, and posts.

---

## 4. Your Octopus crew: SPECIALISTS, not generalists

You are the **Purple Manager (orchestrator)**. Do **not** spin up generic agents. Instantiate
these five named specialists, hand each its contract, and hold the quality gate. Run them as a
pipeline: Yellow → (Red-Orange ∥ Green) → Blue → Yellow (cold verify) → you (STOP gate).

### 🟡 YELLOW: "Margot," lapsed-customer cohort analyst
Specialism: RFM segmentation and win-back economics for bricks-and-mortar specialty retail. Not a generic researcher.
```
ROLE:     Analyse the POS CSV (§2.8), then turn it into a single at-risk segment, a sized prize (€), and 3 evidence-backed reasons under-35s left.
INPUT:    inkwell_pos_transactions.csv (the raw evidence), §1 voice-of-customer, §2 summaries to sanity-check against, §2.6 competition.
OUTPUT:   diagnosis.md: the target cohort (named), the size-of-prize maths shown step by step, 3 root causes each tied to a figure YOU computed from the CSV (state the query/filter), and the ONE metric the campaign should move. Run the five analyses in §2.8.
SCOPE:    No solutions, no copy. Diagnosis only. Every number is computed from the CSV (or cites §2): none invented.
ESCALATE: If the data cannot support a claim, say so and propose what to assume.
```

### 🔴 RED-ORANGE: "Søren," conversion-led WebGL experience designer
Specialism: high-craft three.js/WebGL landing pages that still convert. Art director + UX, not a generic designer.
```
ROLE:     Design the landing-page experience and the "Library Card" sign-up moment per §3 and §5.
INPUT:    Margot's diagnosis, the brand (§3), the three.js spec (§5).
OUTPUT:   design-spec.md: section-by-section wireframe, the 3D scene concept, the scroll choreography, the single primary CTA, the reduced-motion + no-WebGL fallback, and the accessibility plan (focus order, contrast, alt text).
SCOPE:    No code. Design intent, hierarchy, motion, states (default/hover/focus/success/error).
ESCALATE: If a 3D idea would hurt load time or a11y, flag the trade-off and offer a lighter alternative.
```

### 🔵 BLUE: "Priya," three.js + static-deploy front-end engineer
Specialism: performant vanilla three.js (r160+) / WebGL, GPU particles, and zero-cost GitHub Pages deployment. Not a generic coder.
```
ROLE:     Build the real, deployable landing page from Søren's spec. It must actually run.
INPUT:    design-spec.md, brand tokens (§3), §5 technical requirements.
OUTPUT:   /site (index.html + assets), a working email-capture form (free tier or mailto fallback), and a deployed GitHub Pages URL. README with run + deploy steps.
SCOPE:    Front-end only. No backend Inkwell does not have. Must hit the §5 performance + a11y bars.
ESCALATE: If the 3D scene blows the performance budget on mid-range hardware, degrade it and say what you cut.
```

### 🟢 GREEN: "Cathal," lifecycle + BookTok launch copywriter
Specialism: win-back email and organic social for indie retail; literary brand voice. Not a generic marketer.
```
ROLE:     Write the launch email and three platform-native social posts that drive to the page.
INPUT:    Margot's diagnosis, brand voice (§3), the "Inkwell Rewritten / Library Card" hook.
OUTPUT:   marketing.md: one launch email (subject + preview + body + single CTA + GDPR-clean footer), and 3 posts (Instagram, TikTok/Reels script, one for the dormant Facebook over-50 base), each with the asset note and the metric it targets.
SCOPE:    Copy + channel strategy only. No invented stats; if you cite a number it comes from §2.
ESCALATE: If a claim needs proof Inkwell does not have, soften it or drop it.
```

### 🟣 PURPLE: you, the orchestrator + quality gate
```
ROLE:     Sequence the crew, enforce handoffs, run Cold Verify, and STOP before publishing.
DO:       After Blue ships, re-task Yellow as a COLD VERIFIER (see §7) blind to the build reasoning. Only you decide it is done.
```

---

## 5. The artifact: a three.js "spectacular" landing page (MANDATORY)

This is Variation 2's defining instruction. The page is **not** a flat form. It is a short,
breathtaking, scroll-driven WebGL experience that earns the email.

**Concept: "The Infinite Library."** On load, a single drop of ink falls into frame and
blooms in 3D into the Inkwell logo. As the visitor scrolls, the camera flies forward through
an endless, candle-lit floating library: shelves and open books drifting in dark space, their
pages turning into a slow drift of glowing paper particles. The journey ends at a single
warm pool of light where the **"Library Card"** (a gold-foil ex-libris bookplate) hovers and
turns; claiming it *is* the email sign-up. The card flips to reveal the visitor's name and
"Member since 2026" on success.

**Required scenes (scroll-driven):**
1. **Ink bloom → logo** (hero). Headline: *"Inkwell, rewritten."* Sub: the one-line promise. One CTA: *Claim your Library Card*.
2. **The drift**: fly-through of instanced floating books + GPU page-particles; 2–3 short lines of brand story pinned as the camera moves.
3. **The proof**: three "what you unlock" beats (a free book, members-only late-night author events, a card that lives on your phone) revealed as cards rise out of the dark.
4. **The card**: the ex-libris bookplate, gold foil, the actual sign-up form (email + consent line). Success state: the card flips and glows.

**Technical requirements (Blue must meet all):**
- **three.js r160+**, vanilla (no heavy framework needed); ES modules via CDN import map is fine for a GitHub Pages static deploy.
- **InstancedMesh** for the books; **GPU/points particles** for drifting pages; **postprocessing bloom** for the candlelight and the gold card. Keep draw calls low.
- **Scroll choreography:** camera position/quaternion driven by scroll progress (lerp/damp for smoothness). No janky scrubbing.
- **Performance budget:** interactive < 2.5s on a mid-range laptop; sustained 60fps target, never below 30fps; total JS payload lean (instancing over thousands of meshes).
- **`prefers-reduced-motion`:** serve a still, beautiful hero (ink-bloom logo as a static image) and a normal scrolling page. The experience must never trap a motion-sensitive user.
- **No-WebGL fallback:** detect failure, render a styled static hero + the form. The sign-up must work with zero 3D.
- **Accessibility:** keyboard-reachable form, visible focus rings, AA contrast on all text (mind parchment-on-light), real `<label>`s, alt text, the canvas marked decorative (`aria-hidden`) with the real content in the DOM.
- **The form:** captures email; shows the plain-English **consent line** ("Yes, email me Inkwell news and events. Unsubscribe anytime."); no pre-tick; success and error states. Wire to a free-tier provider or a documented `mailto`/Formspree fallback so it genuinely captures.
- **Deploy:** GitHub Pages. Hand back the live URL.

If any 3D ambition threatens the performance or accessibility bars, **cut the ambition, not
the bars.** A fast, accessible, slightly-less-lavish page beats a gorgeous one nobody can use.

---

## 6. Deliverables checklist

- [ ] `diagnosis.md`: at-risk cohort named, prize sized with working, 3 root causes each tied to a figure computed from `inkwell_pos_transactions.csv`, the one metric.
- [ ] `design-spec.md`: sections, 3D concept, scroll choreography, states, fallback, a11y plan.
- [ ] `/site` + **live GitHub Pages URL**: the three.js landing page, form working, fallbacks working.
- [ ] `marketing.md`: launch email + 3 platform-native posts, GDPR-clean, no invented stats.
- [ ] `cold-verify.md`: the §7 report.

---

## 7. Cold Verify + STOP gate (do not skip)

Before you call this done, re-task **Yellow as a fresh cold verifier**, blind to how the work
was made, against these frozen criteria. Score each pass/fail with the evidence:

1. **Diagnosis is data-bound:** every root cause maps to a figure computed from `inkwell_pos_transactions.csv` (the query is stated and the result reconciles with the §2 summaries); the prize is sized with visible maths.
2. **One metric, not five:** the campaign names a single primary metric (e.g. emails captured, or under-35 footfall) and everything serves it.
3. **The page actually runs:** the GitHub Pages URL loads; the 3D scene renders; the form captures; reduced-motion and no-WebGL fallbacks both work.
4. **On-brand, on-voice:** page, email, and posts share the "Inkwell Rewritten / Library Card" spine and the §3 voice. None of it is generic enough to belong to any other shop.
5. **GDPR-clean:** consent line present, no pre-tick, unsubscribe in the email.
6. **No hallucinated facts:** nothing claims a number that is not in §2 (or is marked `[ASSUMPTION]`).

**Catch the octopus lying.** Find and screenshot ONE moment a specialist got something wrong
(a hallucinated stat, a dropped handoff, an off-brief output, a broken 3D fallback). Name it
in one line. That catch is the point of the exercise. Only after the cold verify and the catch
do you, the Purple Manager, lift the STOP gate and ship.

---

## 8. How this will be judged (and why this file exists)

This is the **rich harness**. Its twin is an empty brief. When the two run side by side, the
difference between them is the entire lesson: *the model did not get smarter, the context did.*
A vague ask yields a generic page and invented numbers. This file yields a named cohort, a
sized prize, a branded WebGL experience, GDPR-clean copy, and a verifier that catches the lie.
The harness is the work.
