# Micro-LMS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform AI Badge into a single-page micro-LMS with Alpine.js, Apple-native aesthetics, module cards with expandable lesson lists, admin panel, and Firestore-backed progress tracking.

**Architecture:** Single `index.html` SPA with hash routing, Alpine.js for reactivity, ES module file structure. Three auth states (unauthenticated/logged-in/enrolled). Firebase Auth + Firestore. No build step.

**Tech Stack:** Alpine.js 3.x (CDN), Firebase v10 compat SDK (CDN), native HTML5 Drag and Drop, ES Modules.

**Design Language:** Apple HIG via existing `assets/css/style.css` design system (already has materials, spacing tokens, dark mode). Extend with Apple system colors, SF typography stack, grouped-inset list style (14px radius cards on `#F2F2F7` background), 44px tap targets.

---

## Task 1: File Structure and Alpine.js Foundation

**Files:**
- Create: `js/store.js`
- Create: `js/router.js`
- Create: `js/services/firebase.js`
- Modify: `index.html` (replace current content with SPA shell)

**Step 1: Create the shared state store**

Create `js/store.js`:
```js
// js/store.js
// Shared Alpine.js store: auth state, user profile, enrollment status

export function registerStores(Alpine) {
  Alpine.store('auth', {
    user: null,
    profile: null,
    loading: true,

    get isLoggedIn() {
      return !!this.user;
    },

    get isEnrolled() {
      return this.profile?.enrolled === true;
    },

    get isAdmin() {
      return this.user?.email === 'victor@fiveinnolabs.com';
    },

    setUser(user) {
      this.user = user;
    },

    setProfile(profile) {
      this.profile = profile;
    },

    setLoading(val) {
      this.loading = val;
    }
  });

  Alpine.store('ui', {
    view: 'landing', // 'landing' | 'dashboard' | 'lesson' | 'admin'
    activeModal: null,

    showModal(name) {
      this.activeModal = name;
    },

    closeModal() {
      this.activeModal = null;
    }
  });
}
```

**Step 2: Create the hash router**

Create `js/router.js`:
```js
// js/router.js
// Hash-based SPA router

export function initRouter(Alpine) {
  function parseHash() {
    const hash = window.location.hash || '#/';
    const parts = hash.slice(2).split('/'); // remove '#/'
    return { path: parts[0] || '', params: parts.slice(1) };
  }

  function route() {
    const auth = Alpine.store('auth');
    const ui = Alpine.store('ui');
    const { path, params } = parseHash();

    if (auth.loading) return; // wait for auth

    if (!auth.isLoggedIn) {
      ui.view = 'landing';
      return;
    }

    // Logged in
    switch (path) {
      case 'admin':
        if (auth.isAdmin) {
          ui.view = 'admin';
        } else {
          ui.view = 'dashboard';
        }
        break;
      case 'lesson':
        if (auth.isEnrolled) {
          ui.view = 'lesson';
          ui.activeModuleId = params[0] || null;
          ui.activeLessonId = params[1] || null;
        } else {
          ui.view = 'dashboard';
        }
        break;
      default:
        ui.view = auth.isEnrolled ? 'dashboard' : 'dashboard';
        break;
    }
  }

  window.addEventListener('hashchange', route);

  // Expose for initial call after auth resolves
  return route;
}
```

**Step 3: Create Firebase service module**

