# Session Reminders & Programme Guidelines Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add automated email reminders (24hr + 3hr before each weekly session) and a programme guidelines modal with 100% guarantee section to the AI Badge booking page.

**Architecture:** Two independent features. (1) Email reminders use a Cloudflare Worker `scheduled` handler (cron trigger) that runs hourly, checks all booked slots for upcoming sessions, and sends reminder emails via Resend. (2) Guidelines modal is pure frontend: a new modal in `index.html` triggered from the pricing section, containing programme expectations. The 100% guarantee is a standalone section on the page (not inside the modal).

**Tech Stack:** Cloudflare Workers (scheduled triggers, KV), Resend API, vanilla HTML/CSS/JS, Alpine.js

---

## Context

### Current State
- **Worker:** `worker/index.js` handles slot booking, Stripe webhooks, calendar events, and emails via Resend
- **KV Store:** `SLOTS` binding stores slot data as `slot:{id}` keys. Booked slots have `booking: { name, email, plan, bookedAt }` and slot-level `day`, `time`, `startDate` (from DEFAULT_SLOTS lookup)
- **Slot schedule:** 13 slots (Wed/Thu), 6 weekly sessions each, 20min duration. Start dates: Wed 22 Apr 2026, Thu 23 Apr 2026
- **Emails:** Sent via Resend API using `env.RESEND_API_KEY` and `env.FROM_EMAIL`
- **Frontend:** Single `index.html` SPA, no build step, Alpine.js from CDN. Pricing section at `#pricing` (line 1349). Payment modal (line 1386), success modal (line 1429)
- **wrangler.toml:** `worker/wrangler.toml`, currently has `[vars]` and `[[kv_namespaces]]` but no `[triggers]`

### Key Files
| File | What to change |
|------|---------------|
| `worker/index.js` | Add `scheduled` handler, reminder email builder, duplicate-prevention logic |
| `worker/wrangler.toml` | Add `[triggers]` cron schedule |
| `index.html` | Add guidelines modal HTML/CSS, guarantee section, trigger link |

---

## Task 1: Add Cron Trigger Configuration

**Files:**
- Modify: `worker/wrangler.toml`

**Step 1: Add scheduled trigger to wrangler.toml**

Add after the `[[kv_namespaces]]` block:

```toml
[triggers]
crons = ["0 * * * *"]  # Run every hour, on the hour
```

This runs the worker's `scheduled` handler every hour. The handler itself determines which reminders to send based on the current time vs session times.

**Step 2: Commit**

```bash
git add worker/wrangler.toml
git commit -m "feat: add hourly cron trigger for session reminders"
```

---

## Task 2: Add Scheduled Handler and Reminder Logic to Worker

**Files:**
- Modify: `worker/index.js`

**Step 1: Add the `scheduled` export alongside the existing `fetch` export**

The worker currently exports `{ fetch }`. Change the default export to include both `fetch` and `scheduled`:

In `worker/index.js`, the current export structure is:
```js
export default {
  async fetch(request, env) { ... }
};
```

Add `scheduled` as a sibling method:
```js
export default {
  async fetch(request, env) { ... },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(sendSessionReminders(env));
  }
};
```

**Step 2: Add the `sendSessionReminders` function**

Place this after the existing email functions (after `sendHostNotification`, around line 692):

```js
// ══════════════════════════════════════════
// SESSION REMINDERS (cron-triggered)
// ══════════════════════════════════════════

async function sendSessionReminders(env) {
  const now = new Date();
  const slots = await getAllSlots(env);

  for (const slot of slots) {
    if (slot.status !== "booked" || !slot.booking) continue;

    const def = DEFAULT_SLOTS.find(d => d.id === slot.id);
    if (!def) continue;
    const startDate = def.startDate || START_WED;

    // Check each of the 6 weekly sessions
    for (let week = 0; week < 6; week++) {
      const sessionDate = new Date(startDate + "T00:00:00");
      sessionDate.setDate(sessionDate.getDate() + week * 7);

      const [hours, mins] = slot.time.split(":");
      sessionDate.setHours(parseInt(hours), parseInt(mins), 0, 0);

      // Convert to Europe/Dublin time awareness:
      // The dates are stored as local Dublin times. The worker runs in UTC.
      // Ireland is UTC+1 (IST) during summer (late March to late October).
      // For April-May 2026 sessions, subtract 1 hour to get UTC equivalent.
      const sessionUTC = new Date(sessionDate.getTime() - (1 * 60 * 60 * 1000));

      const diffMs = sessionUTC.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // 24-hour reminder: send if session is 23-25 hours away
      if (diffHours > 23 && diffHours <= 25) {
        const key = `reminder:24h:${slot.id}:w${week + 1}`;
        const sent = await env.SLOTS.get(key);
        if (!sent) {
          await sendReminderEmail(env, slot, week + 1, "24h");
          await env.SLOTS.put(key, "sent", { expirationTtl: 172800 }); // expire after 48h
        }
      }

      // 3-hour reminder: send if session is 2.5-3.5 hours away
      if (diffHours > 2.5 && diffHours <= 3.5) {
        const key = `reminder:3h:${slot.id}:w${week + 1}`;
        const sent = await env.SLOTS.get(key);
        if (!sent) {
          await sendReminderEmail(env, slot, week + 1, "3h");
          await env.SLOTS.put(key, "sent", { expirationTtl: 172800 });
        }
      }
    }
  }
}
```

