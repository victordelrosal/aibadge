# AI Badge: Handoff Document

**Last updated:** 2026-04-08 (afternoon session)
**Latest commit:** `d73a2a0`

---

## What This Project Is

AI Badge is a **micro-LMS** (Udemy/Coursera style) for AI competency training. Enrolled users consume sequential tutorials (video-based screen recordings hosted on YouTube, unlisted), complete an AI Competency Explorer assessment, and track progress over time. It includes a booking system with Stripe payments, automated email reminders, and digital credentialing via Certifier.

**Live at:** https://aibadge.fiveinnolabs.com/
**Repo:** https://github.com/victordelrosal/aibadge.git

---

## Architecture

- **Single `index.html` SPA** with Alpine.js, hash-based routing (`#/`, `#/lesson/{moduleId}/{lessonId}`, `#/admin`)
- **`explore.html`**: Standalone AI Competency Explorer assessment page (also detects logged-in users)
- **`portal.html`**: Enrolled student dashboard (tutorials, exercises, profile)
- **`login.html`**: Dedicated login page (redirects to portal.html)
- **`guidelines.html`**: Canonical source of truth for programme guidelines (6 items)
- **`terms.html`** / **`privacy.html`**: Legal pages
- **`assets/js/firebase-app.js`**: Firebase integration layer (auth, Firestore CRUD, admin queries)
- **Firebase Hosting** + **Firestore** + **Firebase Auth** (Google popup + email/password)
- **Cloudflare Worker** (`worker/index.js`): Slot booking, Stripe webhooks, email reminders, calendar integration, enrollment verification
- **No build step**: vanilla JS, Alpine.js from CDN, Firebase compat SDK from CDN
- **Firebase SDK version: 10.8.0** across ALL pages (version alignment is critical; see Lessons Learned)

---

## Booking & Payment System (added 2026-04-07/08)

### Slot System (Cloudflare KV)
- 13 coaching slots: 7 Wednesday (12:00-19:30), 6 Thursday (12:00-19:30)
- Start dates: Wed 22 Apr 2026, Thu 23 Apr 2026
- Each slot: 20 min session, weekly for 6 weeks
- KV namespace ID: `e11a3cbfa9df4a52b4b41091db6e4250`
- Slot IDs: `wed-1` through `wed-7`, `thu-1` through `thu-6`
- `wed-5` (14:00) is pre-booked (Helen, real paying customer)

### Stripe Integration
- Two plans: Weekly (EUR 90/week subscription, 6 payments) or Upfront (EUR 495 one-time)
- Weekly subscriptions auto-cancel after 6 weeks via scheduled cancellation
- Hold system: 15-min hold with token, released on expiry or payment
- Webhook: `POST /api/webhook` handles `checkout.session.completed` and `checkout.session.expired`

### Booking Flow
1. User selects slot + plan on landing page
2. `POST /api/hold` creates 15-min hold, returns Stripe checkout URL
3. User completes Stripe payment
4. Webhook confirms booking, creates 6 Google Calendar events, sends confirmation email
5. User clicks "Sign In" in email or success modal
6. On login, `/api/check-enrollment` verifies paid booking, auto-enrolls user

### Sign-Up Gating (IMPORTANT)
- **Only paying users can create accounts.** Sign-up is gated behind Stripe payment verification.
- Email/password registration checks `/api/check-enrollment` before creating the Firebase Auth account
- Google sign-in checks enrollment after auth; signs out unpaid users with error message
- Admins (`victor@fiveinnolabs.com`, `victordelrosal@gmail.com`) bypass the check
- Existing enrolled users are not affected

### Auto-Enrollment
- On login, `onAuthStateChanged` in `index.html` auto-sets `enrolled: true` for any profile that doesn't have it
- This handles a race condition where `updateLastActive()` creates a sparse Firestore doc before the profile setup code runs
- `/api/check-enrollment?email=` checks if an email has a booked slot in KV

---

## Email System (Cloudflare Worker + Resend)

### Booking Confirmation Email
- Sent immediately after Stripe payment via Resend API
- Shows: participant name (big), "Welcome to the AI Badge!", styled schedule card with dates, plan details
- Buttons: "Add to Google Calendar" (direct URL, NOT API redirect), "Download .ics", "Sign In to AI Badge"
- Links to Programme Guidelines

