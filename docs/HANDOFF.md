# AI Badge: Micro-LMS Handoff Document

**Date:** 2026-03-25
**Author:** Claudus (session handoff)
**Session:** Micro-LMS build, Tasks 1-2 complete, Task 4 (lesson view) partially done

---

## What This Project Is

AI Badge is being transformed from a standalone assessment tool into a **micro-LMS** (Udemy/Coursera style). Enrolled users consume sequential nano-lessons (3-15 min each), primarily video-based screen recordings hosted on YouTube (unlisted).

**Live at:** https://aibadge.fiveinnolabs.com/
**Repo:** https://github.com/victordelrosal/aibadge.git

---

## Current State (as of this handoff)

### What's Built and Working

1. **SPA Shell + Auth (Task 1)**: Complete
   - Single `index.html` SPA with Alpine.js, no separate pages
   - Hash-based routing (`#/`, `#/lesson/{moduleId}/{lessonId}`, `#/admin`)
   - Sign-in modal (Apple sheet style) with Google sign-in + email/password + create account
   - Three auth states: unauthenticated (landing), logged in not enrolled (access required), logged in enrolled (dashboard)
   - Admin detection for both `victor@fiveinnolabs.com` and `victordelrosal@gmail.com`
   - Auto-enrollment for admin emails on first sign-in

2. **Student Dashboard (Task 2)**: Complete (hardcoded data)
   - 3 module cards: Hello World, Deploy to GitHub, OpenCode Setup
   - Expand/collapse with Alpine.js `x-collapse` plugin
   - Lesson list with lock/unlock/completed status icons
   - Progress bars per module
   - Prerequisite logic: `requiresPrevious` toggle per lesson and per module
   - "Key Concepts" lessons always unlocked (requiresPrevious: false)
   - Scoped CSS classes (`.lms-module-card`, `.lms-lesson-row`, etc.)

3. **Lesson View (Task 4)**: Partially complete (Hello World only)
   - Full Code Guides styling: dark theme with moving background pattern, IBM Plex fonts, gradient glow
   - Light/dark mode toggle (moon/sun button in topbar)
   - Content: all 3 accordion sections from sBs/code/helloworld.html (Quick Start, Detailed Guide, Troubleshooting)
   - YouTube video placeholder (ready to embed)
   - "Mark as Complete" button (UI only, no persistence yet)
   - Code blocks with copy-to-clipboard buttons
   - Callouts (info, warning, success, error), step cards, keyboard shortcut tables

### What's NOT Built Yet

- **Task 3: Firestore Persistence** - Modules/lessons still hardcoded in JS, progress not saved
- **Task 4 (remaining)**: Only Hello World lesson has content; Deploy to GitHub and OpenCode Setup need their content added
- **Task 5: Admin Panel** - CRUD for modules/lessons, drag reorder, user enrollment management
- **Task 6: Polish + Deploy** - Dark mode for dashboard, cleanup deprecated files, final deploy

---

## Architecture