**Key design decisions:**
- **Hourly cron with time-window checks** rather than exact-minute matching. The 24h reminder fires if the session is 23-25 hours away; the 3h reminder fires if 2.5-3.5 hours away. This tolerates cron timing variance.
- **KV-based dedup:** Each reminder writes a `reminder:{type}:{slotId}:w{week}` key with a 48h TTL. If the key exists, the reminder was already sent. This prevents double-sends if the cron fires twice within the window.
- **Timezone handling:** Sessions are in Europe/Dublin (IST, UTC+1 in summer). The worker runs in UTC. We subtract 1 hour to compare correctly. All April-May 2026 dates are in IST.

**Step 3: Add the `sendReminderEmail` function**

```js
async function sendReminderEmail(env, slot, weekNum, reminderType) {
  const b = slot.booking;
  const def = DEFAULT_SLOTS.find(d => d.id === slot.id);
  const startDate = def?.startDate || START_WED;
  const dates = getWeeklyDates(startDate);

  const isDay = reminderType === "24h";
  const timeLabel = isDay ? "tomorrow" : "in about 3 hours";
  const subjectPrefix = isDay ? "Tomorrow" : "Starting Soon";

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:24px;font-weight:800;color:#000036;">AI Badge</div>
    <div style="font-size:12px;color:#888;margin-top:2px;">Automated Reminder</div>
  </div>
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;">&#x23F0;</div>
      <div style="font-size:22px;font-weight:700;color:#000036;margin-top:8px;">Session ${timeLabel}</div>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6;margin-bottom:16px;">
      Hi ${b.name}, your <strong>Week ${weekNum}/6</strong> AI Badge coaching session is ${timeLabel}.
    </p>
    <table style="width:100%;font-size:14px;color:#333;margin-bottom:16px;">
      <tr><td style="padding:8px 0;font-weight:600;color:#666;">When</td><td style="padding:8px 0;">${slot.label} (${dates[weekNum - 1]})</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#666;">Duration</td><td style="padding:8px 0;">20 minutes</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#666;">Where</td><td style="padding:8px 0;">Google Meet (check your calendar event for the link)</td></tr>
    </table>
    <div style="background:linear-gradient(135deg,rgba(0,0,54,0.04),rgba(212,175,55,0.08));border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="font-size:13px;font-weight:600;color:#000036;margin:0 0 6px;">Before your session:</p>
      <p style="font-size:13px;color:#444;margin:0;line-height:1.6;">Make sure you've completed any assigned tutorials and exercises. Your session will be most valuable when you come prepared with questions.</p>
    </div>
    <p style="font-size:11px;color:#999;line-height:1.5;">Need to reschedule? Contact Victor at victor@fiveinnolabs.com with at least 24 hours notice. Missed sessions without notice cannot be rescheduled.</p>
  </div>
  <div style="text-align:center;font-size:11px;color:#999;padding:20px 0;">
    <em>This is an automated reminder.</em><br>
    AI Badge by Victor del Rosal &middot; <a href="https://fiveinnolabs.com" style="color:#D4AF37;">fiveinnolabs</a>
  </div>
</div>
</body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: b.email,
        subject: `${subjectPrefix}: AI Badge Session (Week ${weekNum}/6) - ${slot.label}`,
        html: html,
      }),
    });
  } catch (err) {
    console.error(`Reminder email failed (${reminderType}, ${slot.id}, w${weekNum}):`, err);
  }
}
```

**Step 4: Commit**

```bash
git add worker/index.js
git commit -m "feat: add automated session reminders (24hr + 3hr before each session)"
```

---

## Task 3: Add Programme Guidelines Modal to index.html

**Files:**
- Modify: `index.html`

**Step 1: Add the modal HTML**

Insert after the success modal (after line ~1450, after `</div>` closing the successModal):

