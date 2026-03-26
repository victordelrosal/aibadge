# AI Badge: Handoff Document

**Last updated:** 2026-03-25 (night, post-tutorial pipeline session)
**Latest commit:** `2c1c128`

---

## What This Project Is

AI Badge is a **micro-LMS** (Udemy/Coursera style) for AI competency training. Enrolled users consume sequential tutorials (video-based screen recordings hosted on YouTube, unlisted), complete an AI Competency Explorer assessment, and track progress over time.

**Live at:** https://aibadge.fiveinnolabs.com/
**Repo:** https://github.com/victordelrosal/aibadge.git

---

## Architecture

- **Single `index.html` SPA** with Alpine.js, hash-based routing (`#/`, `#/lesson/{moduleId}/{lessonId}`, `#/admin`)
- **`explore.html`**: Standalone AI Competency Explorer assessment page (also detects logged-in users)
- **`assets/js/firebase-app.js`**: Firebase integration layer (auth, Firestore CRUD, admin queries)
- **Firebase Hosting** + **Firestore** + **Firebase Auth** (Google popup + email/password)
- **Cloudflare Worker** for email reports via Resend (public assessment flow only)
- **No build step**: vanilla JS, Alpine.js from CDN, Firebase compat SDK from CDN
- **Firebase SDK version: 10.8.0** across ALL pages (version alignment is critical; see Lessons Learned)

---

## Critical Lessons Learned (2026-03-25)

These are hard-won. Read before touching anything.

### 1. Firestore Persistence is DISABLED (on purpose)

`firebase-app.js` no longer calls `db.enablePersistence()`. It was causing IndexedDB hangs that blocked both sign-in (getUserProfile hung) and assessment saves (explorer_history writes hung). Symptoms: buttons stuck at "Saving...", users unable to reach dashboard after Google sign-in, no errors in console (operations queued silently).

**Do NOT re-enable persistence** without thorough multi-tab testing across fresh and returning users.

### 2. Firebase SDK Version Must Match Across ALL Pages

`explore.html` was on SDK 10.12.0 while `index.html` was on 10.8.0. Different SDK versions sharing IndexedDB with multi-tab persistence caused writes to hang. Currently all pages use **10.8.0**.

If upgrading the SDK, update ALL HTML files in one go:
- `index.html`
- `explore.html`
- `portal.html`
- `login.html`

### 3. COOP Header Required for Google Sign-In Popup

`firebase.json` includes `Cross-Origin-Opener-Policy: same-origin-allow-popups` on all HTML pages. Without this, the Google Sign-In popup cannot communicate the auth result back to the parent window. Do NOT remove this header.

### 4. Auth Flow Has a 5-Second Timeout

In `index.html`, the `onAuthChange` callback wraps `getUserProfile()` and `updateUserProfile()` in `Promise.race` with 5s timeouts. If Firestore is slow or unreachable, the user still gets signed in with a fallback profile. This prevents the dashboard from being permanently stuck on "loading".

### 5. Assessment Save Has an 8-Second Timeout

In `explore.html`, both `submitLoggedIn()` and `saveAssessment()` have 8s timeouts. If the Firestore write hangs, the report is shown anyway. The save may sync later if the connection recovers.

### 6. `completedAt` Uses ISO Strings, Not serverTimestamp

Assessment saves use `new Date().toISOString()` instead of `firebase.firestore.FieldValue.serverTimestamp()`. Server timestamps require a round-trip and could hang. The `formatDate` helper in explorer history handles both Firestore timestamps and ISO strings.

### 7. JS Cache Header is 1 Year

`firebase.json` sets `max-age=31536000` on `assets/js/**`. After changing `firebase-app.js`, users MUST hard-refresh or clear cache. Consider adding cache-busting query params (e.g., `firebase-app.js?v=2`) or reducing the TTL.

### 8. Deploy Firestore Rules Explicitly

`firebase deploy --only hosting` does NOT deploy Firestore rules. If you change `firestore.rules`, run:
```
firebase deploy --only hosting,firestore:rules
```

### 9. Firestore Rules: Admin Can Write to All Subcollections

As of this session, `isAdmin()` has write access to all subcollections (assessments, explorer_history, weeks, exercises). Previously only `isOwner()` could write, which was technically correct but adding admin as belt-and-suspenders.

---

## What's Built and Working

1. **SPA Shell + Auth**
   - Sign-in modal (Apple sheet style) with Google sign-in + email/password + create account
   - Google auth uses `signInWithPopup` (redirect fails across custom domains)
   - Three auth states: unauthenticated (landing), logged in not enrolled (access required), logged in enrolled (dashboard)
   - Admin detection for both `victor@fiveinnolabs.com` and `victordelrosal@gmail.com`
   - Auto-creates Firestore profile for ALL new users
   - Admin emails auto-enrolled on first sign-in

