# AI Badge: Micro-LMS Handoff Document

**Date:** 2026-03-25 (evening session)
**Author:** Claudus (session handoff)
**Commit:** `2095555`

---

## What This Project Is

AI Badge is a **micro-LMS** (Udemy/Coursera style) for AI competency training. Enrolled users consume sequential tutorials (video-based screen recordings hosted on YouTube, unlisted), complete an AI Competency Explorer assessment, and track progress over time.

**Live at:** https://aibadge.fiveinnolabs.com/
**Repo:** https://github.com/victordelrosal/aibadge.git

---

## Current State

### Architecture

- **Single `index.html` SPA** with Alpine.js, hash-based routing (`#/`, `#/lesson/{moduleId}/{lessonId}`, `#/admin`)
- **`explore.html`**: Standalone AI Competency Explorer assessment page (also detects logged-in users)
- **`assets/js/firebase-app.js`**: Firebase integration layer (auth, Firestore CRUD, admin queries)
- **Firebase Hosting** + **Firestore** + **Firebase Auth** (Google popup + email/password)
- **Cloudflare Worker** for email reports via Resend (public assessment flow only)
- **No build step**: vanilla JS, Alpine.js from CDN, Firebase compat SDK from CDN

### What's Built and Working

1. **SPA Shell + Auth**
   - Sign-in modal (Apple sheet style) with Google sign-in + email/password + create account
   - Google auth uses `signInWithPopup` (redirect doesn't work across custom domains; COOP console warnings are harmless)
   - Three auth states: unauthenticated (landing), logged in not enrolled (access required), logged in enrolled (dashboard)
   - Admin detection for both `victor@fiveinnolabs.com` and `victordelrosal@gmail.com`
   - Auto-creates Firestore profile for ALL new users with `{ email, enrolled: false, createdAt }`
   - Admin emails auto-enrolled on first sign-in

2. **Student Dashboard**
   - Flat tutorial cards (NOT grouped modules; each tutorial is independent)
   - Dark/light mode toggle with localStorage persistence
   - Scrolling code background pattern
   - Completion checkmarks on dashboard cards (only place for completion tracking, removed from lesson views)
   - "Explorer" link in topbar opens `explore.html` in new tab
   - "Admin" link visible only to admin emails
   - Explorer History section at bottom showing past assessment scores with mini dimension bars

3. **Lesson View**
   - Data-driven with `x-if` per `activeLessonId`
   - Two tutorials live: `what-is-html` (Hello World) and `hello-world-2` (Hello World 2)
   - Two tutorials pending (greyed out): `deploy-github`, `opencode-setup`
   - Each lesson has: YouTube embed, slides PDF download, quick start guide, transcript
   - Dark topbar matching dashboard style

4. **Admin Panel** (`#/admin`)
   - Shows all registered users with email, signup date, enrollment status
   - iOS-style toggle switches to enable/disable enrollment
   - **KNOWN ISSUE**: Toggle may not work. The `toggleEnrolled` function writes directly to Firestore (`firebase.firestore().collection('users').doc(u.id).set(...)`) but this hasn't been confirmed working yet. Debug by checking browser console when clicking toggle.
   - Dark/light mode support

5. **AI Competency Explorer** (`explore.html`)
   - Detects logged-in users via Firebase auth (fixed variable scoping: `firebase-app.js` uses `var` for `app`, `auth`, `db`)
   - Post-load script block calls `setupAuthListener()` after `firebase-app.js` loads
   - Logged-in users see "Save & View Report" button (no email input, saves Resend credits)
   - Saves to `users/{uid}/explorer_history/{auto-id}` for progress tracking
   - Public users still get email gate flow with Resend email
   - All `portal.html` references replaced with `index.html#/`

6. **YouTube Upload Pipeline**
   - Script at `~/.youtube-upload-credentials/upload_youtube.py`
   - OAuth2 with cached token, Google Cloud project `ai-badge-2026`
   - Usage: `python3 upload_youtube.py --file VIDEO.mp4 --title "Title" --privacy unlisted`

7. **Pricing**
   - Weekly: €75/week (€450 total for 6 weeks)
   - Upfront: €395 (save €55)

### Firestore Structure

```
users/{uid}
  - email, enrolled (boolean), createdAt, updatedAt, lastActiveAt
  - noteForVictor
  /assessments/{baseline|final}
    - scores, tier, archetype, flags, score, completedAt
  /explorer_history/{auto-id}
    - scores, tier, archetype, flags, score, completedAt
  /weeks/{weekNum}/exercises/{exerciseId}

programmes/default
public_assessments/{auto-id}
```

### Firestore Rules (`firestore.rules`)

- `isAdmin()` checks both admin emails
- Users can read/write their own docs
- Admin can read AND write all user docs (needed for enrollment toggle)
- `explorer_history` subcollection: owner read/write, admin read

### Tutorial Data Model

Flat array in `window._lmsTutorials`:
```javascript
{ id, moduleId, title, icon, iconBg, level, durationMinutes, type, pending? }
```

Tutorial assets convention: `tutorials/{id}/{id}.mp4`, `{id}.pdf`, `{id}.pptx`

### Key Technical Decisions

- **`var` not `let`** in `firebase-app.js` for `app`, `auth`, `db`: required because `explore.html` accesses these from a separate `<script>` block
- **Popup not redirect** for Google Sign-In: redirect loses auth state between `firebaseapp.com` and custom domain `aibadge.fiveinnolabs.com`
- **No build step**: everything is vanilla JS, CDN libraries, single HTML files
- **Completion tracking only on dashboard**: removed "Mark as Complete" buttons from lesson views to avoid duplication

### Known Issues / TODO

1. **Admin toggle**: needs verification that the enrollment toggle actually works (Firestore write). Check console for errors when clicking.
2. **Explorer save stuck on "Saving..."**: was fixed by using `firebase.firestore()` directly, but needs confirmation.
3. **`getAllUsers: not authorised` console warning**: fires when admin panel code runs before auth is ready. Harmless (auth listener retries), but noisy.
4. **Pending tutorials**: "Deploy to GitHub" and "OpenCode Setup" are greyed out, need content.
5. **`assets/js/firebase-app.js` cache header** is set to 1 year immutable. After changes, users may need hard refresh. Consider adding cache-busting query param.

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Main SPA (landing, dashboard, lesson views, admin, sign-in modal) |
| `explore.html` | AI Competency Explorer (standalone assessment) |
| `assets/js/firebase-app.js` | Firebase integration layer |
| `firestore.rules` | Firestore security rules |
| `firebase.json` | Firebase hosting config |
| `docs/HANDOFF.md` | This file |
| `tutorials/hello-world/` | First tutorial assets |
| `tutorials/hello-world-2/` | Second tutorial assets |