Create `js/services/firebase.js`:
```js
// js/services/firebase.js
// Wraps existing firebase-app.js functions + adds LMS-specific Firestore ops

export async function loadModules() {
  initFirebase();
  const snapshot = await db.collection('modules')
    .orderBy('order', 'asc')
    .get();
  const modules = [];
  for (const doc of snapshot.docs) {
    const mod = { id: doc.id, ...doc.data(), lessons: [] };
    const lessonSnap = await db.collection('modules').doc(doc.id)
      .collection('lessons').orderBy('order', 'asc').get();
    mod.lessons = lessonSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    modules.push(mod);
  }
  return modules;
}

export async function loadProgress(userId) {
  initFirebase();
  const snapshot = await db.collection('users').doc(userId)
    .collection('progress').get();
  const progress = {};
  snapshot.docs.forEach(doc => {
    progress[doc.id] = doc.data();
  });
  return progress;
}

export async function markLessonComplete(userId, lessonId) {
  initFirebase();
  await db.collection('users').doc(userId)
    .collection('progress').doc(lessonId)
    .set({
      completed: true,
      completedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Admin: CRUD for modules and lessons
export async function saveModule(moduleId, data) {
  initFirebase();
  if (moduleId) {
    await db.collection('modules').doc(moduleId).set(data, { merge: true });
    return moduleId;
  } else {
    const ref = await db.collection('modules').add(data);
    return ref.id;
  }
}

export async function deleteModule(moduleId) {
  initFirebase();
  // Delete all lessons first
  const lessons = await db.collection('modules').doc(moduleId)
    .collection('lessons').get();
  const batch = db.batch();
  lessons.docs.forEach(doc => batch.delete(doc.ref));
  batch.delete(db.collection('modules').doc(moduleId));
  await batch.commit();
}

export async function saveLesson(moduleId, lessonId, data) {
  initFirebase();
  const ref = db.collection('modules').doc(moduleId).collection('lessons');
  if (lessonId) {
    await ref.doc(lessonId).set(data, { merge: true });
    return lessonId;
  } else {
    const newRef = await ref.add(data);
    return newRef.id;
  }
}

export async function deleteLesson(moduleId, lessonId) {
  initFirebase();
  await db.collection('modules').doc(moduleId)
    .collection('lessons').doc(lessonId).delete();
}

export async function updateModuleOrder(moduleId, order) {
  initFirebase();
  await db.collection('modules').doc(moduleId).update({ order });
}

export async function updateLessonOrder(moduleId, lessonId, order) {
  initFirebase();
  await db.collection('modules').doc(moduleId)
    .collection('lessons').doc(lessonId).update({ order });
}

// Admin: user enrollment management
export async function getEnrolledUsers() {
  initFirebase();
  const snapshot = await db.collection('users').orderBy('email', 'asc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function setEnrollment(userId, enrolled) {
  initFirebase();
  await db.collection('users').doc(userId).set({
    enrolled,
    enrolledAt: enrolled
      ? firebase.firestore.FieldValue.serverTimestamp()
      : null
  }, { merge: true });
}
```

**Step 4: Create the SPA shell in index.html**

Replace the content of `index.html` with the SPA shell. This is the biggest step. The shell includes:
- Alpine.js CDN script
- Firebase SDK scripts (already in login.html)
- Module imports for store, router, services
- View containers with `x-show` for each state (landing, dashboard, lesson, admin)
- Sign-in modal (replaces login.html)
- Top bar with Apple-style material blur

The shell structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Badge</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="assets/css/lms.css">
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <!-- Firebase SDK -->
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
  <script src="assets/js/firebase-app.js"></script>
</head>
<body x-data="app()" x-init="init()">

  <!-- TOP BAR (authenticated users) -->
  <header x-show="$store.auth.isLoggedIn" class="lms-topbar">
    <!-- Apple material blur nav bar -->
  </header>

  <!-- LANDING VIEW (unauthenticated) -->
  <div x-show="$store.ui.view === 'landing'">
    <!-- Current marketing landing page content -->
  </div>

  <!-- DASHBOARD VIEW (enrolled students) -->
  <div x-show="$store.ui.view === 'dashboard'">
    <!-- Module cards with expand/collapse -->
  </div>

  <!-- LESSON VIEW -->
  <div x-show="$store.ui.view === 'lesson'">
    <!-- Video player + content + mark complete -->
  </div>

  <!-- ADMIN VIEW -->
  <div x-show="$store.ui.view === 'admin'">
    <!-- Module/lesson CRUD + user management -->
  </div>

  <!-- SIGN-IN MODAL -->
  <div x-show="$store.ui.activeModal === 'signin'" class="modal-overlay">
    <!-- Sign-in form (migrated from login.html) -->
  </div>

  <script type="module">
    import { registerStores } from './js/store.js';
    import { initRouter } from './js/router.js';

    document.addEventListener('alpine:init', () => {
      registerStores(Alpine);
      const route = initRouter(Alpine);

      // Auth state listener
      initFirebase();
      onAuthChange(async (user) => {
        const auth = Alpine.store('auth');
        auth.setUser(user ? { uid: user.uid, email: user.email } : null);
        if (user) {
          const profile = await getUserProfile(user.uid);
          auth.setProfile(profile);
        } else {
          auth.setProfile(null);
        }
        auth.setLoading(false);
        route(); // re-route after auth resolves
      });
    });

    // App-level Alpine component
    window.app = function() {
      return {
        init() {
          // Any app-level init
        }
      };
    };
  </script>
