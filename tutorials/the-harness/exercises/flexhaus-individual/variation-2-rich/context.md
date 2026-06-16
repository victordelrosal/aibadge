# context.md: FlexHaus Gym member-retention campaign (HARNESS)

> **What this file is.** This is the full operating brief for an Octopus pipeline. It is the
> *harness*: the backstory, the data, the specialist agents, the brand, and the artifact spec,
> all in one place. Read it top to bottom before you delegate a single task. Everything you
> need to do world-class work is below. Do not invent facts that contradict it; if a number you
> need is missing, mark it `[ASSUMPTION]` and state it plainly. Every figure here is ground
> truth for this exercise (synthetic, generated for teaching).

---

## 0. Mission (one sentence)

Stop the bleed: win back the **disengaged-but-still-paying** members who have quietly stopped
coming before they cancel, by shipping a launch-ready retention campaign whose centrepiece is a
**three.js "spectacular" comeback-booking page** so frictionless and motivating that a member who
has not shown up in weeks books their next class in one tap, plus the win-back copy that drives
them there. Budget **€2,000**. Window **one month**.

**Definition of done:** a deployed GitHub Pages URL (the booking/win-back page), the win-back
message sequence, and a one-page diagnosis that names the at-risk segment and sizes the revenue
at stake. Marks are for the *catch and the judgement*, not for a pretty page alone.

---

## 1. Backstory

FlexHaus opened three years ago in a converted print-works: exposed brick, one big room with a
rig, two studios, good coffee, and a wall that reads *"Show up for yourself."* It is a
single-location boutique gym, owner-operated by **Dervla Quinn**, a former physio who built the
place on community rather than equipment. For the first two years the energy carried it: classes
sold out, the 6pm HIIT had a waitlist, members knew each other's names.

Now FlexHaus has **about 600 active members** and a quiet problem that does not show up on the
front desk. People are still *paying*: the direct debits go through every month. They have just
stopped *coming*. Monthly churn sits near **9%**, which means Dervla loses and must replace more
than half her membership every year just to stand still. Worse, **about 40% of members never book
a second class** after their first: they join on a January resolution or an Instagram ad, take
one class, and are never seen again, paying for a few months out of guilt before they cancel.
Attendance is patchy and the studios that used to be full now have gaps.

Dervla has tried the obvious things: a louder Instagram, a "refer a friend" poster, a sad email
blast that nobody opened. What she has never done is use the **data the gym already has**. Every
booking, check-in, no-show and cancellation has been logged for 18 months. She just has not
looked, because she is teaching four classes a day. She has freed up **€2,000** and **one month**.
She does not want more members at the top of the funnel; she wants to keep the ones she already
pays to acquire. This campaign is the test.

**Voice of the member (verbatim, from a 35-person lapsed/at-risk survey):**
- "I still pay for it. I just... haven't been in like six weeks. I keep meaning to." (F, 29, Standard plan)
- "The first class was hard and I felt out of place. I never went back." (M, 34, cancelled)
- "I don't know the timetable. By the time I check, the class I want is full." (F, 41, Off-peak)
- "Honestly I forgot I was a member until the payment came out." (M, 26, cancelled)
- "If someone had just texted me 'we saved you a spot Tuesday', I'd have gone." (F, 38, at-risk)

---

## 2. The gym, in numbers (synthetic, internally consistent)

> **The tables below are summaries. The raw evidence is the file `flexhaus_bookings.csv`**
> (≈45,300 booking rows / ≈1,560 distinct members, 23 fields, 18 months: 2024-12 to 2026-05).
> This is the gym's **full class-bookings export**, one row per booking, with each member's
> attributes denormalised onto every row. It has no separate "member table": **you must
> `GROUP BY member_id` to reconstruct the member panel** (tenure, visit frequency, second-class
> behaviour, status) before you can model churn. That reconstruction is the first real task.
> The summaries below exist so you can sanity-check your own analysis.

### 2.1 The membership base (derived from the export)

