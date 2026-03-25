# Micro-LMS Implementation Plan (Revised)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform AI Badge into a single-page micro-LMS with Alpine.js, Apple-native aesthetics, module cards with expandable lesson lists, admin panel, and Firestore-backed progress tracking.

**Architecture:** Single `index.html` SPA with hash routing, Alpine.js for reactivity, ES module file structure. Three auth states (unauthenticated/logged-in/enrolled). Firebase Auth + Firestore. No build step.

**Tech Stack:** Alpine.js 3.x (CDN), Firebase v10 compat SDK (CDN), native HTML5 Drag and Drop, ES Modules.

**Design:** Apple HIG: system font stack, grouped-inset lists (14px radius cards on #F2F2F7), 44px tap targets, backdrop-filter materials, semantic colors. CSS built alongside each component, not pre-baked.

**Critical path:** Shell+Auth -> Dashboard (hardcoded) -> Firestore -> Lesson view -> Admin -> Deploy

---

## Task 1: SPA Shell + Routing + Auth

Build the skeleton: `index.html` as SPA with Alpine.js, hash router, auth state management, sign-in modal. Landing page content preserved for unauthenticated users. On sign-in, view switches to dashboard placeholder.

**Files:**
- Rewrite: `index.html` (SPA shell preserving marketing content)
- Create: `js/store.js` (Alpine shared state: auth, ui view)
- Create: `js/router.js` (hash-based routing)
- Create: `js/components/modal.js` (reusable Apple-style sheet modal)

**Existing code to reuse:**
- `assets/js/firebase-app.js`: all auth functions (signIn, signOut, onAuthChange, etc.) already work
- `assets/css/style.css`: all existing styles (hero, nav, auth card, etc.)
- `login.html` lines 69-151: auth logic to migrate into sign-in modal

**Acceptance criteria:**
- Open index.html: see marketing landing page (current content)
- Click "Sign In" in nav: Apple sheet modal slides up with email/password form
- Sign in: modal closes, view switches to "Dashboard" placeholder with user email shown
- Sign out: returns to landing page
- Direct hash navigation works: `#/`, `#/admin` (shows admin placeholder if admin email)
- Forgot password works from modal

**Commit after this task.**

---

## Task 2: Student Dashboard (Hardcoded Data)

Build module cards with expand/collapse and lesson lists using hardcoded data. No Firestore yet. Focus on getting the UI right: Apple grouped-inset list style, lock/unlock visuals, progress indicators.

**Files:**
- Create: `js/student/dashboard.js` (Alpine component with hardcoded modules)
- Create: `js/services/unlock.js` (prerequisite logic)
- Create: `assets/css/lms.css` (LMS-specific styles, Apple HIG)
- Modify: `index.html` (add dashboard view)

**Hardcoded data:** Three modules (Hello World, Deploy to GitHub, OpenCode Setup) with 3-5 lessons each, matching the spike data structure.

**Acceptance criteria:**
- After sign-in, enrolled user sees module cards stacked vertically
- Click card: expands to show lesson list (Coursera-style vertical list)
- Lessons show correct status: check (completed), open circle (unlocked), lock (locked)
- Completing a lesson (button for now) unlocks the next one if requiresPrevious
- "Key concepts" (requiresPrevious: false) is always accessible
- Progress bar on module card updates
- Locked lessons have strong visual differentiation (not subtle)
- Not-enrolled user sees "Get Access" prompt instead

**Commit after this task.**

---

## Task 3: Firestore Persistence

Replace hardcoded data with Firestore. Modules/lessons load from `modules/` collection. Progress saves to `users/{uid}/progress/`.

**Files:**
- Create: `js/services/firebase-lms.js` (LMS Firestore operations: loadModules, loadProgress, markLessonComplete)
- Modify: `js/student/dashboard.js` (swap hardcoded data for Firestore calls)
- Modify: `firestore.rules` (add modules and progress rules)
- Create: `js/seed.js` (one-time script to populate initial module data)

**Acceptance criteria:**
- Run seed script (from browser console): populates 3 modules with lessons in Firestore
- Dashboard loads modules from Firestore on init
- Completion persists across page reloads
- Progress subcollection updates correctly
- Security rules: authenticated users read modules, owners write progress, admin writes modules

**Commit after this task.**

---

## Task 4: Lesson View

Navigate to individual lesson: video player + content + mark complete + nav.

**Files:**
- Create: `js/student/lesson.js` (Alpine component for lesson view)
- Modify: `index.html` (add lesson view markup)
- Modify: `js/router.js` (handle `#/lesson/{moduleId}/{lessonId}` route)

**Acceptance criteria:**
- Click unlocked lesson in dashboard: navigates to `#/lesson/{moduleId}/{lessonId}`
- Lesson view shows: breadcrumb, YouTube embed (16:9) for video type, content HTML below
- "Mark as Complete" button at bottom (NOT in the list, only in lesson view)
- After marking complete: button becomes "Completed" check, next lesson info shown
- Previous/Next navigation buttons
- Back to dashboard via breadcrumb
- Locked lessons cannot be navigated to (even by manual URL)

**Commit after this task.**

---

## Task 5: Admin Panel

CRUD for modules and lessons, user enrollment management. Only after student flow works end-to-end.

**Files:**
- Create: `js/admin/modules.js` (module/lesson CRUD + drag reorder)
- Create: `js/admin/users.js` (enrollment management)
- Modify: `index.html` (add admin view markup)
- Modify: `js/services/firebase-lms.js` (add admin CRUD functions)

**Acceptance criteria:**
- Admin user sees "Admin" toggle in top bar
- Content tab: list of modules with edit/delete, nested lessons with edit/delete
- Can create new module (title, description, icon, level, requiresPrevious)
- Can create new lesson (title, type, youtubeId, duration, requiresPrevious, content)
- Can drag to reorder modules and lessons (order persists to Firestore)
- Users tab: table of users with enrollment toggle switch
- Non-admin users cannot access admin view (even via direct hash)

**Commit after this task.**

---

## Task 6: Polish, Cleanup, Deploy

Dark mode, deprecated file cleanup, final deploy.

**Files:**
- Modify: `assets/css/lms.css` (dark mode for all LMS components)
- Delete: `spike.html`
- Move: `login.html`, `portal.html` to `deprecated/`
- Modify: `firebase.json` (if needed)

**Acceptance criteria:**
- Dark mode: all LMS components adapt correctly
- `prefers-reduced-motion`: animations disabled
- Deprecated files removed from active hosting
- `firebase deploy` succeeds
- End-to-end test: unauthenticated landing -> sign in -> dashboard -> expand module -> click lesson -> watch video -> mark complete -> progress persists -> admin can manage content

**Commit and deploy after this task.**
