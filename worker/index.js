// Cloudflare Worker: AI Badge Booking + Report Mailer
// Handles: slot availability, temporary holds, Stripe Checkout, webhooks, email reports

const HOLD_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ── 13 coaching slots (Wed/Thu), 20 min each + 10 min changeover ──
// Start date: Wed 22 April 2026, recurring weekly for 6 weeks
const START_WED = "2026-04-22";
const START_THU = "2026-04-23";

const DEFAULT_SLOTS = [
  { id: "wed-1", day: "Wednesday", time: "12:00", label: "Wed 12:00 PM", startDate: START_WED },
  { id: "wed-2", day: "Wednesday", time: "12:30", label: "Wed 12:30 PM", startDate: START_WED },
  { id: "wed-3", day: "Wednesday", time: "13:00", label: "Wed 1:00 PM",  startDate: START_WED },
  { id: "wed-4", day: "Wednesday", time: "13:30", label: "Wed 1:30 PM",  startDate: START_WED },
  { id: "wed-5", day: "Wednesday", time: "14:00", label: "Wed 2:00 PM",  startDate: START_WED, preBooked: true },
  { id: "wed-6", day: "Wednesday", time: "19:00", label: "Wed 7:00 PM",  startDate: START_WED },
  { id: "wed-7", day: "Wednesday", time: "19:30", label: "Wed 7:30 PM",  startDate: START_WED },
  { id: "thu-1", day: "Thursday",  time: "12:00", label: "Thu 12:00 PM", startDate: START_THU },
  { id: "thu-2", day: "Thursday",  time: "12:30", label: "Thu 12:30 PM", startDate: START_THU },
  { id: "thu-3", day: "Thursday",  time: "13:00", label: "Thu 1:00 PM",  startDate: START_THU },
  { id: "thu-4", day: "Thursday",  time: "13:30", label: "Thu 1:30 PM",  startDate: START_THU },
  { id: "thu-5", day: "Thursday",  time: "19:00", label: "Thu 7:00 PM",  startDate: START_THU },
  { id: "thu-6", day: "Thursday",  time: "19:30", label: "Thu 7:30 PM",  startDate: START_THU },
];

// Generate 6 weekly dates from a start date
function getWeeklyDates(startDate) {
  const dates = [];
  const d = new Date(startDate + "T00:00:00");
  for (let i = 0; i < 6; i++) {
    const date = new Date(d);
    date.setDate(d.getDate() + i * 7);
    dates.push(date.toLocaleDateString("en-IE", { day: "numeric", month: "short" }));
  }
  return dates;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // ── Slot booking API ──
    if (path === "/api/slots" && request.method === "GET") {
      return handleGetSlots(env);
    }
    if (path === "/api/hold" && request.method === "POST") {
      return handleHold(request, env);
    }
    if (path === "/api/webhook" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }
    if (path === "/api/init" && request.method === "POST") {
      return handleInit(env);
    }

    // ── Legacy: report mailer (POST to root) ──
    if (request.method === "POST" && (path === "/" || path === "")) {
      return handleReportEmail(request, env);
    }

    return jsonResponse({ error: "Not found" }, 404);
  }
};

// ══════════════════════════════════════════
// SLOT MANAGEMENT
// ══════════════════════════════════════════

async function handleGetSlots(env) {
  const slots = await getAllSlots(env);
  // Release expired holds
  const now = Date.now();
  let changed = false;
  for (const slot of slots) {
    if (slot.status === "held" && slot.holdUntil && slot.holdUntil < now) {
      slot.status = "available";
      slot.holdUntil = null;
      slot.holdToken = null;
      await env.SLOTS.put(`slot:${slot.id}`, JSON.stringify(slot));
      changed = true;
    }
  }
  // Return public view (no internal tokens) with 6-week dates
  const publicSlots = slots.map(s => {
    const def = DEFAULT_SLOTS.find(d => d.id === s.id);
    const startDate = def?.startDate || START_WED;
    return {
      id: s.id,
      day: s.day,
      time: s.time,
      label: s.label,
      status: s.status === "held" ? "held" : s.status,
      startDate: startDate,
      dates: getWeeklyDates(startDate),
    };
  });
  return jsonResponse({ slots: publicSlots });
}