</body>
</html>
```

**Step 5: Commit**

```bash
git add js/ index.html
git commit -m "feat: add Alpine.js SPA shell with store, router, and Firebase services"
```

---

## Task 2: Apple-Native LMS Stylesheet

**Files:**
- Create: `assets/css/lms.css`

This extends the existing design system with LMS-specific components, all following Apple HIG: system font, grouped-inset lists, 14px radii, materials, semantic colors, dark mode.

**Step 1: Create `assets/css/lms.css`**

Key components to style:
- `.lms-topbar` : Apple nav bar with backdrop-filter material, 44px height
- `.lms-dashboard` : max-width 672px centered, secondary background (#F2F2F7)
- `.module-card` : grouped-inset style (white card, 14px radius, on gray bg)
- `.module-header` : 44px min tap target, flex layout with icon + info + chevron
- `.lesson-item` : list row style (44px min height, separator inset from text not icon)
- `.lesson-item.locked` : opacity 0.35, muted text, prominent lock icon
- `.lesson-item.completed` : green check, secondary text color
- `.lesson-item.current` : blue accent, bold, system blue tint background at 8%
- `.progress-ring` : thin ring (Apple style, not thick bar)
- `.tag` : 8px radius chips matching Apple small-caps style
- `.lms-modal` : sheet sliding from bottom with 10px top radius, grab handle
- `.lesson-view` : 16:9 video container + content below + sticky "Mark Complete" bar
- `.admin-panel` : grouped-inset lists with drag handles
- Dark mode: all components must adapt via `@media (prefers-color-scheme: dark)`

Design tokens to add (extending existing `:root`):
```css
:root {
  /* Apple system colors for LMS */
  --system-blue: #007AFF;
  --system-green: #34C759;
  --system-red: #FF3B30;
  --system-orange: #FF9500;
  --label-primary: #000000;
  --label-secondary: rgba(60,60,67,0.6);
  --label-tertiary: rgba(60,60,67,0.3);
  --bg-grouped: #F2F2F7;
  --bg-card: #FFFFFF;
  --separator: rgba(60,60,67,0.3);
  --radius-card: 14px;
  --radius-button: 12px;
  --radius-chip: 8px;
}
```

Motion: use `--ease-default` (0.25, 0.1, 0.25, 1.0) for standard transitions (250-350ms), `--ease-spring` for interactive gestures. Respect `prefers-reduced-motion`.

**Step 2: Commit**

```bash
git add assets/css/lms.css
git commit -m "feat: add Apple-native LMS stylesheet with grouped-inset lists and materials"
```

---

## Task 3: Student Dashboard (Module Cards)

**Files:**
- Create: `js/student/dashboard.js`
- Create: `js/components/progress-bar.js`
- Create: `js/services/unlock.js`
- Modify: `index.html` (add dashboard view markup)

**Step 1: Create unlock logic**

Create `js/services/unlock.js`:
```js
// js/services/unlock.js
// Determines if a lesson or module is unlocked based on progress and prerequisites

export function isLessonUnlocked(lesson, index, lessons, progress) {
  if (!lesson.requiresPrevious) return true;
  if (index === 0) return true;
  const prevLesson = lessons[index - 1];
  return !!progress[prevLesson.id]?.completed;
}

