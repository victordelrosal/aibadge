# AI Badge Platform Design

**Date:** 13 March 2026
**Status:** Approved
**Launch target:** 25 March 2026 (Heather's start date)

---

## Overview

The AI Badge platform is a one-to-one AI coaching practice built around the AI Competency Explorer. It replaces the cohort-based HELIOS model with rolling individual admission, personalised coaching, and measurable before-and-after competency progression.

The platform lives at `aibadge.fiveinnolabs.com`.

---

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no frameworks, no build step)
- Firebase Authentication (email/password)
- Cloud Firestore (user data, assessments, progress)
- Firebase Hosting
- Single-file components (following radar-explorer.html pattern)

---

## Site Architecture

```
aibadge.fiveinnolabs.com/
├── index.html              Landing page (public, conversion-focused)
├── explore.html            Full AI Competency Explorer (dual-audience)
├── portal.html             Client portal (Firebase auth-gated)
├── login.html              Login page
├── assets/
│   ├── css/style.css       Shared design system (Helios-derived)
│   ├── js/
│   │   ├── explorer-lite.js    Simplified radar for landing page hero
│   │   ├── explorer-full.js    Full Explorer with all features
│   │   ├── firebase-app.js     Auth + Firestore integration
│   │   └── portal.js           Client portal logic
│   └── img/                Logos, headshots, assets
└── firebase.json           Firebase hosting config
```

---

## Page 1: Landing Page (index.html)