async function handleHold(request, env) {
  try {
    const body = await request.json();
    const { slotId, plan, name, email, holdToken: existingHoldToken } = body;

    if (!slotId || !plan || !name || !email) {
      return jsonResponse({ error: "Missing required fields: slotId, plan, name, email" }, 400);
    }
    if (!["weekly", "upfront"].includes(plan)) {
      return jsonResponse({ error: "Plan must be 'weekly' or 'upfront'" }, 400);
    }

    // Read slot
    const raw = await env.SLOTS.get(`slot:${slotId}`);
    if (!raw) return jsonResponse({ error: "Slot not found" }, 404);

    const slot = JSON.parse(raw);
    const now = Date.now();

    // Check if available (or held but expired, or held by same user)
    if (slot.status === "held" && slot.holdUntil && slot.holdUntil > now) {
      // Allow same user to re-hold (e.g. switching payment plan)
      if (!existingHoldToken || slot.holdToken !== existingHoldToken) {
        return jsonResponse({ error: "This slot is temporarily held by another user. Try again shortly." }, 409);
      }
    }
    if (slot.status === "booked") {
      return jsonResponse({ error: "This slot is already booked." }, 409);
    }

    // Create hold
    const holdToken = crypto.randomUUID();
    slot.status = "held";
    slot.holdUntil = now + HOLD_DURATION_MS;
    slot.holdToken = holdToken;
    await env.SLOTS.put(`slot:${slotId}`, JSON.stringify(slot));

    // Create Stripe Checkout Session
    const dates = getWeeklyDates(slot.startDate || START_WED);
    const dateList = dates.join(", ");

    let stripeParams;

    if (plan === "weekly") {
      // Subscription: 6 weekly payments of €90
      const sixWeeksFromNow = Math.floor(Date.now() / 1000) + (6 * 7 * 24 * 60 * 60);
      stripeParams = new URLSearchParams({
        "mode": "subscription",
        "success_url": `${env.SITE_URL}?booking=success&slot=${slotId}`,
        "cancel_url": `${env.SITE_URL}?booking=cancelled&slot=${slotId}`,
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": "9000",
        "line_items[0][price_data][recurring][interval]": "week",
        "line_items[0][price_data][product_data][name]": `AI Badge: Weekly Coaching (${slot.label})`,
        "line_items[0][price_data][product_data][description]": `6 weekly payments of €90. Sessions: ${dateList}`,
        "line_items[0][quantity]": "1",
        "customer_email": email,
        "subscription_data[metadata][slotId]": slotId,
        "subscription_data[metadata][plan]": plan,
        "subscription_data[metadata][holdToken]": holdToken,
        "subscription_data[metadata][customerName]": name,
        "subscription_data[metadata][customerEmail]": email,
        "subscription_data[cancel_at]": sixWeeksFromNow.toString(),
        "metadata[slotId]": slotId,
        "metadata[plan]": plan,
        "metadata[holdToken]": holdToken,
        "metadata[customerName]": name,
        "metadata[customerEmail]": email,
        "expires_at": Math.floor(Date.now() / 1000 + 1800).toString(),
      });
    } else {
      // One-time payment: €495 upfront
      stripeParams = new URLSearchParams({
        "mode": "payment",
        "success_url": `${env.SITE_URL}?booking=success&slot=${slotId}`,
        "cancel_url": `${env.SITE_URL}?booking=cancelled&slot=${slotId}`,
        "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": "49500",
        "line_items[0][price_data][product_data][name]": `AI Badge: 6-Week Coaching (${slot.label})`,
        "line_items[0][price_data][product_data][description]": `Complete programme, one payment (save €45). Sessions: ${dateList}`,
        "line_items[0][quantity]": "1",
        "customer_email": email,
        "metadata[slotId]": slotId,
        "metadata[plan]": plan,
        "metadata[holdToken]": holdToken,
        "metadata[customerName]": name,
        "metadata[customerEmail]": email,
        "expires_at": Math.floor(Date.now() / 1000 + 1800).toString(),
      });
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: stripeParams.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      // Release hold on Stripe error
      slot.status = "available";
      slot.holdUntil = null;
      slot.holdToken = null;
      await env.SLOTS.put(`slot:${slotId}`, JSON.stringify(slot));
      console.error("Stripe error:", JSON.stringify(session));
      return jsonResponse({ error: "Payment session creation failed", detail: session.error?.message }, 500);
    }

    return jsonResponse({
      checkoutUrl: session.url,
      holdToken: holdToken,
      expiresAt: slot.holdUntil,
    });

  } catch (err) {
    console.error("Hold error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleStripeWebhook(request, env) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  // Verify webhook signature
  let event;
  try {
    event = await verifyStripeWebhook(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const slotId = session.metadata?.slotId;
    const plan = session.metadata?.plan;
    const holdToken = session.metadata?.holdToken;
    const customerName = session.metadata?.customerName;
    const customerEmail = session.metadata?.customerEmail;

    if (!slotId) return jsonResponse({ received: true });

    const raw = await env.SLOTS.get(`slot:${slotId}`);
    if (!raw) return jsonResponse({ received: true });

    const slot = JSON.parse(raw);

    // Verify hold token matches (prevent race conditions)
    if (slot.holdToken !== holdToken) {
      console.error(`Hold token mismatch for slot ${slotId}`);
      // Refund would be needed here in production
      return jsonResponse({ received: true });
    }

    // Confirm booking
    slot.status = "booked";
    slot.holdUntil = null;
    slot.holdToken = null;
    slot.booking = {
      name: customerName,
      email: customerEmail,
      plan: plan,
      stripeSessionId: session.id,
      stripePaymentIntent: session.payment_intent || null,
      stripeSubscription: session.subscription || null,
      bookedAt: new Date().toISOString(),
    };
    await env.SLOTS.put(`slot:${slotId}`, JSON.stringify(slot));

    // Create Google Calendar events for all 6 sessions
    await createCalendarEvents(env, slot);

    // Send confirmation email
    await sendBookingConfirmation(env, slot);

    // Send notification to Victor
    await sendHostNotification(env, slot);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const slotId = session.metadata?.slotId;
    const holdToken = session.metadata?.holdToken;

    if (slotId) {
      const raw = await env.SLOTS.get(`slot:${slotId}`);
      if (raw) {
        const slot = JSON.parse(raw);
        if (slot.holdToken === holdToken) {
          slot.status = "available";
          slot.holdUntil = null;
          slot.holdToken = null;
          await env.SLOTS.put(`slot:${slotId}`, JSON.stringify(slot));
        }
      }
    }
  }

  return jsonResponse({ received: true });
}

// ══════════════════════════════════════════
// SLOT HELPERS
// ══════════════════════════════════════════

async function getAllSlots(env) {
  const slots = [];
  for (const def of DEFAULT_SLOTS) {
    const raw = await env.SLOTS.get(`slot:${def.id}`);
    if (raw) {
      slots.push(JSON.parse(raw));
    } else {
      // Auto-initialize missing slots
      const slot = {
        id: def.id, day: def.day, time: def.time, label: def.label,
        status: def.preBooked ? "booked" : "available",
        holdUntil: null, holdToken: null,
        booking: def.preBooked ? { name: "Enrolled", email: "", plan: "weekly", bookedAt: "2026-04-07" } : null
      };
      await env.SLOTS.put(`slot:${def.id}`, JSON.stringify(slot));
      slots.push(slot);
    }
  }
  return slots;
}

async function handleInit(env) {
  for (const def of DEFAULT_SLOTS) {
    const slot = {
      id: def.id, day: def.day, time: def.time, label: def.label,
      status: def.preBooked ? "booked" : "available",
      holdUntil: null, holdToken: null,
      booking: def.preBooked ? { name: "Enrolled", email: "", plan: "weekly", bookedAt: "2026-04-07" } : null
    };
    await env.SLOTS.put(`slot:${def.id}`, JSON.stringify(slot));
  }
  return jsonResponse({ message: `Initialized ${DEFAULT_SLOTS.length} slots`, slots: DEFAULT_SLOTS.map(s => s.id) });
}

// ══════════════════════════════════════════
// STRIPE WEBHOOK VERIFICATION
// ══════════════════════════════════════════

async function verifyStripeWebhook(payload, sigHeader, secret) {
  if (!sigHeader || !secret) throw new Error("Missing signature or secret");

  const parts = {};
  sigHeader.split(",").forEach(item => {
    const [key, value] = item.split("=");
    parts[key.trim()] = value;
  });

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) throw new Error("Invalid signature format");

  // Check timestamp (allow 5 min tolerance)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) throw new Error("Timestamp too old");

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (expected !== signature) throw new Error("Signature mismatch");

  return JSON.parse(payload);
}

// ══════════════════════════════════════════
// GOOGLE CALENDAR
// ══════════════════════════════════════════

async function getGoogleAccessToken(env) {
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);

  // Build JWT header + claim set
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const toBase64Url = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsigned = toBase64Url(header) + "." + toBase64Url(claim);

  // Import RSA private key and sign
  const pemBody = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = unsigned + "." + sig64;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error("Google token error:", tokenData);
    throw new Error("Failed to get Google access token");
  }
  return tokenData.access_token;
}