export function isModuleUnlocked(module, index, modules, progress) {
  if (!module.requiresPrevious) return true;
  if (index === 0) return true;
  const prevModule = modules[index - 1];
  // All lessons in previous module must be completed
  return prevModule.lessons.every(l => !!progress[l.id]?.completed);
}

export function getModuleProgress(module, progress) {
  const total = module.lessons.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = module.lessons.filter(l => !!progress[l.id]?.completed).length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}
```

**Step 2: Create dashboard component**

Create `js/student/dashboard.js`:
```js
// js/student/dashboard.js
// Alpine component for the student LMS dashboard with module cards

import { loadModules, loadProgress } from '../services/firebase.js';
import { isLessonUnlocked, isModuleUnlocked, getModuleProgress } from '../services/unlock.js';

export function dashboardComponent() {
  return {
    modules: [],
    progress: {},
    expandedModule: null,
    loading: true,

    async init() {
      const auth = Alpine.store('auth');
      if (!auth.user) return;
      this.modules = await loadModules();
      this.progress = await loadProgress(auth.user.uid);
      this.loading = false;
    },

    toggleModule(moduleId) {
      this.expandedModule = this.expandedModule === moduleId ? null : moduleId;
    },

    isModuleExpanded(moduleId) {
      return this.expandedModule === moduleId;
    },

    isModuleUnlocked(module, index) {
      return isModuleUnlocked(module, index, this.modules, this.progress);
    },

    isLessonUnlocked(lesson, lessonIndex, module) {
      return isLessonUnlocked(lesson, lessonIndex, module.lessons, this.progress);
    },

    isLessonCompleted(lessonId) {
      return !!this.progress[lessonId]?.completed;
    },

    getProgress(module) {
      return getModuleProgress(module, this.progress);
    },

    navigateToLesson(moduleId, lessonId) {
      window.location.hash = `#/lesson/${moduleId}/${lessonId}`;
    }
  };
}
```

**Step 3: Add dashboard HTML to index.html**

In the dashboard view section, add:
- Module cards using `x-for` over `modules`
- Each card: icon + title + level tag + duration + progress ring
- Expandable lesson list with Apple grouped-inset style
- Lesson items showing status icon (check/open/lock), type icon (play/book), title, duration
- Click on unlocked lesson navigates to `#/lesson/{moduleId}/{lessonId}`
- Not-enrolled state shows "Get Access" prompt card

**Step 4: Commit**

```bash
git add js/student/dashboard.js js/services/unlock.js js/components/progress-bar.js index.html
git commit -m "feat: add student dashboard with module cards and unlock logic"
```

---

## Task 4: Lesson View (Video Player + Content)

**Files:**
- Create: `js/student/lesson.js`
- Modify: `index.html` (add lesson view markup)

**Step 1: Create lesson view component**

