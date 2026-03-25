# AI Badge Micro-LMS Design

**Date:** 2026-03-25
**Status:** Approved

## Overview

Transform AI Badge from a standalone assessment tool into a micro-LMS (Udemy/Coursera style) where enrolled users consume sequential nano-lessons (3 to 15 minutes each), primarily video-based screen recordings hosted on YouTube (unlisted).

## Architecture

### Single-Page App

Everything lives in `index.html`. No separate login.html, explore.html, or portal.html. Hash-based routing:

- `#/` : Marketing landing (unauthenticated) or LMS dashboard (authenticated + enrolled)
- `#/lesson/{moduleId}/{lessonId}` : Lesson view
- `#/admin` : Admin panel (gated to victor@fiveinnolabs.com)
- `#/admin/module/{moduleId}` : Edit module

### Three Auth States

| State | View |
|-------|------|
| Not logged in | Marketing landing page with sign-in modal |
| Logged in, not enrolled | Dashboard with "Get Access" prompt |
| Logged in + enrolled | Full LMS dashboard with modules and lessons |

Enrollment is an `enrolled: true` flag on the user's Firestore doc, toggled manually by admin.

### Video Hosting

YouTube (unlisted). Each lesson stores a `youtubeId` in Firestore. Embedded via iframe in lesson view.

## Data Model (Firestore)

```
modules/{moduleId}
  title: string             // "Hello World"
  description: string       // "Code your first webpage..."
  icon: string              // icon key (e.g., "terminal", "globe", "code")
  level: string             // "beginner" | "intermediate" | "advanced"
  durationMinutes: number   // total across all lessons
  order: number             // position in module list
  requiresPrevious: boolean // must complete previous module first

  /lessons/{lessonId}
    title: string           // "Writing HTML"
    type: string            // "video" | "reading" | "quiz"
    youtubeId: string       // YouTube video ID (for video type)
    durationMinutes: number
    order: number           // position within module
    requiresPrevious: boolean // must complete previous lesson first
    content: string         // HTML content (reading material or below-video notes)

users/{userId}
  email: string
  enrolled: boolean
  enrolledAt: timestamp | null

  /progress/{lessonId}
    completed: boolean
    completedAt: timestamp
```

## UI Design: Student View

### Dashboard (Post-Login, Enrolled)

Top bar: AI Badge logo left, user avatar/name right, sign out.

Module cards stacked vertically, each showing:
- Icon + title + level tag + total duration
- Progress indicator ("2/5 completed" or progress bar)
- Expand/collapse chevron

Expanded state reveals nano-lesson list:

```
+---------------------------------------------+
| >_ Hello World          Beginner . 5 min    |
|    ========.. 3/5 complete            v     |
+---------------------------------------------+
|  [check] Video: What we're building  1 min  |
|  [check] Video: Writing HTML         2 min  |
|  [check] Video: Adding CSS           1 min  |
|  [open]  Video: Adding JavaScript    2 min  |
|  [lock]  Reading: Key concepts       3 min  |
+---------------------------------------------+
```

- Completed: checkmark, muted style
- Current/unlocked: bold, clickable, accent color
- Locked: greyed out, lock icon, still visible

### Lesson View

- YouTube embed (16:9) at top
- Written content below
- "Mark as Complete" button at bottom
- Previous/Next navigation
- Breadcrumb back to dashboard

### Unlock Logic

Each lesson has a `requiresPrevious` toggle:
- **On** (default): must complete the lesson above it (by order) to unlock
- **Off**: freely accessible regardless of progress

Same toggle exists at module level. This provides flexible sequencing without a full dependency graph.

## UI Design: Admin Panel

Gated to victor@fiveinnolabs.com. Toggle in top bar: "Student View" | "Admin".

### Module Management

Drag-to-reorder module list. Each module shows:
- Drag handle + title + level + duration + edit/delete buttons
- `requiresPrevious` toggle
- Nested lesson list (also drag-to-reorder)
- "+ Add lesson" button

### Lesson Edit Modal

- Title (text)
- Type: Video / Reading (dropdown)
- YouTube ID (text, for video type)
- Duration in minutes (number)
- Content (HTML for reading or below-video notes)
- Requires previous toggle
- Save / Cancel

### Module Edit Modal

- Title, description, icon picker, level selector, requires previous toggle

### User Management

Table of enrolled users: email, enrolled date, progress percentage. Toggle enrollment on/off per user.

## Technical Details

### Stack

Alpine.js (15kb) as the reactive layer on top of static HTML/CSS/JS. Firebase Auth (email/password), Firestore, Firebase Hosting. No build step.

Alpine was chosen over vanilla JS (too much DOM spaghetti for this complexity) and full frameworks like React (overkill, requires build pipeline). If the Alpine spike reveals friction, Preact is the fallback.

### File Structure

```
index.html              <- shell, Alpine x-data root, CSS
js/
  router.js             <- hash-based routing
  store.js              <- shared state (auth, user, enrollment)
  components/
    modal.js            <- reusable modal component
    progress-bar.js     <- progress bar component
    lesson-card.js      <- lesson list item (used in admin + student)
  admin/
    modules.js          <- module CRUD, drag-and-drop
    users.js            <- enrollment management
  student/
    dashboard.js        <- module cards, expand/collapse
    lesson.js           <- lesson view, video player, mark complete
  services/
    firebase.js         <- auth + Firestore helpers
    unlock.js           <- prerequisite/unlock logic
```

All JS loaded as ES modules. `components/` holds reusable Alpine components shared across admin and student views.

### Routing

Hash-based routing within index.html. A router function listens to `hashchange` and renders the appropriate view.

### Drag-and-Drop

Native HTML5 Drag and Drop API. On drop, batch-update `order` fields in Firestore.

### Firestore Security Rules

Extend current rules:
- `modules` and `modules/{id}/lessons`: readable by any authenticated user, writable only by admin
- `users/{userId}/progress/{lessonId}`: read/write by owner, readable by admin
- `users/{userId}`: owner can read; admin can read/write (for enrollment toggle)

### Content Migration

**Code Guides (sBs/code/)**: Migrate and deprecate. The three existing lessons seed as the first modules:
1. Hello World (Beginner, 5 min)
2. Deploy to GitHub (Beginner, 15 min)
3. OpenCode Setup (Intermediate, 35 min)

Their existing HTML content becomes the `content` field on initial lessons. YouTube IDs left blank until recorded. Once LMS versions are live, redirect victordelrosal.com/code/ to AI Badge.

**Assessment tool (explore.html)**: Absorb as "Module 0: Assess Your AI Capability" in the LMS. Natural onboarding step giving every new student an immediate first completion. The explore.html functionality gets integrated as a lesson type within the SPA.

## Resolved Decisions

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Framework | Alpine.js | Too complex for vanilla, too simple for React. No build step. |
| Code Guides site | Migrate into LMS, deprecate /code/ | One home for content, no maintenance split |
| Assessment tool | Module 0 in the LMS | Natural onboarding, prevents orphaned code |
| MCQs | Schema supports `type: "quiz"`, no UI yet | Zero effort now, no migration later |
| File structure | ES modules with components/ shared dir | Prevents duplication across admin/student |

## What's NOT in V1

- Payment integration (enrollment is manual)
- Quiz UI (schema supports it, build later)
- Certificates or badge generation
- Discussion / comments on lessons
- Analytics dashboard