### Tech Stack
- **Alpine.js 3.14.8** (CDN, no build step) + `@alpinejs/collapse` plugin
- **Firebase v10.8.0 compat SDK** (CDN): Auth + Firestore
- **Firebase Hosting** for deployment
- **ES modules NOT used at runtime** (inlined in `<script>` to avoid file:// CORS issues)
- `js/store.js` and `js/router.js` exist as reference files but code is inlined in index.html

### File Structure
```
index.html                    # THE app (SPA, 3000+ lines)
index-landing-backup.html     # Backup of original landing page
assets/
  css/style.css               # Original landing page styles (Apple HIG)
  js/firebase-app.js          # Firebase integration layer (auth, Firestore helpers)
  img/pattern-bg.png          # Moving background pattern (from Code Guides)
js/
  store.js                    # Alpine stores (reference, inlined in index.html)
  router.js                   # Hash router (reference, inlined in index.html)
docs/
  plans/
    2026-03-25-micro-lms-design.md          # Full design doc
    2026-03-25-micro-lms-implementation.md  # 6-task implementation plan
spike.html                    # Alpine.js validation spike
```

### Key Sections in index.html
- **Lines ~1-10**: Head with Alpine.js CDN + collapse plugin
- **Lines ~1100-1596**: Landing page (wrapped in `x-show="$store.ui.view === 'landing'"`)
- **Lines ~1598-1726**: Dashboard view with LMS styles and module cards
- **Lines ~1728-2200+**: Lesson view with Code Guides styles and Hello World content
- **Lines ~2200+**: Admin view placeholder, Sign-in modal
- **Lines ~2240+**: SPA init script (stores, router, auth listener, signinForm, lmsDashboard, lessonView)

### Data Model (hardcoded, will move to Firestore)
```
modules[] -> {id, title, description, icon, iconBg, level, durationMinutes, order, requiresPrevious, lessons[]}
lessons[] -> {id, title, type, durationMinutes, order, requiresPrevious}
progress{} -> {lessonId: boolean} (in-memory only, not persisted)
```

### Auth Flow
1. `alpine:init` event registers stores and router
2. `initFirebase()` + `onAuthChange()` listener
3. On auth change: fetch user profile from Firestore, auto-create enrolled profile for admin emails
4. `auth.setLoading(false)` then `route()` to determine view
5. Admin check: `['victor@fiveinnolabs.com','victordelrosal@gmail.com'].includes(email)`

---

## Important Decisions and Gotchas

1. **No ES modules at runtime**: `<script type="module">` was causing CORS errors when opening via `file://`. All code is inlined in a regular `<script>` tag.

2. **Lesson completion must happen inside lesson view only** (not from the module list). This is a firm design decision per user feedback. See memory: `feedback_lms_ui.md`.

3. **Global CSS conflicts**: `assets/css/style.css` has global `a` styles (blue color, hover) that bleed into LMS components. Dashboard uses `.lms-module-card a { color:inherit; }` to override. Lesson view uses scoped `cg-*` prefixed classes to avoid conflicts.

4. **Lesson view uses Code Guides aesthetic** (dark theme, IBM Plex fonts, moving background) which is completely different from the dashboard's Apple HIG style. This is intentional; the dashboard is the "shell" and lesson content has its own immersive style.

5. **Firebase Auth**: Google sign-in requires http:// or https:// (not file://). For local testing, use `python3 -m http.server 8080` or `firebase serve`.

6. **Content source**: Hello World content comes from `sBs/code/helloworld.html`. The other two guides (Deploy to GitHub, OpenCode Setup) at `sBs/code/` should be migrated similarly.

---

## What to Do Next

### Immediate: Task 3 (Firestore Persistence)
1. Create `js/seed.js` (run from browser console) to populate Firestore with the 3 modules and their lessons
2. Create `js/services/firebase-lms.js` with `loadModules()`, `loadProgress()`, `markLessonComplete()`
3. Update `lmsDashboard()` to load from Firestore instead of hardcoded data
4. Update `lessonView()` to persist completion to Firestore
5. Update `firestore.rules` for modules (read: authenticated) and progress (read/write: owner)

### Then: Remaining Task 4 (Other Lessons)
- Add content for Deploy to GitHub and OpenCode Setup lessons
- Make lesson view dynamic (load content based on moduleId/lessonId instead of hardcoded Hello World)
- Wire up YouTube embeds when videos are ready

### Then: Task 5 (Admin Panel)
- Module/lesson CRUD
- Drag to reorder
- User enrollment toggle

### Then: Task 6 (Polish)
- Dark mode for dashboard
- Deprecated file cleanup (login.html, portal.html -> deprecated/)
- `firebase deploy`

---

## Deploy Checklist

```bash
# Local testing
python3 -m http.server 8080
# or
firebase serve

# Deploy to production
firebase deploy

# Verify
# 1. Open https://aibadge.fiveinnolabs.com
# 2. See marketing landing page
# 3. Sign in with Google
# 4. See dashboard with 3 modules
# 5. Expand Hello World, click "What is HTML?"
# 6. See full lesson view with dark theme
# 7. Toggle light/dark mode
# 8. Back to Dashboard works
```