```html
<!-- Programme Guidelines Modal -->
<div class="payment-overlay" id="guidelinesModal" onclick="if(event.target===this)this.classList.remove('active')">
  <div class="payment-modal" style="max-width:520px;">
    <button class="payment-modal-close" onclick="document.getElementById('guidelinesModal').classList.remove('active')" aria-label="Close">&times;</button>
    <h3 style="font-family:'Playfair Display',serif;font-size:1.4rem;color:var(--blue-deep);margin-bottom:1.2rem;">Programme Guidelines</h3>

    <div style="font-size:0.9rem;color:var(--grey-dark);line-height:1.7;">
      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start;">
        <span style="font-size:1.1rem;flex-shrink:0;">&#x1F4F9;</span>
        <div><strong>Sessions are on Google Meet.</strong> You'll receive a meeting link before your first session. All 6 sessions are 20 minutes each.</div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start;">
        <span style="font-size:1.1rem;flex-shrink:0;">&#x1F4DA;</span>
        <div><strong>Come prepared.</strong> Learners must complete assigned tutorials and check them off in the dashboard before each check-in session. This is how the programme works best.</div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start;">
        <span style="font-size:1.1rem;flex-shrink:0;">&#x1F504;</span>
        <div><strong>Rescheduling.</strong> Need to move a session? Contact Victor at <a href="mailto:victor@fiveinnolabs.com" style="color:var(--gold-rich);">victor@fiveinnolabs.com</a> with at least 24 hours notice.</div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start;">
        <span style="font-size:1.1rem;flex-shrink:0;">&#x274C;</span>
        <div><strong>Missed sessions.</strong> No-shows and sessions missed without prior notice cannot be rescheduled or refunded.</div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:flex-start;">
        <span style="font-size:1.1rem;flex-shrink:0;">&#x1F6E1;&#xFE0F;</span>
        <div><strong>Consumer protection.</strong> EU consumer rights apply. You have a 14-day cooling-off period from enrolment. See our <a href="terms.html" target="_blank" style="color:var(--gold-rich);">Terms &amp; Conditions</a> for full refund and cancellation details.</div>
      </div>

      <div style="display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:1.1rem;flex-shrink:0;">&#x1F4B0;</span>
        <div><strong>100% Guarantee.</strong> If you have completed all sessions and all exercises, and still do not find a single practical use case, we will refund your full tuition. No forms. No friction. Just email Victor for a full refund.</div>
      </div>
    </div>

    <button class="btn-cta" onclick="document.getElementById('guidelinesModal').classList.remove('active')" style="width:100%;margin-top:1.2rem;border-radius:14px;font-size:0.95rem;">Got It</button>
  </div>
</div>
```

**Step 2: Add the trigger link in the pricing section**

In the pricing section (around line 1380), after the slot picker `</div>` and before the closing `</div></section>`, add:

```html
<div style="text-align:center;margin-top:1.2rem;">
  <a href="#" onclick="event.preventDefault();document.getElementById('guidelinesModal').classList.add('active')" style="font-size:0.85rem;color:var(--gold-rich);text-decoration:underline;text-underline-offset:3px;">Programme Guidelines &amp; Policies</a>
</div>
```

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add programme guidelines modal with policies and guarantee"
```

---

## Task 4: Add 100% Guarantee Section to the Page

**Files:**
- Modify: `index.html`

**Step 1: Add guarantee section after the pricing section**

Insert after the closing `</section>` of the pricing section (after line ~1384) and before the payment modal:

```html
<!-- ===================== GUARANTEE ===================== -->
<section class="section" style="background:linear-gradient(135deg,#000036 0%,#02066F 100%);padding:3rem 0;">
  <div class="container" style="text-align:center;max-width:640px;">
    <div style="font-size:2.5rem;margin-bottom:0.75rem;">&#x1F4B0;</div>
    <h2 style="font-family:'Playfair Display',serif;font-size:1.8rem;color:#D4AF37;margin-bottom:1rem;">100% Guarantee</h2>
    <p style="font-size:1.05rem;color:#c8c8e0;line-height:1.7;margin-bottom:1rem;">
      If you have completed all sessions and all exercises, and still do not find a single practical use case, we will refund your full tuition.
    </p>
    <p style="font-size:1.1rem;color:#D4AF37;font-weight:600;line-height:1.6;">
      No forms. No friction. Just email me for a full refund.
    </p>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add 100% guarantee section to landing page"
```

---

## Task 5: Deploy and Verify

**Step 1: Deploy the worker with the new cron trigger**

```bash
cd worker && npx wrangler deploy
```

Verify the cron trigger appears in the Cloudflare dashboard under Workers > aibadge-report-mailer > Triggers > Cron Triggers.

**Step 2: Deploy the frontend**

```bash
cd /path/to/aibadge && firebase deploy --only hosting
```

**Step 3: Manual verification checklist**

- [ ] Visit `aibadge.fiveinnolabs.com/#pricing` and confirm "Programme Guidelines & Policies" link appears below slot picker
- [ ] Click the link; verify the guidelines modal opens with all 6 points
- [ ] Close the modal via "Got It" button and via clicking outside
- [ ] Scroll down past pricing; verify the 100% Guarantee section renders with gold text on dark background
- [ ] In Cloudflare dashboard, confirm the cron trigger `0 * * * *` is registered
- [ ] (Optional) Test the reminder logic by temporarily adjusting a session date to be ~24h or ~3h in the future, running `npx wrangler dev` locally, and triggering `curl http://localhost:8787/__scheduled` to simulate the cron

**Step 4: Final commit**

```bash
git add -A && git commit -m "chore: deployment verification complete"
```

---

## Summary

| Task | What | Where |
|------|------|-------|
| 1 | Cron trigger config | `worker/wrangler.toml` |
| 2 | Reminder logic + email template | `worker/index.js` |
| 3 | Guidelines modal | `index.html` |
| 4 | Guarantee section on page | `index.html` |
| 5 | Deploy + verify | Cloudflare + Firebase |

**No new dependencies.** Everything uses existing Resend API, KV store, and vanilla HTML patterns already in the codebase.
