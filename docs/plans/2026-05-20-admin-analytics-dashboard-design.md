# AI Badge — Admin Analytics Dashboard (design)

Date: 2026-05-20. Upgrades `/#/admin` in place into a comprehensive activity/analytics dashboard.

## Goal
A world-class, granular admin view to track uptake and usage: who has signed in, their name + student ID, login frequency/recency, engaged time, a completion **matrix** (students × tutorials), and per-user drill-down (logins, completions with dates, exercise submissions, assessment/explorer history).

## Data model (existing unless noted)
- `users/{uid}`: email, firstName, fullName, displayName, studentId, cohort, enrolled, createdAt, lastActiveAt, enrolmentSource, onRoster, accessRequested, className, programme.
  - **NEW (this build):** `loginCount` (increment per login), `lastLoginAt`, `lastSeenAt`, `totalEngagedMs` (increment via heartbeat). All on the user doc → admin-readable by existing rules, **no firestore.rules deploy needed**.
- `users/{uid}/logins/{id}`: {timestamp, method} (existing).
- `users/{uid}/tutorial_completions/{tutId}`: {completed, completedAt} (existing).
- `users/{uid}/submissions/{exId}`: {exerciseId, type, value, status, submittedAt} (existing; collectionGroup admin read already allowed).
- `users/{uid}/explorer_history/{id}`: {score, tier, scores{...}, completedAt} (existing).
- `window._lmsTutorials`: tutorial catalogue (id, title, pending).

## Engaged-time instrumentation
- `recordLoginMetrics(uid)`: called from `logLogin` chokepoint — increments `loginCount`, sets `lastLoginAt`/`lastSeenAt`.
- `startEngagementHeartbeat(uid)`: 60s interval, only counts while `document.visibilityState==='visible'`; increments `totalEngagedMs` by the foreground delta (capped 1s–5min to ignore idle/sleep) and refreshes `lastSeenAt`. Started in `onAuthChange`, stopped on sign-out. Approximate, accrues from deploy forward.

## Dashboard sections (top → bottom)
1. **KPI cards:** total students, enrolled, active last 7 days, total logins, avg completion %, total submissions, total engaged time.
2. **Controls:** search (name/ID/email), cohort filter, sort (name / completion % / last active / logins / engaged), CSV export, refresh.
3. **Completion matrix:** sticky left columns (name, student ID), one column per non-pending tutorial (✓ + date tooltip), trailing summary columns (completion %, logins, last active, engaged time, submissions). Column footer shows per-tutorial completion count. Row click → drill-down.
4. **Per-user drill-down:** quick stats; tutorial progress with dates; **submissions** (link/value + date) — added here; login history; explorer/assessment history (existing).

## Loading strategy
- `getAllUsers()` (1 query) + `getAdminAllSubmissions()` (1 collectionGroup query) + per-user `getAdminTutorialCompletions(uid)` via `Promise.all` (≈46 small reads). No rules change. Acceptable at current scale (≈46 students).

## Out of scope / deferred
- Server-side aggregation, collectionGroup rules for completions/logins, historical duration (pre-deploy), charts library (use lightweight inline bars).