Create `js/student/lesson.js`:
```js
// js/student/lesson.js
// Alpine component for individual lesson view

import { loadModules, loadProgress, markLessonComplete } from '../services/firebase.js';
import { isLessonUnlocked } from '../services/unlock.js';

export function lessonComponent() {
  return {
    module: null,
    lesson: null,
    allModules: [],
    progress: {},
    loading: true,
    completing: false,

    async init() {
      const ui = Alpine.store('ui');
      const auth = Alpine.store('auth');
      this.allModules = await loadModules();
      this.progress = await loadProgress(auth.user.uid);
      this.module = this.allModules.find(m => m.id === ui.activeModuleId);
      this.lesson = this.module?.lessons.find(l => l.id === ui.activeLessonId);
      this.loading = false;
    },

    get isCompleted() {
      return !!this.progress[this.lesson?.id]?.completed;
    },

    get nextLesson() {
      if (!this.module || !this.lesson) return null;
      const idx = this.module.lessons.findIndex(l => l.id === this.lesson.id);
      if (idx < this.module.lessons.length - 1) {
        const next = this.module.lessons[idx + 1];
        // Check if next will be unlocked after current is completed
        return { moduleId: this.module.id, lesson: next };
      }
      // Try next module
      const modIdx = this.allModules.findIndex(m => m.id === this.module.id);
      if (modIdx < this.allModules.length - 1) {
        const nextMod = this.allModules[modIdx + 1];
        if (nextMod.lessons.length > 0) {
          return { moduleId: nextMod.id, lesson: nextMod.lessons[0] };
        }
      }
      return null;
    },

    get prevLesson() {
      if (!this.module || !this.lesson) return null;
      const idx = this.module.lessons.findIndex(l => l.id === this.lesson.id);
      if (idx > 0) {
        return { moduleId: this.module.id, lesson: this.module.lessons[idx - 1] };
      }
      return null;
    },

    async markComplete() {
      if (this.isCompleted || this.completing) return;
      this.completing = true;
      const auth = Alpine.store('auth');
      await markLessonComplete(auth.user.uid, this.lesson.id);
      this.progress[this.lesson.id] = { completed: true };
      this.completing = false;
    },

    goToLesson(moduleId, lessonId) {
      window.location.hash = `#/lesson/${moduleId}/${lessonId}`;
    },

    goToDashboard() {
      window.location.hash = '#/';
    }
  };
}
```

**Step 2: Add lesson view HTML to index.html**

Lesson view layout:
- Breadcrumb: "Dashboard > Module Name > Lesson Name"
- YouTube embed (16:9 responsive container) with `x-show="lesson.type === 'video'"`
- Content area below video (rendered from `lesson.content` field)
- Sticky bottom bar with "Mark as Complete" button (Apple filled primary style: system blue, 12px radius, 50px height)
- Previous/Next navigation buttons (Apple tinted secondary style)
- Completed state: green check + "Completed" text replacing the button

**Step 3: Commit**

```bash
git add js/student/lesson.js index.html
git commit -m "feat: add lesson view with video player, content, and completion"
```

---

## Task 5: Sign-In Modal and Auth Flow

**Files:**
- Modify: `index.html` (add sign-in modal, auth init)
- Create: `js/components/modal.js`

**Step 1: Create reusable modal component**

Create `js/components/modal.js`:
```js
// js/components/modal.js
// Apple-style sheet modal: slides up from bottom, grab handle, pull-to-dismiss

export function modalComponent(name) {
  return {
    get isOpen() {
      return Alpine.store('ui').activeModal === name;
    },
    close() {
      Alpine.store('ui').closeModal();
    }
  };
}
```

**Step 2: Add sign-in modal HTML**

Migrate login.html form into a modal overlay:
- Sheet slides up from bottom (Apple modal pattern)
- 10px top corner radius, grab handle (36x5px pill)
- Email + password fields (existing form-input styles)
- Gold gradient "Sign In" button
- "Forgot password?" link
- Error display
- Backdrop dims + scales background to 0.92

**Step 3: Add "Sign In" button to landing page navbar**

Current marketing page gets a "Sign In" button in the nav that triggers `$store.ui.showModal('signin')`.

**Step 4: On successful sign-in, close modal and route**

The auth state change listener in the main script block handles this: `onAuthChange` fires, sets `auth.user`, router recalculates view.

**Step 5: Commit**

```bash
git add js/components/modal.js index.html
git commit -m "feat: add sign-in modal and auth flow replacing login.html"
```

---

## Task 6: Admin Panel (Module/Lesson CRUD)

**Files:**
- Create: `js/admin/modules.js`
- Create: `js/admin/users.js`
- Modify: `index.html` (add admin view markup)

**Step 1: Create admin modules component**

Create `js/admin/modules.js`:
```js
// js/admin/modules.js
// Admin panel for managing modules and lessons: CRUD, reorder, toggle

import {
  loadModules, saveModule, deleteModule,
  saveLesson, deleteLesson,
  updateModuleOrder, updateLessonOrder
} from '../services/firebase.js';

