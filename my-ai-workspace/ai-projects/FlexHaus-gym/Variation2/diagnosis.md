# diagnosis.md: 🟡 Margot, lapsed-customer cohort analyst

**Source of truth:** `inkwell_pos_transactions.csv` (30,569 line rows → 18,819 baskets, 24 months 2024-06 to 2026-05, 9 branches). Method: group lines by `basket_id`; "two years ago" = first 6 months (2024-06 to 2024-11), "now" = last 6 months (2025-12 to 2026-05). Every figure below is computed from the CSV; where I lean on a §2 summary I say so. 55.4% of rows carry `member_age_band = unknown`; I reason on the **known-age** subset for cohort shares and flag the bias rather than discard the rows.

---

## The target cohort (named)

**"The Camden-Street Twenty-Somethings": lapsed under-35 readers (Under 25 + 25-34), concentrated in the student-heavy branches (Maynooth, Galway), who bought fiction at the counter, never carried the stamp card, and have quietly stopped coming.**

This is the one segment that is both *bleeding fastest* and *reachable* (they want events and a phone-native card; the over-50s are loyal and need nothing). The campaign is for them.

---

## Size of the prize (maths shown)

Two views: the CSV sample (representative shares) and the full-population scale (§2.1 totals).

**Sample evidence (computed):**
- Under-35 share of **known-age** revenue: **35.1% → 23.4%** (first6 → last6). Relative drop **−33%**.
  - first6: under-35 €13,925 / known €39,715 = 35.1%
  - last6:  under-35 €7,918 / known €33,814 = 23.4%
- Under-35 **absolute** sample spend: €13,925 → €7,918 = **−43%**.
- These reconcile with §2.2 (37% → 22% of revenue), so the sample is trustworthy.

**Full-population prize (scaling on §2.1 = €372k blended monthly revenue):**
- Under-35 revenue now: 372,000 × 22% = **€81,840 / month**
- Under-35 revenue at the old share: 372,000 × 37% = **€137,640 / month**
- The monthly bleed: 137,640 − 81,840 = **€55,800 / month = €669,600 / year**
- Recover just **one third** of that gap: **+€18,600 / month ≈ €223,200 / year** on a €5,000 spend.

The prize is not "more emails". The prize is reversing a **~€670k/year** under-35 bleed; a one-third clawback returns the campaign's cost **~45×** in year one.

---

## Three root causes (each tied to a computed figure)

**1. There is no way to reach them, so they forget the shop exists.**
- Computed: `stamp_card_used = Y` on **6.1%** of baskets (1,157 / 18,819), and under-35s use it *less* than the old guard: **11.6%** of under-35 baskets vs **17.3%** of over-50 baskets carry a stamp.
- Voice of customer (§1): *"I only remember it exists when I walk past it"* / *"Inkwell has never emailed me once."*
- Read: the only loyalty mechanic is paper, the under-35s don't carry it, and digital records = 0 (§2.4). No list = no re-engagement. This is the wound the campaign closes.

**2. The decline is steepest exactly where the under-35s are: the student branches.**
- Computed (monthly-avg baskets, first6 → last6): **Maynooth −31.5%** (44.5 → 30.5), **Galway −27.8%** (134.8 → 97.3), Dundrum −25.1%; chain total −21.6%. Query: count distinct `basket_id` per `branch` per window, divide by 6.
- These are the most student-adjacent branches (§2.1) and they fell hardest, mirroring the §2.1 footfall figures (Maynooth −34%, Galway −30%). The bleed is geographically the young bleed.

**3. Revenue is being propped up by price, not by people; and Inkwell isn't catching the categories under-35s actually buy.**
- Computed: AOV **€17.77 → €19.13** (+7.6%) while baskets per window **fell** (5,248 → 4,113). Fewer people, paying more, masks the loss in the monthly totals (the §1 "board complacency").
- Computed: Romantasy held at **5.1% → 5.3%** of units and YA **6.3% → 6.4%**, essentially flat while these are the fastest-growing under-35 categories nationally (§2.3/§2.6). Among known under-35 baskets, Romantasy is still only 6.5% of units. Inkwell is **under-indexing the BookTok shelf** its lost cohort lives on.

---

## The ONE metric

**Emails captured from under-35 readers** (a named, consented, reachable list where today there are zero).

Everything serves it. It is the missing organ: with it, Inkwell can run the win-back, the events, and the next two Christmases. Without it, every future campaign starts again from a rubber stamp. Target for the 6-week window: **[ASSUMPTION] 2,000 consented sign-ups** (≈ enough to seed a list and prove the channel), skewed under-35 via channel choice (BookTok/Instagram, student branches).

**Scope honesty:** the CSV has no customer identity field, so I cannot track an individual's repeat visits or compute true RFM recency per person; that absence *is* the finding (root cause 1). All cohort shares are on the 44.6% of rows with a known age band; the direction is robust (it matches §2.2), the absolute under-35 counts are understated by the unknown bucket.