### Session Reminders (Cron)
- Cron: `0 * * * *` (every hour)
- Two reminder types: 24h before (23-25h window) and 3h before (2.5-3.5h window)
- KV dedup keys: `reminder:24h:{slotId}:w{week}` and `reminder:3h:{slotId}:w{week}` with 48h TTL
- Dublin timezone offset (UTC+1) applied
- Empty emails skipped, failed sends don't write dedup key (retry next hour)
- Links to Programme Guidelines in footer

### Email Configuration
- Resend API key in Worker env vars
- From: `AI Badge <victor@fiveinnolabs.com>` (fiveinnolabs Resend account, verified domain)
- Must use fiveinnolabs account, not victordelrosal account

---

## Calendar Integration

### Google Calendar (Victor's coaching calendar)
- Service account creates 6 weekly events on Victor's calendar after booking
- Calendar ID: `fe025ce167a5b...@group.calendar.google.com`
- Events include client name, email, plan, and instructions

### Google Calendar (Learner)
- "Add to Google Calendar" button in confirmation email uses direct `calendar.google.com/calendar/render` URL
- IMPORTANT: Do NOT use `/api/gcal/` endpoint (KV eventual consistency causes "Slot not booked" errors)
- Success modal also builds gcal URL client-side

### .ics Download (Apple/Outlook)
- `GET /api/calendar/{slotId}` generates ICS file with 6 weekly VEVENT entries
- Dublin timezone (Europe/Dublin)

---

## Programme Guidelines

- **Canonical source:** `guidelines.html` (6 items: Google Meet, come prepared, rescheduling, missed sessions, consumer protection, 100% guarantee)
- **Modal in index.html:** Loads dynamically from `guidelines.html` via `fetch` + `DOMParser`
- **`openGuidelines()` function:** Exposed to global scope via `window.openGuidelines = openGuidelines;`
- Consent checkbox links to guidelines modal (T&Cs and Privacy links inside modal footer)
- Email links point to `aibadge.fiveinnolabs.com/guidelines.html`

---

## Digital Credentialing

- Platform: **Certifier** (free tier, 250 credentials/month)
- Badge image: `assets/img/ai-badge-credential.png`
- Credential showcase section on landing page with badge image and skill tags
- Issued after successful completion of all 6 weeks + learning objectives

---

## Pitch Deck

