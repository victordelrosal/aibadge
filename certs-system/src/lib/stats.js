// stats.js — engagement analytics for issued credentials.
//
// PRIVACY POSTURE (deliberate, and the reason this file is small):
// we store the credential id, what happened, when, Cloudflare's two-letter country
// hint, a coarse user-agent family, and the referring hostname. We never store a raw
// IP address, a full user-agent string, or an email. The credential id maps to a
// person, so the table is personal data and is readable only by the issuer.
//
// Every write is fire-and-forget through ctx.waitUntil: a failure here must never
// change what the visitor receives.

// Events we accept from the public /api/track endpoint. Server-side events (open,
// view, pdf, png, preview, vc, email_*) are recorded by the worker itself and are
// deliberately NOT in this list, so a stranger cannot forge a download.
export const CLIENT_EVENTS = new Set(["linkedin", "copy", "share"]);

// Every event the system can record, for validation and for the stats shape.
export const ALL_EVENTS = [
  "open",          // the graduation email was rendered (see the caveat below)
  "email_verify",  // clicked "View & verify your badge" in the email
  "email_linkedin",// clicked "Share on LinkedIn" in the email
  "view",          // loaded the credential page
  "pdf",           // fetched the certificate PDF
  "png",           // fetched the badge image
  "linkedin",      // pressed "Add to LinkedIn" on the page
  "copy",          // pressed "Copy link" on the page
  "share",         // pressed "Share" on the page
  "preview",       // a crawler fetched og.png (LinkedIn/WhatsApp/Slack unfurl)
  "vc",            // fetched the raw signed credential JSON
];

// Coarse UA families. The point is to separate humans from machines in the numbers,
// not to fingerprint anyone, so this stays deliberately blunt.
export function uaClass(ua) {
  const s = String(ua || "").toLowerCase();
  if (!s) return "none";
  if (s.includes("googleimageproxy")) return "gmail-proxy";
  if (s.includes("linkedinbot")) return "linkedin-bot";
  if (s.includes("whatsapp")) return "whatsapp-bot";
  if (s.includes("slackbot")) return "slack-bot";
  if (s.includes("twitterbot") || s.includes("facebookexternalhit")) return "social-bot";
  if (s.includes("bot") || s.includes("crawler") || s.includes("spider")) return "bot";
  if (s.includes("curl") || s.includes("wget") || s.includes("python")) return "tool";
  return "browser";
}

function refHost(request) {
  const r = request.headers.get("Referer");
  if (!r) return null;
  try {
    return new URL(r).hostname;
  } catch {
    return null;
  }
}

// Record one event. Never throws, never blocks: call it and move on.
export function track(env, ctx, request, ucid, event, channel = null) {
  if (!env || !env.STATS_DB) return;
  // The whole body is wrapped, not just the promise: prepare() and bind() throw
  // SYNCHRONOUSLY when the table is missing or D1 is unhealthy, and an uncaught
  // throw here would turn a working credential page into a 500. Analytics are
  // never allowed to cost a delivery.
  try {
    const write = env.STATS_DB.prepare(
      "INSERT INTO events (ts, ucid, event, channel, country, ua_class, ref_host) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        new Date().toISOString(),
        ucid,
        event,
        channel,
        (request.cf && request.cf.country) || null,
        uaClass(request.headers.get("User-Agent")),
        refHost(request)
      )
      .run()
      .catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(write);
  } catch {
    /* deliberately silent: a lost event is acceptable, a lost credential is not */
  }
}

// Per-credential aggregates plus totals, for the admin dashboard.
export async function readStats(env) {
  if (!env.STATS_DB) return { credentials: [], totals: {}, recent: [] };

  const [byCred, totals, recent] = await Promise.all([
    env.STATS_DB.prepare(
      `SELECT ucid, event, COUNT(*) AS n, MAX(ts) AS last_ts
         FROM events
        WHERE ua_class NOT IN ('bot','social-bot','linkedin-bot','whatsapp-bot','slack-bot')
        GROUP BY ucid, event`
    ).all(),
    env.STATS_DB.prepare(`SELECT event, ua_class, COUNT(*) AS n FROM events GROUP BY event, ua_class`).all(),
    env.STATS_DB.prepare(
      `SELECT ts, ucid, event, country, ua_class FROM events ORDER BY id DESC LIMIT 60`
    ).all(),
  ]);

  const creds = {};
  for (const r of byCred.results || []) {
    const c = (creds[r.ucid] = creds[r.ucid] || { ucid: r.ucid, events: {}, lastTs: null });
    c.events[r.event] = r.n;
    if (!c.lastTs || r.last_ts > c.lastTs) c.lastTs = r.last_ts;
  }

  const tot = {};
  let proxyOpens = 0;
  for (const r of totals.results || []) {
    tot[r.event] = (tot[r.event] || 0) + r.n;
    if (r.event === "open" && r.ua_class === "gmail-proxy") proxyOpens += r.n;
  }

  return {
    credentials: Object.values(creds),
    totals: tot,
    proxyOpens,
    recent: recent.results || [],
    events: ALL_EVENTS,
  };
}