export function adminModulesComponent() {
  return {
    modules: [],
    loading: true,
    editingModule: null,   // module being edited
    editingLesson: null,   // { moduleId, lesson } being edited
    dragState: null,

    async init() {
      this.modules = await loadModules();
      this.loading = false;
    },

    // Module CRUD
    newModule() {
      this.editingModule = {
        title: '', description: '', icon: 'terminal',
        level: 'beginner', durationMinutes: 0, order: this.modules.length,
        requiresPrevious: false
      };
      Alpine.store('ui').showModal('edit-module');
    },

    editModule(mod) {
      this.editingModule = { ...mod };
      Alpine.store('ui').showModal('edit-module');
    },

    async saveModule() {
      const data = { ...this.editingModule };
      const id = data.id;
      delete data.id;
      delete data.lessons;
      await saveModule(id || null, data);
      this.modules = await loadModules();
      Alpine.store('ui').closeModal();
    },

    async removeModule(moduleId) {
      if (!confirm('Delete this module and all its lessons?')) return;
      await deleteModule(moduleId);
      this.modules = await loadModules();
    },

    // Lesson CRUD
    newLesson(moduleId) {
      const mod = this.modules.find(m => m.id === moduleId);
      this.editingLesson = {
        moduleId,
        lesson: {
          title: '', type: 'video', youtubeId: '',
          durationMinutes: 0, order: mod.lessons.length,
          requiresPrevious: true, content: ''
        }
      };
      Alpine.store('ui').showModal('edit-lesson');
    },

    editLesson(moduleId, lesson) {
      this.editingLesson = { moduleId, lesson: { ...lesson } };
      Alpine.store('ui').showModal('edit-lesson');
    },

    async saveLesson() {
      const { moduleId, lesson } = this.editingLesson;
      const data = { ...lesson };
      const id = data.id;
      delete data.id;
      await saveLesson(moduleId, id || null, data);
      this.modules = await loadModules();
      Alpine.store('ui').closeModal();
    },

    async removeLesson(moduleId, lessonId) {
      if (!confirm('Delete this lesson?')) return;
      await deleteLesson(moduleId, lessonId);
      this.modules = await loadModules();
    },

    // Drag-and-drop reordering
    onDragStart(type, id, index) {
      this.dragState = { type, id, index };
    },

    async onDrop(type, targetIndex) {
      if (!this.dragState || this.dragState.type !== type) return;
      // Reorder logic: swap orders in Firestore
      // Implementation uses batch writes to update order fields
      this.dragState = null;
      this.modules = await loadModules();
    }
  };
}
```

**Step 2: Create admin users component**

Create `js/admin/users.js`:
```js
// js/admin/users.js
// Admin panel for user enrollment management

import { getEnrolledUsers, setEnrollment } from '../services/firebase.js';

export function adminUsersComponent() {
  return {
    users: [],
    loading: true,

    async init() {
      this.users = await getEnrolledUsers();
      this.loading = false;
    },

    async toggleEnrollment(userId, currentState) {
      await setEnrollment(userId, !currentState);
      this.users = await getEnrolledUsers();
    }
  };
}
```

**Step 3: Add admin view HTML to index.html**

Admin panel layout (Apple grouped-inset style):
- Top toggle: "Student View" | "Admin" (segmented control)
- Two tabs: "Content" | "Users"
- Content tab: module list with drag handles, edit/delete buttons, nested lesson lists
- Each module: drag handle (6-dot grip) + title + level tag + duration + requiresPrevious toggle + edit/delete
- Nested lessons: same pattern, indented
- "+ Add module" and "+ Add lesson" buttons (Apple tinted secondary style)
- Edit module/lesson modal (Apple sheet style)
- Users tab: table with email, enrolled date, progress %, enrollment toggle switch

**Step 4: Commit**

```bash
git add js/admin/modules.js js/admin/users.js index.html
git commit -m "feat: add admin panel with module/lesson CRUD and user management"
```

---

## Task 7: Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

**Step 1: Update security rules**

Add rules for `modules` collection (readable by authenticated, writable by admin) and `users/{userId}/progress` subcollection (owner read/write, admin read).

```
// Modules: any authenticated user can read; only admin writes
match /modules/{moduleId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();

  match /lessons/{lessonId} {
    allow read: if request.auth != null;
    allow write: if isAdmin();
  }
}