| Metric | Value | So what |
|--------|-------|---------|
| Currently active members | ~637 | the base Dervla is trying to hold |
| Avg monthly fee (active) | €45.26 | blended across 5 plans |
| Monthly recurring revenue | ~€30,800 | every churned member is ~€45/mo gone |
| Avg monthly churn (18-mo) | 8.3% | ≈9% headline; >50% of the base per year |
| Members who never book a 2nd class | 42% | the single biggest leak |
| No-show rate (all bookings) | ~7% | but heavily concentrated in the disengaged |

### 2.2 The "second-class cliff" (the core problem)

| Lifetime classes booked | Share of members | Cancelled-to-date |
|-------------------------|------------------|-------------------|
| 1 (one-and-done) | ~42% | ~75% |
| 2-4 (sporadic) | ~27% | high |
| 5-20 (regular) | ~20% | ~38% |
| 20+ (devotee) | ~8% | lowest |

Members who book **only one class churn at roughly twice the rate** of members who book five or
more (~75% vs ~38% cancelled to date). The fight is not at acquisition; it is at the **second
visit**. Reactivate a one-and-done before they cancel and you change the unit economics of the
whole gym.

### 2.3 Plans, classes, channels

| Plan | Monthly fee | ~Share |
|------|-------------|--------|
| Standard | €49 | 40% |
| Off-peak | €29 | 18% |
| Premium | €79 | 16% |
| Student | €25 | 14% |
| Annual (monthly equiv.) | €45 | 12% |

- **Class mix (by bookings):** Spin ~20%, HIIT ~19%, Strength ~17%, Yoga ~15%, Pilates ~11%, Boxing ~10%, Mobility ~8%.
- **Peak demand:** weekday 17:00-20:00 and weekend mornings. Off-peak capacity sits empty.
- **Acquisition source:** Instagram ~30%, friend referral ~24%, walk-in ~22%, Google ~16%, class-pass promo ~8%.

### 2.4 The at-risk segment (this is who the campaign is for)

A member is **at-risk and reachable** if they are *still active (paying)* but show the
disengagement pattern: one or zero bookings in their recent history, or never progressed past
the second class, or no visit in 30+ days. They have not cancelled yet, so a single good nudge
can still land. This segment is large, it is the source of most forward churn, and it is
sitting in the CSV waiting to be defined precisely. **Naming and sizing it is Tara's job.**

### 2.5 Constraints (hard)

- Budget **€2,000 all-in**. The page itself should cost ~€0 (GitHub Pages + a free booking/lead capture).
- **One month** to launch and run.
- **GDPR:** members consented to service comms when they joined, but a marketing/win-back message still needs a clear purpose and an easy opt-out; no dark patterns. The booking page captures the minimum.
- **Tone discipline:** these people feel guilty already. Shame does not sell a comeback. Warmth and zero-friction do.
- Accessibility is non-negotiable: the page works for a screen-reader user and a keyboard-only user, and degrades gracefully where WebGL is unavailable.

### 2.6 The raw data: bookings export (`flexhaus_bookings.csv`)

One row per **class booking**; group by `member_id` to rebuild the member. ~45,300 rows, 18
months, the full export (not a sample). `member_status` / `cancel_date` are the churn labels;
`is_first_class` / `is_second_class` flag the cliff; `booked_status` carries attendance.

| Field | Type | Notes |
|-------|------|-------|
| `booking_id` | string | one class booking |
| `member_id` | string | group by this to rebuild the member panel |
| `join_date` | date | member tenure starts here |
| `member_status` | string | active · cancelled · frozen (the churn label) |
| `cancel_date` | date | blank if still active |
| `plan_type` / `monthly_fee_eur` | string / float | Standard · Off-peak · Premium · Student · Annual |
| `age_band` / `gender` | string | Under 25 … 55+ ; F/M/Other |
| `referral_source` | string | how they were acquired |
| `home_distance_km` | float | distance to the gym |
| `booking_date` / `booking_time` | date / time | when the class is |
| `day_of_week` / `is_weekend` | string / Y\|N | demand patterns |
| `class_type` | string | Spin · HIIT · Strength · Yoga · Pilates · Boxing · Mobility |
| `instructor` / `room` | string | who taught · which studio |
| `booked_status` | string | attended · no_show · late_cancel |
| `is_first_class` / `is_second_class` | Y\|N | the member's 1st / 2nd ever booking |
| `waitlisted` | Y\|N | was waitlisted for this class |
| `pt_session` | Y\|N | personal-training session |