- `welcome/create_pitch_deck.py`: Python script generating 8-slide pitch deck using python-pptx
- `welcome/ai-badge-pitch.pptx`: Generated deck
- 8 slides: Hook, Agitate (stats), Solution, How It Works, What You Earn, Your Coach, Guarantee, CTA
- Brand colors: Navy (#000036), Gold (#D4AF37), White

---

## Critical Lessons Learned

### From 2026-03-25 (original session)

1. **Firestore Persistence is DISABLED** (on purpose). Was causing IndexedDB hangs. Do NOT re-enable.
2. **Firebase SDK Version Must Match** across ALL pages (currently 10.8.0)
3. **COOP Header Required** for Google Sign-In popup (`firebase.json`)
4. **Auth Flow Has 5s Timeout**, Assessment Save Has 8s Timeout
5. **`completedAt` Uses ISO Strings**, not `serverTimestamp`
6. **JS Cache Header is 1 Year** on `assets/js/**`. Consider cache-busting.
7. **Deploy Firestore Rules Explicitly**: `firebase deploy --only hosting,firestore:rules`
8. **Admin Can Write to All Subcollections**

### From 2026-04-08 (this session)

9. **KV Eventual Consistency**: Never use API redirects that read KV for user-facing links. Build URLs client-side or embed them in emails directly. The `/api/gcal/` endpoint fails on first click due to KV propagation lag.
10. **`updateLastActive()` Race Condition**: This function uses `.set({lastActiveAt}, {merge: true})` which creates a sparse Firestore doc. If it runs before `onAuthStateChanged` profile creation, the new-user branch is skipped (profile exists but has no `enrolled` field). Fixed by unconditionally setting `enrolled: true` for any profile without it.
11. **`openGuidelines` Scoping**: Functions defined inside scoped script blocks in `index.html` are not accessible from inline `onclick` handlers. Must expose via `window.openGuidelines = openGuidelines;`.
12. **Deleting Firebase Users**: Use REST API from terminal (Firebase CLI has no `auth:delete` command). Get access token via refresh token exchange, then call `identitytoolkit.googleapis.com` and Firestore REST API. UIDs from screenshots can have ambiguous characters (capital O vs zero).

---

## Worker API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/slots` | GET | List all slots with status, booking info, dates |
| `/api/hold` | POST | Hold a slot for 15 min, return Stripe checkout URL |
| `/api/webhook` | POST | Stripe webhook (checkout completed/expired) |
| `/api/init` | POST | Re-initialize all slots from defaults |
| `/api/calendar/{slotId}` | GET | Download .ics file for booked slot |
| `/api/gcal/{slotId}` | GET | Redirect to Google Calendar (AVOID: KV consistency issues) |
| `/api/check-enrollment` | GET | Check if email has a booked slot (`?email=`) |

---

## Success Modal (post-booking)

Shows after Stripe redirect with `?booking=success&slot={slotId}`:
- Confirmation email address (big bold font)
- Schedule: day, time, 6-week date range
- "Add to Google Calendar" (direct URL, built client-side)
- "Download .ics" 
- "Sign In to AI Badge" button
- "Got It" dismiss button

---

## Firestore Structure

```
users/{uid}
  - email, enrolled (boolean), createdAt, updatedAt, lastActiveAt
  - displayName, plan, slotLabel (set by auto-enrollment)
  - noteForVictor
  /assessments/{baseline|final}
  /explorer_history/{auto-id}
  /weeks/{weekNum}/exercises/{exerciseId}
  /logins/{auto-id}
  /tutorial_completions/{tutorialId}

programmes/default
public_assessments/{auto-id}
```

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Main SPA (landing, booking, dashboard, lessons, admin, sign-in modal) |
| `explore.html` | AI Competency Explorer (standalone assessment) |
| `portal.html` | Enrolled student dashboard |
| `login.html` | Dedicated login page |
| `guidelines.html` | Programme guidelines (canonical source) |
| `terms.html` | Terms and conditions |
| `privacy.html` | Privacy policy |
| `assets/js/firebase-app.js` | Firebase integration layer (auth, Firestore CRUD) |
| `assets/img/ai-badge-credential.png` | Badge credential image |
| `firestore.rules` | Firestore security rules |
| `firebase.json` | Firebase hosting config (headers, caching, COOP) |
| `worker/index.js` | Cloudflare Worker (booking, Stripe, emails, reminders, calendar) |
| `worker/wrangler.toml` | Worker config (KV binding, cron, env vars) |
| `welcome/create_pitch_deck.py` | Pitch deck generator |
| `docs/HANDOFF.md` | This file |
| `tutorials/{id}/` | Tutorial assets (mp4, pdf, pptx) |

---

## Key Technical Decisions

- **`var` not `let`** in `firebase-app.js` for `app`, `auth`, `db`: required because `explore.html` accesses these from a separate `<script>` block
- **Popup not redirect** for Google Sign-In: redirect loses auth state between `firebaseapp.com` and custom domain
- **No build step**: everything is vanilla JS, CDN libraries, single HTML files
- **No Firestore persistence**: disabled due to IndexedDB hangs (see Lessons Learned)
- **Direct calendar URLs**: Never use API redirects for calendar links (KV consistency)
- **Sign-up gated behind payment**: Only users with confirmed Stripe bookings can create accounts

---

## Tutorial Pipeline

Skill: `aibadge-tutorial` (in `~/.claude/skills/aibadge-tutorial/SKILL.md`)

**YouTube IDs:**
| Tutorial | YouTube ID |
|----------|-----------|
| Hello World | `IUHs60kWwdE` |
| Hello World 2 | `69KTw0ViJYY` |
| Retro Game | `QeEE1cOq5Sw` |

---

## Pricing (current)

- Weekly: EUR 90/week (subscription, 6 payments = EUR 540 total)
- Upfront: EUR 495 (one-time, 6-week programme)

---

## TODO / Open Items

1. **JS cache-busting**: Add version query params to script tags or reduce `max-age`
2. **API key restrictions**: Add HTTP referrer restrictions in Google Cloud Console
3. **Pending tutorials**: "Deploy to GitHub" and "OpenCode Setup" need content
4. **Stripe live mode**: Currently using test keys; switch to live for production
5. **Helen's slot**: `wed-5` is pre-booked for Helen (heathermomalley@gmail.com), real paying customer. Do NOT touch.