// User progress: owner read/write; admin reads
match /users/{userId}/progress/{lessonId} {
  allow read: if isOwner(userId) || isAdmin();
  allow write: if isOwner(userId);
}
```

Also update the `users/{userId}` rule to allow admin to write (for enrollment toggling):
```
match /users/{userId} {
  allow read: if isOwner(userId) || isAdmin();
  allow write: if isOwner(userId) || isAdmin();
  // ... existing subcollections ...
}
```

**Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules for modules and progress"
```

---

## Task 8: Seed Data (Content Migration)

**Files:**
- Create: `js/seed.js` (run-once script to populate Firestore with initial modules)

**Step 1: Create seed script**

Create `js/seed.js` that populates Firestore with the three Code Guides modules and their lessons. Content is extracted from existing `helloworld.html`, `github.html`, and `opencode.html` in sBs/code/.

The script:
1. Creates three module docs in `modules/`
2. Creates lesson subdocs for each module
3. Sets reasonable defaults (youtubeId blank, content from existing HTML)
4. Run via browser console or a temporary admin button

**Step 2: Commit**

```bash
git add js/seed.js
git commit -m "feat: add seed script for initial module content from Code Guides"
```

---

## Task 9: Landing Page Integration

**Files:**
- Modify: `index.html` (integrate existing marketing content into SPA landing view)

**Step 1: Migrate landing page**

Move the current `index.html` marketing content (hero, "Why Now" section, pricing, testimonials, footer) into the landing view container. Add a "Sign In" button in the navbar that opens the sign-in modal.

The existing CSS in `assets/css/style.css` already styles all these sections, so they should work as-is inside the SPA shell.

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: integrate marketing landing page into SPA shell"
```

---

## Task 10: Polish and Dark Mode

**Files:**
- Modify: `assets/css/lms.css` (dark mode for all LMS components)
- Modify: `index.html` (final polish)

**Step 1: Add dark mode rules**

Add `@media (prefers-color-scheme: dark)` block for all LMS components:
- Module cards: `#1C1C1E` background, `rgba(84,84,88,0.6)` separator
- Lesson items: adjusted opacity and colors
- Progress indicators: brighter green (`#30D158`)
- Modals: `#1C1C1E` background with thin light border
- Admin panel: same treatment

**Step 2: Add `prefers-reduced-motion` support**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Step 3: Final visual QA**

- Verify all tap targets are 44x44px minimum
- Check contrast ratios (4.5:1 text, 3:1 UI)
- Test expand/collapse, modal open/close animations
- Test lock/unlock visual states
- Verify progress indicators update reactively

**Step 4: Commit**

```bash
git add assets/css/lms.css index.html
git commit -m "feat: add dark mode and motion accessibility for LMS components"
```

---

## Task 11: Cleanup and Deploy

**Files:**
- Delete or deprecate: `login.html`, `portal.html` (functionality absorbed into SPA)
- Modify: `firebase.json` (ensure clean hosting config)
- Delete: `spike.html`

**Step 1: Remove deprecated files**

Move `login.html` and `portal.html` to a `deprecated/` directory (or delete if confident). Remove `spike.html`.

**Step 2: Update firebase.json**

Ensure hosting config ignores deprecated files and seeds proper cache headers for new JS modules.

**Step 3: Deploy**

```bash
firebase deploy --only hosting,firestore:rules
```

**Step 4: Run seed script**

Open the deployed site, sign in as admin, run the seed script to populate initial module data.

**Step 5: Test end-to-end**

- Unauthenticated: sees landing page, can open sign-in modal
- Sign in: redirects to dashboard (or "Get Access" if not enrolled)
- Toggle enrollment in admin panel
- Dashboard: module cards expand, lessons show lock/unlock states
- Click lesson: navigates to lesson view with video + content
- Mark complete: progress updates, next lesson unlocks
- Admin: can create/edit/delete modules and lessons

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: cleanup deprecated files, deploy micro-LMS v1"
```