**Five analyses Tara should actually run (not optional):**
1. Rebuild the member panel (group by `member_id`): tenure, total bookings, last visit, status. Everything else depends on this.
2. Churn curve: cancellation rate by tenure month and by lifetime-bookings bucket → prove the second-class cliff and quantify the ~2x lift.
3. Define + size the at-risk segment (active + disengaged) → headcount and €/month and €/year at stake.
4. No-show and class-time patterns by segment → which class/time is the easiest re-entry point for a comeback.
5. Reactivation lever: among members who *did* book a second class, what predicted it (class type, instructor, time, distance)? → design the nudge around it.

The page hero and the win-back message may each feature **one** headline stat, but only if it is
computed from this CSV and cited (e.g. "members who skip the second class are 2x more likely to
quit"). Round honestly; never inflate.

---

## 3. Brand direction (so Design and Maker do not guess)

- **Personality:** boutique, human, high-energy but never bro-y or shaming. FlexHaus is the gym that *remembers your name and saved you a spot*, not the one that screams "NO EXCUSES." Encouraging, kinetic, unpretentious.
- **Palette:** Carbon `#0E1116` (primary dark field), Chalk `#F5F5F2` (light field), **Volt** `#C6F24E` (electric-lime signature accent, energy), Ember `#FF5A3C` (warm secondary accent, used sparingly for the comeback moment). High contrast, athletic.
- **Type:** a bold condensed display face (e.g. *Anton*, *Archivo Expanded*) for big motivating numbers and headlines; a clean humanist sans (e.g. *Inter*) for body. Big, confident, legible at a glance on a phone.
- **Tone words for copy:** warm, direct, momentum, belonging. "Your spot's still here." Never "You've been slacking."
- **The hook idea (the campaign spine):** **"The Comeback."** Reframe the lapse as a return, not a failure. The centrepiece is a one-tap **"Book your comeback class"** flow that pre-selects the member's favourite class and the next easy off-peak slot, with a human line: *we saved you a spot.* This single idea threads through page, message, and follow-up.

---

## 4. Your Octopus crew: SPECIALISTS, not generalists

You are the **🟣 Purple Manager (orchestrator)**. Do **not** spin up generic agents. Instantiate
these five named specialists, hand each its contract, and hold the quality gate. Run as a
pipeline: Yellow → (Red-Orange ∥ Green) → Blue → Yellow (cold verify) → you (STOP gate).

### 🟡 YELLOW: "Tara," membership retention & churn analyst
Specialism: survival analysis and cohort retention for subscription fitness; rebuilding member panels from event logs. Not a generic researcher.
```
ROLE:     Rebuild the member panel from flexhaus_bookings.csv (§2.6), then name and size the at-risk segment and the second-class cliff.
INPUT:    flexhaus_bookings.csv (the raw evidence), §1 voice-of-member, §2 summaries to sanity-check against, §2.4 at-risk definition.
OUTPUT:   diagnosis.md: the at-risk segment defined with a precise rule, its headcount and €/month + €/year at stake (maths shown), the ~2x churn lift evidenced, and the ONE metric the campaign should move. Run the five analyses in §2.6.
SCOPE:    No solutions, no copy. Diagnosis only. Every number is computed from the CSV (state the query/filter): none invented.
ESCALATE: If the data cannot support a claim, say so and propose what to assume.
```

### 🔴 RED-ORANGE: "Mateo," conversion-led booking-flow + WebGL experience designer
Specialism: high-craft three.js/WebGL pages whose 3D *serves* a one-tap booking conversion. Art director + UX, not a generic designer.
```
ROLE:     Design the comeback-booking page experience and the one-tap "book your comeback class" moment per §3 and §5.
INPUT:    Tara's diagnosis, the brand (§3), the three.js spec (§5).
OUTPUT:   design-spec.md: section-by-section wireframe, the 3D scene concept, the scroll choreography, the single primary CTA (book a class), the reduced-motion + no-WebGL fallback, and the accessibility plan.
SCOPE:    No code. Design intent, hierarchy, motion, states (default/hover/focus/success/error).
ESCALATE: If a 3D idea would hurt load time, mobile performance, or a11y, flag the trade-off and offer a lighter alternative.
```

### 🔵 BLUE: "Kojo," three.js + static-deploy front-end engineer
Specialism: performant vanilla three.js (r160+) / WebGL on mobile, and zero-cost GitHub Pages deployment. Not a generic coder.
```
ROLE:     Build the real, deployable comeback-booking page from Mateo's spec. It must actually run on a phone.
INPUT:    design-spec.md, brand tokens (§3), §5 technical requirements.
OUTPUT:   /site (index.html + assets), a working booking/lead-capture form (free tier or mailto fallback), and a deployed GitHub Pages URL. README with run + deploy steps.
SCOPE:    Front-end only. No backend FlexHaus does not have. Must hit the §5 mobile performance + a11y bars.
ESCALATE: If the 3D scene blows the performance budget on a mid-range phone, degrade it and say what you cut.
```

### 🟢 GREEN: "Róisín," fitness lifecycle + win-back copywriter
Specialism: re-engagement messaging for subscription fitness; warm, momentum-driven, never shaming. Not a generic marketer.
```
ROLE:     Write the win-back message sequence that drives at-risk members to the comeback page.
INPUT:    Tara's diagnosis, brand voice (§3), the "Comeback / we saved you a spot" hook.
OUTPUT:   marketing.md: a 3-touch win-back sequence (e.g. SMS + email + a final nudge), each with subject/opening + single CTA + GDPR-clean opt-out, plus 2 Instagram posts; each tagged with the metric it targets.
SCOPE:    Copy + channel strategy only. No invented stats; any number comes from §2 / the CSV. No shame, no false urgency.
ESCALATE: If a claim needs proof FlexHaus does not have, soften it or drop it.
```

### 🟣 PURPLE: you, the orchestrator + quality gate
```
ROLE:     Sequence the crew, enforce handoffs, run Cold Verify, and STOP before publishing.
DO:       After Blue ships, re-task Yellow as a COLD VERIFIER (see §7) blind to the build reasoning. Only you decide it is done.
```

---

## 5. The artifact: a three.js "spectacular" comeback-booking page (MANDATORY)

This is Variation 2's defining instruction. The page is **not** a flat form. It is a short,
kinetic, scroll-driven WebGL experience that turns a guilty lapse into an easy return and ends
in a one-tap booking.

**Concept: "The Comeback."** On load, a single slow pulse of light travels along a 3D line in
the dark (a heartbeat at rest). As the visitor scrolls, the pulse quickens and the camera moves
through a stylised, volumetric-lit FlexHaus space: the rig, the studio, motes of chalk-dust
catching light, the energy visibly building from still to sprint. Personal line, big and warm:
*"Your spot's still here."* The journey ends in a single pool of Volt-green light where the
**comeback class** card hovers: the member's favourite class and the next easy off-peak slot
pre-selected, one tap to book. On success the card pulses and the line of light races to full.

**Required scenes (scroll-driven):**
1. **The resting pulse → headline** (hero). A slow heartbeat line in the dark. Headline: *"Your spot's still here."* Sub: the one-line, no-shame promise. One CTA: *Book your comeback class*.
2. **Momentum builds**: fly-through of the stylised gym space (rig, studio, chalk-dust GPU particles), the pulse accelerating, 2-3 short lines that reframe the lapse as a return.
3. **The proof**: three "why now" beats (one class to restart, your favourite is on Tuesday, we held the spot) rising out of the dark; optionally one honest stat computed from the CSV.
4. **The comeback card**: Volt-green pool of light, the booking card with class + slot pre-filled, the actual booking/lead-capture form. Success state: the card pulses, the heartbeat line races to full.

**Technical requirements (Blue must meet all):**
- **three.js r160+**, vanilla; ES modules via CDN import map is fine for a static GitHub Pages deploy.
- **GPU/points particles** for chalk-dust and the pulse; **postprocessing bloom** for the Volt-green glow; **InstancedMesh** if repeating geometry (lockers, lights). Keep draw calls low.
- **Scroll choreography:** camera + pulse speed driven by scroll progress (lerp/damp). No janky scrubbing.
- **Mobile-first performance:** this audience is on a phone. Interactive < 2.5s on a mid-range phone; 60fps target, never below 30fps; lean JS payload.
- **`prefers-reduced-motion`:** serve a still, strong hero and a normal scrolling page. Never trap a motion-sensitive user.
- **No-WebGL fallback:** detect failure, render a styled static hero + the booking form. Booking must work with zero 3D.
- **Accessibility:** keyboard-reachable form, visible focus rings, AA contrast (mind Volt-green on Carbon and on Chalk), real `<label>`s, alt text; canvas `aria-hidden` with real content in the DOM.
- **The form:** captures the booking intent (class + slot + contact) with a plain-English consent/opt-out line; no pre-tick; success + error states; wired to a free-tier provider or a documented `mailto`/Formspree fallback so it genuinely captures.
- **Deploy:** GitHub Pages. Hand back the live URL.

If any 3D ambition threatens the mobile-performance or accessibility bars, **cut the ambition,
not the bars.** A fast, accessible, slightly-less-lavish page that books a class beats a gorgeous
one that drops on a phone.

---

## 6. Deliverables checklist

- [ ] `diagnosis.md`: at-risk segment defined + sized (headcount, €/month, €/year), the second-class cliff and ~2x lift evidenced from `flexhaus_bookings.csv`, the one metric.
- [ ] `design-spec.md`: sections, 3D concept, scroll choreography, states, fallback, a11y plan.
- [ ] `/site` + **live GitHub Pages URL**: the three.js comeback-booking page, form working, fallbacks working, fast on a phone.
- [ ] `marketing.md`: 3-touch win-back sequence + 2 Instagram posts, GDPR-clean, warm not shaming, no invented stats.
- [ ] `cold-verify.md`: the §7 report.

---

## 7. Cold Verify + STOP gate (do not skip)

Before you call this done, re-task **Yellow as a fresh cold verifier**, blind to how the work was
made, against these frozen criteria. Score each pass/fail with the evidence:

1. **Diagnosis is data-bound:** the member panel was rebuilt from `flexhaus_bookings.csv`; the at-risk segment has a precise rule, a headcount, and a €/year figure with visible maths; the ~2x cliff is shown. The query is stated and reconciles with the §2 summaries.
2. **One metric, not five:** the campaign names a single primary metric (e.g. comeback-class bookings, or 30-day churn of the at-risk cohort) and everything serves it.
3. **The page actually runs on a phone:** the GitHub Pages URL loads on mobile; the 3D scene renders; the booking form captures; reduced-motion and no-WebGL fallbacks both work.
4. **On-brand, on-voice:** page and messages share the "Comeback / we saved you a spot" spine and the §3 warm-not-shaming voice. None of it is generic enough to belong to any other gym.
5. **GDPR-clean and kind:** clear opt-out, no pre-tick, no shame, no false urgency.
6. **No hallucinated facts:** nothing claims a number that is not computed from the CSV (or is marked `[ASSUMPTION]`).

**Catch the octopus lying.** Find and screenshot ONE moment a specialist got something wrong (a
hallucinated stat, a dropped handoff, an off-brief or shaming line, a broken 3D fallback on
mobile). Name it in one line. That catch is the point of the exercise. Only after the cold verify
and the catch do you, the Purple Manager, lift the STOP gate and ship.

---

## 8. How this will be judged (and why this file exists)

This is the **rich harness**. Its twin is an empty brief. When the two run side by side, the
difference between them is the entire lesson: *the model did not get smarter, the context did.*
A vague ask yields a generic "join now" page and invented numbers. This file yields a member
panel rebuilt from real data, a named and sized at-risk segment, a branded one-tap comeback
experience, warm win-back copy, and a verifier that catches the lie. The harness is the work.