async function createCalendarEvents(env, slot) {
  try {
    const accessToken = await getGoogleAccessToken(env);
    const b = slot.booking;
    const startDate = DEFAULT_SLOTS.find((d) => d.id === slot.id)?.startDate || START_WED;

    // Create 6 weekly events
    for (let week = 0; week < 6; week++) {
      const d = new Date(startDate + "T00:00:00");
      d.setDate(d.getDate() + week * 7);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD

      const [hours, mins] = slot.time.split(":");
      const startISO = `${dateStr}T${hours}:${mins}:00+01:00`; // IST (Ireland)
      const endMins = parseInt(mins) + 20;
      const endHours = parseInt(hours) + Math.floor(endMins / 60);
      const endM = endMins % 60;
      const endISO = `${dateStr}T${String(endHours).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00+01:00`;

      const event = {
        summary: `AI Badge: ${b.name} (Week ${week + 1}/6)`,
        description: `AI Badge coaching session with ${b.name} (${b.email}).\nPlan: ${b.plan}\nSlot: ${slot.label}`,
        start: { dateTime: startISO, timeZone: "Europe/Dublin" },
        end: { dateTime: endISO, timeZone: "Europe/Dublin" },
        attendees: [
          { email: b.email, displayName: b.name },
          { email: "victor@fiveinnolabs.com", displayName: "Victor del Rosal" },
        ],
        conferenceData: {
          createRequest: {
            requestId: `aibadge-${slot.id}-w${week + 1}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: { useDefault: false, overrides: [{ method: "email", minutes: 60 }, { method: "popup", minutes: 10 }] },
      };

      const calRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/fe025ce167a5b042f679c9b24648b785da74da9fd6aa2a17bcb42fe3bc955142%40group.calendar.google.com/events?conferenceDataVersion=1&sendUpdates=all",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      const calData = await calRes.json();
      if (!calRes.ok) {
        console.error(`Calendar event failed (week ${week + 1}):`, calData);
      } else {
        console.log(`Calendar event created (week ${week + 1}): ${calData.htmlLink}`);
      }
    }
  } catch (err) {
    console.error("Calendar integration error:", err);
    // Non-blocking: booking still succeeds even if calendar fails
  }
}

// ══════════════════════════════════════════
// EMAILS
// ══════════════════════════════════════════

async function sendBookingConfirmation(env, slot) {
  const b = slot.booking;
  const planLabel = b.plan === "upfront" ? "Full Programme (6 weeks, €495)" : `Weekly Session (€90)`;

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:24px;font-weight:800;color:#000036;">AI Badge</div>
    <div style="font-size:12px;color:#888;margin-top:2px;">Booking Confirmation</div>
  </div>
  <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;">&#x2705;</div>
      <div style="font-size:22px;font-weight:700;color:#000036;margin-top:8px;">You're booked!</div>
    </div>
    <table style="width:100%;font-size:14px;color:#333;">
      <tr><td style="padding:8px 0;font-weight:600;color:#666;">Slot</td><td style="padding:8px 0;">${slot.label}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#666;">Plan</td><td style="padding:8px 0;">${planLabel}</td></tr>
      <tr><td style="padding:8px 0;font-weight:600;color:#666;">Where</td><td style="padding:8px 0;">Google Meet (link sent separately)</td></tr>
    </table>
    <p style="font-size:13px;color:#666;margin-top:20px;line-height:1.6;">You'll receive 6 Google Calendar invites (with Google Meet links) for your sessions: every ${slot.day} at ${slot.time}, 20 minutes each.</p>
    <p style="font-size:12px;color:#888;margin-top:8px;">Your dates: ${getWeeklyDates(DEFAULT_SLOTS.find(d => d.id === slot.id)?.startDate || START_WED).join(", ")}</p>
  </div>
  <div style="text-align:center;font-size:11px;color:#999;padding:20px 0;">
    AI Badge by Victor del Rosal &middot; <a href="https://fiveinnolabs.com" style="color:#D4AF37;">fiveinnolabs</a>
  </div>
</div>
</body></html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: b.email,
      subject: `Booking Confirmed: AI Badge ${slot.label}`,
      html: html,
    }),
  });
}

async function sendHostNotification(env, slot) {
  const b = slot.booking;
  const planLabel = b.plan === "upfront" ? "Full Programme (€495)" : "Weekly (€90)";

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: "victor@fiveinnolabs.com",
      subject: `New AI Badge Booking: ${b.name} (${slot.label})`,
      html: `<p><strong>${b.name}</strong> (${b.email}) just booked <strong>${slot.label}</strong>.</p>
             <p>Plan: ${planLabel}</p>
             <p>Stripe session: ${b.stripeSessionId}</p>
             <p>6 Google Calendar events with Meet links have been created automatically.</p>`,
    }),
  });
}

// ══════════════════════════════════════════
// REPORT MAILER (existing functionality)
// ══════════════════════════════════════════

async function handleReportEmail(request, env) {
  try {
    const body = await request.json();
    const { email, scores, score, tier, archetype, flags, report } = body;

    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Valid email required" }, 400);
    }

    const html = buildReportEmailHTML({ scores, score, tier, archetype, flags, report });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: email,
        subject: `Your AI Competency Report: ${tier} (Score: ${score}/100)`,
        html: html,
        text: report || "",
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("Resend error:", result);
      return jsonResponse({ error: "Email send failed", detail: result }, 500);
    }
    return jsonResponse({ success: true, id: result.id });

  } catch (err) {
    console.error("Worker error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
}

// ══════════════════════════════════════════
// REPORT EMAIL HTML BUILDER
// ══════════════════════════════════════════

function buildReportEmailHTML({ scores, score, tier, archetype, flags, report }) {
  const s = score || 0;
  const dims = [
    { name: "AI Foundations", val: scores?.aiFoundations || 1 },
    { name: "Critical Evaluation", val: scores?.criticalEvaluation || 1 },
    { name: "Productive Creation", val: scores?.productiveCreation || 1 },
    { name: "Technical Building", val: scores?.technicalBuilding || 1 },
    { name: "Ethics & Governance", val: scores?.ethicsGovernance || 1 },
    { name: "Tool Fluency", val: scores?.toolFluency || 1 }
  ];

  const dimRows = dims.map(d => `
    <tr>
      <td style="padding:10px 16px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">${d.name}</td>
      <td style="padding:10px 16px;text-align:center;border-bottom:1px solid #f0f0f0;">
        <span style="display:inline-block;min-width:28px;padding:3px 10px;border-radius:8px;background:linear-gradient(180deg,#E8C84A,#B8960E);color:#fff;font-size:13px;font-weight:700;">${d.val}/5</span>
      </td>
    </tr>`).join("");

  const flagRows = (flags || []).map(f => `
    <div style="padding:12px 16px;margin-bottom:8px;border-radius:10px;background:${f.type === "warning" ? "#FFF8E1" : f.type === "caution" ? "#FFFDE7" : "#E8F4FD"};border:1px solid ${f.type === "warning" ? "#FFE082" : f.type === "caution" ? "#FFF59D" : "#B3E5FC"};font-size:13px;color:#333;line-height:1.5;">
      ${f.type === "warning" ? "\u26A0\uFE0F" : f.type === "caution" ? "\u25D0" : "\u2139\uFE0F"} ${f.text}
    </div>`).join("");

  const maxBar = 200;
  const dimBars = dims.map(d => {
    const barW = Math.round((d.val / 5) * maxBar);
    return `
    <tr>
      <td style="padding:8px 0;font-size:14px;font-weight:600;color:#333;white-space:nowrap;vertical-align:middle;">${d.name}</td>
      <td style="padding:8px 12px;vertical-align:middle;width:${maxBar + 20}px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:${maxBar}px;"><tr>
          <td style="width:${barW}px;height:8px;background:#D4AF37;border-radius:4px 0 0 4px;${barW >= maxBar ? 'border-radius:4px;' : ''}"></td>
          ${barW < maxBar ? `<td style="width:${maxBar - barW}px;height:8px;background:#f0f0f0;border-radius:0 4px 4px 0;"></td>` : ''}
        </tr></table>
      </td>
      <td style="padding:8px 0;text-align:center;vertical-align:middle;">
        <span style="display:inline-block;min-width:24px;padding:2px 8px;border-radius:6px;background:#D4AF37;color:#fff;font-size:12px;font-weight:700;">${d.val}</span>
      </td>
    </tr>`;
  }).join("");

  const formattedReport = formatReportHTML(report || "");
  const safeReport = (report || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f7;">
<tr><td align="center" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">

  <tr><td align="center" style="padding-bottom:32px;">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:10px 24px;border-radius:12px;background:#000036;">
        <span style="font-size:20px;font-weight:800;color:#D4AF37;letter-spacing:0.02em;">AI Badge</span>
      </td>
    </tr></table>
    <p style="font-size:12px;color:#999;margin:8px 0 0;">AI Competency Profile Report</p>
  </td></tr>

  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td align="center" style="padding:40px 32px;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" style="width:120px;height:120px;border-radius:60px;border:6px solid #D4AF37;background:#ffffff;text-align:center;vertical-align:middle;">
          <span style="font-size:48px;font-weight:800;color:#D4AF37;line-height:1;">${s}</span><br>
          <span style="font-size:10px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.1em;">out of 100</span>
        </td>
      </tr></table>
      <p style="font-size:28px;font-weight:700;color:#000036;margin:20px 0 0;line-height:1.2;">${tier || "Unknown"}</p>
      <p style="font-size:14px;color:#666;margin:6px 0 0;">Profile type: <strong style="color:#333;">${archetype || "Unknown"}</strong></p>
    </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td style="padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Your Dimension Scores</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${dimBars}
      </table>
    </td></tr>
    </table>
  </td></tr>

  ${flagRows ? `
  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td style="padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Key Observations</p>
      ${flagRows}
    </td></tr>
    </table>
  </td></tr>
  ` : ""}

  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td style="padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Detailed Report</p>
      ${formattedReport}
    </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000036;border-radius:16px;">
    <tr><td align="center" style="padding:40px 32px;">
      <p style="font-size:22px;font-weight:700;color:#D4AF37;margin:0 0 10px;">Ready to level up?</p>
      <p style="font-size:14px;color:#9999bb;margin:0 0 24px;line-height:1.6;">AI Badge is a 6-week one-to-one coaching programme. Every session is personalised to your profile and goals. Start from &euro;90/week.</p>
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding:14px 36px;border-radius:12px;background:#D4AF37;">
          <a href="https://aibadge.fiveinnolabs.com/#pricing" style="font-size:15px;font-weight:700;color:#1a1a00;text-decoration:none;">See Plans &amp; Enrol</a>
        </td>
      </tr></table>
    </td></tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:20px 0;">
    <p style="font-size:11px;color:#bbb;margin:0;">Victor del Rosal &middot; <a href="https://fiveinnolabs.com" style="color:#D4AF37;text-decoration:none;">fiveinnolabs</a> &middot; 2026</p>
    <p style="font-size:10px;color:#ccc;margin:4px 0 0;">You received this because you requested an AI competency report at aibadge.com</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function formatReportHTML(text) {
  const safe = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const lines = safe.split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (/^[━─]{4,}/.test(line)) { i++; continue; }
    if (!line) { i++; continue; }

    if (/^[A-Z][A-Z &\/\(\),:0-9]+$/.test(line) && line.length > 3) {
      if (line.includes("LEVEL") || /: Level/i.test(lines[i])) {
        html += `<p style="font-size:14px;font-weight:700;color:#000036;margin:20px 0 4px;padding-top:16px;border-top:1px solid #f0f0f0;">${line}</p>`;
      } else {
        html += `<p style="font-size:12px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:0.06em;margin:24px 0 8px;padding-top:16px;border-top:2px solid #f0f0f0;">${line}</p>`;
      }
      i++; continue;
    }

    if (/^[A-Z][A-Z &\/]+:/.test(line)) {
      html += `<p style="font-size:14px;font-weight:700;color:#000036;margin:20px 0 4px;padding-top:16px;border-top:1px solid #f0f0f0;">${line}</p>`;
      i++; continue;
    }

    if (line.startsWith("&quot;") || line.startsWith('"') || line.startsWith("\u201C")) {
      html += `<p style="font-size:13px;font-style:italic;color:#666;margin:4px 0 4px;padding-left:12px;border-left:3px solid #D4AF37;">${line}</p>`;
      i++; continue;
    }

    if (/^\d+\./.test(line)) {
      html += `<p style="font-size:13px;font-weight:600;color:#333;margin:16px 0 4px;">${line}</p>`;
      i++; continue;
    }

    if (line.startsWith("─") || line.startsWith("&amp;#x2500;")) {
      const fwName = line.replace(/^─+\s*/, "");
      html += `<p style="font-size:13px;font-weight:700;color:#000036;margin:16px 0 4px;">${fwName}</p>`;
      i++; continue;
    }

    if (line.startsWith("Your level:")) {
      const level = line.replace("Your level:", "").trim();
      html += `<p style="font-size:13px;margin:2px 0;color:#333;">Your level: <strong style="color:#D4AF37;">${level}</strong></p>`;
      i++; continue;
    }

    if (line.startsWith("Levels:")) {
      html += `<p style="font-size:11px;color:#999;margin:4px 0 12px;">${line}</p>`;
      i++; continue;
    }

    html += `<p style="font-size:13px;color:#444;line-height:1.6;margin:4px 0;">${line}</p>`;
    i++;
  }
  return html;
}

// ══════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