2. **Student Dashboard**
   - Flat tutorial cards (each tutorial is independent, NOT grouped modules)
   - Dark/light mode toggle with localStorage persistence
   - Completion checkmarks on dashboard cards (only place for completion tracking)
   - "Explorer" link in topbar opens `explore.html` in new tab
   - "Admin" link visible only to admin emails
   - Explorer History section at bottom showing past assessment scores

3. **Lesson View**
   - Three tutorials live: `what-is-html`, `hello-world-2`, `retro-game`
   - Two tutorials pending (greyed out): `deploy-github`, `opencode-setup`
   - Each lesson has: YouTube embed, slides PDF download, quick start, detailed guide, troubleshooting (most), transcript
   - Retro Game YouTube ID: `QeEE1cOq5Sw` (unlisted, fiveinnolabs account)

4. **Admin Panel** (`#/admin`)
   - Shows all registered users with email, signup date, enrollment status
   - iOS-style toggle switches for enrollment
   - **Note**: Toggle may have issues; verify in console when clicking

5. **AI Competency Explorer** (`explore.html`)
   - Logged-in users see "Save & View Report" button (no email needed)
   - Saves to `users/{uid}/explorer_history/{auto-id}`
   - Public users get email gate flow with Resend email
   - 8s save timeout with graceful fallback

6. **Pricing**: Weekly: EUR 75/week (EUR 450 total), Upfront: EUR 395

---

## Firestore Structure

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

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Main SPA (landing, dashboard, lesson views, admin, sign-in modal) |
| `explore.html` | AI Competency Explorer (standalone assessment) |
| `assets/js/firebase-app.js` | Firebase integration layer (auth, Firestore CRUD) |
| `firestore.rules` | Firestore security rules |
| `firebase.json` | Firebase hosting config (headers, caching, COOP) |
| `docs/HANDOFF.md` | This file |
| `tutorials/hello-world/` | First tutorial assets (mp4, pdf, pptx) |
| `tutorials/hello-world-2/` | Second tutorial assets (mp4, pdf, pptx) |
| `tutorials/retro-game/` | Third tutorial assets (mp4, pdf, pptx) |

---

## Key Technical Decisions

- **`var` not `let`** in `firebase-app.js` for `app`, `auth`, `db`: required because `explore.html` accesses these from a separate `<script>` block
- **Popup not redirect** for Google Sign-In: redirect loses auth state between `firebaseapp.com` and custom domain
- **No build step**: everything is vanilla JS, CDN libraries, single HTML files
- **No Firestore persistence**: disabled due to IndexedDB hangs (see Lessons Learned)
- **Completion tracking only on dashboard**: removed from lesson views to avoid duplication

---

## Tutorial Pipeline

A standardised skill exists for adding new tutorials: `aibadge-tutorial` (in `~/.claude/skills/aibadge-tutorial/SKILL.md`).

**Full e2e pipeline:** User provides video file, then:
1. Copy video to `tutorials/{id}/{id}.mp4`
2. Convert pptx to PDF via PowerPoint AppleScript
3. Upload video to YouTube (unlisted) via `~/.youtube-upload-credentials/upload_youtube.py`
4. Extract transcript from video via faster-whisper (not fabricated)
5. Add entry to `_lmsTutorials` array (active tutorials before pending ones)
6. Create lesson HTML template with 4 sections: Quick Start, Detailed Guide, Troubleshooting, Transcript

**YouTube IDs:**
| Tutorial | YouTube ID |
|----------|-----------|
| Hello World | `IUHs60kWwdE` |
| Hello World 2 | `69KTw0ViJYY` |
| Retro Game | `QeEE1cOq5Sw` |

**Upload credentials:** `~/.youtube-upload-credentials/` (fiveinnolabs@gmail.com OAuth, cached token).

---

## TODO / Open Items

1. **JS cache-busting**: Add version query params to script tags or reduce `max-age` on `assets/js/**`
2. **API key restrictions**: Add HTTP referrer restrictions in Google Cloud Console (Firebase key is public by design, but restrict to `aibadge.fiveinnolabs.com` and `ai-badge-2026.web.app`)
3. **Admin toggle verification**: Confirm enrollment toggle works end-to-end
4. **Pending tutorials**: "Deploy to GitHub" and "OpenCode Setup" need content
5. **Google email warning**: Addressed in API key restrictions above; not a security emergency
6. **Dark mode card styling**: Cards updated to `rgba(30,30,50,0.85)` for better opacity; monitor if it looks right across different screens
