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
    type: string            // "video" | "reading"
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

Same as current: pure HTML/CSS/JS, Firebase Auth (email/password), Firestore, Firebase Hosting. No framework.

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

The three existing Code Guides lessons seed as modules:
1. Hello World (Beginner, 5 min)
2. Deploy to GitHub (Beginner, 15 min)
3. OpenCode Setup (Intermediate, 35 min)

Their existing HTML content becomes the `content` field on initial lessons. YouTube IDs left blank until recorded.

## What's NOT in V1

- Payment integration (enrollment is manual)
- Multiple choice / comprehension checks (future)
- Certificates or badge generation
- Discussion / comments on lessons
- Analytics dashboard
- Assessment tool integration (explore.html stays standalone for now)