### Design Language
- Helios-derived: deep blue (#000036 to #050c91) gradients, gold (#D4AF37) accents
- Inter (body) + Playfair Display (headlines)
- White-to-gray inter-section gradient transitions (no harsh light/dark alternation)
- Company logo scroller for credibility
- Premium, clean, high-touch feel

### Auth-Aware Behaviour
- On load, check Firebase auth state
- If authenticated: show top banner "Welcome back, [name]. Go to your portal" with link
- No redirect (user may be sharing the page)

### Section Flow

1. **Hero** (dark blue gradient)
   - Live simplified radar Explorer (Layer 1)
   - 6 sliders, small radar chart, instant score + tier label
   - Must load instantly, zero friction, no spinners
   - "Why this matters" woven into subheadline, not a separate section
   - CTA: "Get your full assessment"

2. **The Six Dimensions** (white-to-light-gray)
   - Visual grid of 6 competency areas
   - Brief description of each
   - Grounded in UNESCO, Turing, DigComp, EU AI Act, OECD

3. **How It Works**
   - 4-step pipeline: Assess, Calibrate, Coach, Prove
   - Icons + short descriptions

4. **Who This Is For**
   - 2-3 lines: mid-career professionals, non-technical, AI-curious, want structure
   - Lets the right people self-select

5. **What You Get**
   - 6-week programme breakdown
   - Session format, guided exercises, recorded tutorials, weekly check-ins
   - Flexibility: pauses allowed, pace is human

6. **Meet Your Guide**
   - Victor's full credibility section
   - Company logo scroller (PwC, Intel, BT Sourced, Workhuman, Tirlan, etc.)
   - Teaching awards (National Forum T&L, NCI President's Award)
   - Books: Disruption, HUMANLIKE
   - Education: Tec de Monterrey, UCD Smurfit, Oxford, Harvard
   - Ohtli Prize
   - Embedded video (if available)

7. **Testimonials**
   - Audited for one-to-one fit (no cohort/group/Zoom references)
   - Carousel format carried from Helios

8. **Pricing**
   - Single tier: €285
   - Anchored against €1,200 (HELIOS-era published rate)
   - What's included list
   - CTA: "Start your journey"

9. **FAQ**
   - Adapted for one-to-one format
   - Accordion style

10. **Footer**
    - fiveinnolabs branding, contact

---

## Page 2: Full Explorer (explore.html)

### Dual-Audience Design

**Public visitors (not logged in):**
- Email capture gate before full assessment
- ~20 calibrated questions across 6 dimensions (Layer 2)
- Results shown with full radar, tier, archetype, framework gauges
- CTA: "Enquire about coaching"

**Logged-in clients:**
- Skip email gate entirely
- Direct access to full assessment
- Results save automatically to Firestore under their user profile
- Used for both baseline (Week 1) and reassessment (Week 6)
- Comparison/overlay mode shows baseline vs current (the "reveal" moment)

### Visual Design
- Full radar-explorer.html functionality
- Adapted to Helios colour tokens (deep blue fills, gold on active tier)
- All features: sliders, presets, detail panels, framework gauges, archetypes, flags
- Comparison mode designed to feel like a reveal, not just two charts

---

## Page 3: Client Portal (portal.html)

### Access
- Firebase auth-gated
- Redirect to login.html if not authenticated

### Layout
- Header bar: AI Badge logo, "Welcome, [name]", logout
- Left nav: Dashboard, Exercises (Tutorials and Profile added later)
- Main content area

### Dashboard View (default)
- **Full radar chart** front and centre (current assessment)
- **Current week card**: "Week 3 of 6" with focus description
- **Next check-in card**: date, time, platform
- **This week's exercises**: checklist with completion states
- **Schedule**: embedded card showing all 6 weeks, pause weeks marked
- **Notes for Victor**: single text box, saves to Firestore, overwritten each time

### Exercises View
- All 6 weeks listed
- Each week expandable: exercises with title, description, completion checkbox
- Completion states save to Firestore in real-time
- Past weeks shown as completed/incomplete summary
- Current week expanded by default

### Tutorials View (placeholder at launch)
- Shell page: "Tutorials coming soon"
- Built out during weeks 1-2 of programme

### Profile View (placeholder at launch)
- Shell page with name, email, start date
- Baseline vs final comparison added before Week 6

---

## Page 4: Login (login.html)

- Clean, minimal
- Firebase email/password auth
- AI Badge branding
- "Forgot password" flow
- Redirect to portal.html on success

---

## Firebase Data Model

### Collection: users/{userId}

```
{
  email: "heather@example.com",
  name: "Heather",
  startDate: "2026-03-25",
  currentWeek: 3,
  pauseWeeks: ["2026-04-08"],
  checkInDay: "Tuesday",
  checkInTime: "19:00",
  checkInPlatform: "Teams",
  pricePaid: 285,
  status: "active",               // active | paused | completed
  noteForVictor: "Struggling with the image gen exercise...",
  watchedTutorials: ["t1", "t3"],
  lastActiveAt: timestamp,
  createdAt: timestamp
}
```

### Subcollection: users/{userId}/assessments/{baseline|final}

```
{
  scores: {
    aiFoundations: 2,
    criticalEvaluation: 1,
    productiveCreation: 2,
    technicalBuilding: 1,
    ethicsGovernance: 3,
    toolFluency: 2
  },
  tier: "AI Explorer",
  archetype: "Developing",
  flags: [...],
  completedAt: timestamp
}
```

### Subcollection: users/{userId}/exercises/week{N}

```
{
  exercise1: { title: "Prompt crafting basics", completed: true, completedAt: timestamp },
  exercise2: { title: "Image generation workflow", completed: false },
  exercise3: { title: "Workflow automation", completed: false }
}
```

### Collection: programmes/default

```
{
  weeks: [
    {
      week: 1,
      focus: "Baseline assessment, orientation, first guided exercises",
      exercises: [
        { id: "e1", title: "...", description: "..." },
        { id: "e2", title: "...", description: "..." },
        { id: "e3", title: "...", description: "..." }
      ]
    },
    ...
  ],
  tutorials: [
    { id: "t1", title: "...", url: "...", week: 1 },
    ...
  ]
}
```

### Design Principles
- currentWeek advanced manually by Victor (no automation)
- noteForVictor is a single string, overwritten each time (not a thread)
- All collections queryable across clients for admin view
- Programme template instantiated per client (not duplicated)

---

## Pre-Launch Tasks

### Before 25 March

1. Set up Firebase project (Auth, Firestore, Hosting)
2. Build landing page with live simplified Explorer in hero
3. Build full Explorer page with dual-audience logic and Firestore integration
4. Build client portal (Dashboard + Exercises views)
5. Build login page
6. Configure aibadge.fiveinnolabs.com DNS
7. Create Heather's account and programme instance
8. Prepare Week 1 exercises
9. Audit Helios testimonials for one-to-one fit
10. Deploy

### During Programme (Weeks 1-2)

11. Build out Tutorials page with recorded content
12. Build out Profile page
13. Record first batch of tutorial videos
14. Refine exercises based on Heather's feedback

### Before Week 6

15. Ensure comparison/overlay mode works for reassessment reveal
16. Build before-and-after view on Profile page

---

## Design References

- Helios landing page: `sBs/helios/index.html`
- Radar Explorer: `sBs/AI-competency-mapping/radar-explorer.html`
- AI Competency Framework: `sBs/AI-competency-mapping/COMPOSITE-FRAMEWORK.md`
- Level Descriptors: `sBs/AI-competency-mapping/LEVEL-DESCRIPTORS.md`
- Foundation Brief: `~/Downloads/ai-coaching-practice-foundation-brief-v2.md`
- AI Badge React (reference): `sBs/AIbadge-prev/`
- AI Badge Astro (reference): `sBs/backup-old-misc-archive/AI-badge/`

---

*This is the approved design document. Implementation begins from here.*
