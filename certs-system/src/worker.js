// worker.js — certs.fiveinnolabs.com. Serves the verify landing, per-credential
// brag/verify pages, artifacts, the issuer profile + public key, the issuer-only
// dashboard, and the issuance/verify/revoke APIs.
import { requireIssuer } from "./lib/firebase-auth.js";
import {
  importPrivateKeyJwk,
  signCredential,
  generateUcid,
  UCID_RE,
  multikeyToPublicKey,
} from "./lib/crypto-core.js";
import { buildCredential, buildLegacyCredential, ISSUER_PROFILE, ACHIEVEMENT, VERIFICATION_METHOD, LEVELS, DEFAULT_LEVEL, ISSUABLE_LEVELS } from "./lib/credential.js";
import { qrSvg } from "./lib/qr.js";
import { renderArtifacts } from "./lib/render.js";
import { sendBadgeEmail } from "./lib/email.js";
import { getRecord, putRecord, listRecords, exists, putArtifact, getArtifact, artifactKeys, deleteRecord, deleteArtifact, findByEmail, indexEmail, unindexEmail } from "./lib/store.js";
import { landingPage, credentialPage, fmtDate } from "./pages.js";
import { dashboardPage } from "./dashboard.js";
import { track, readStats, CLIENT_EVENTS } from "./lib/stats.js";

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...extra } });
const html = (body, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB2KopG32ymOjNXtk6G0zwtJikPcvt_0fU",
  authDomain: "ai-badge-2026.firebaseapp.com",
  projectId: "ai-badge-2026",
  storageBucket: "ai-badge-2026.firebasestorage.app",
  messagingSenderId: "835112059960",
  appId: "1:835112059960:web:1c30e27f6daff9f55292cd",
};

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (e) {
      return json({ error: "worker error", detail: String(e && e.message) }, 500);
    }
  },
};

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const host = url.host;
  const path = url.pathname;
  const method = request.method;

  // CORS preflight for API
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // ---- static / well-known -------------------------------------------------
  if (path === "/" ) return html(landingPage(host));
  if (path === "/issue") return html(dashboardPage(FIREBASE_CONFIG));
  if (path === "/issuer") return json(ISSUER_PROFILE);
  if (path === "/achievements/ai-badge") return json(ACHIEVEMENT);
  if (path === "/.well-known/issuer-public.json") {
    return json({
      "@context": ["https://w3id.org/security/multikey/v1"],
      id: VERIFICATION_METHOD,
      type: "Multikey",
      controller: ISSUER_PROFILE.id,
      publicKeyMultibase: env.ISSUER_PUBLIC_MULTIKEY,
      jwk: env.ISSUER_PUBLIC_JWK ? JSON.parse(env.ISSUER_PUBLIC_JWK) : undefined,
    });
  }
  if (path === "/assets/emblem.png") return serveR2(env, "assets/emblem.png", "image/png", request);
  if (path === "/assets/logo-white.png") return serveR2(env, "assets/logo-white.png", "image/png", request);
  if (path === "/assets/logo-dark.png") return serveR2(env, "assets/logo-dark.png", "image/png", request);
  if (path === "/lib/crypto-core.js") return serveR2(env, "lib/crypto-core.js", "application/javascript; charset=utf-8", request);

  // ---- APIs ----------------------------------------------------------------
  if (path.startsWith("/api/verify/")) return apiVerify(env, path.slice("/api/verify/".length));
  if (path === "/api/list" && method === "GET") return apiList(request, env);
  if (path === "/api/preview" && method === "POST") return apiPreview(request, env);
  if (path === "/api/issue" && method === "POST") return apiIssue(request, env, ctx);
  if (path === "/api/rerender" && method === "POST") return apiRerender(request, env);
  if (path === "/api/send" && method === "POST") return apiSend(request, env);
  if (path === "/api/revoke" && method === "POST") return apiRevoke(request, env);
  if (path === "/api/delete" && method === "POST") return apiDelete(request, env);

  // ---- engagement tracking -------------------------------------------------
  // The graduation email's badge <img> points here. It records the open and then
  // serves the real badge bytes, so the email looks identical and there is no
  // second request and no double count against the png download.
  const beacon = path.match(/^\/e\/o\/([a-z][0-9][a-z][0-9]{2})\.png$/);
  if (beacon) {
    track(env, ctx, request, beacon[1], "open", "email");
    const img = await serveR2(env, `${beacon[1]}/badge.png`, "image/png", request);
    // No caching on the beacon specifically: a cached response never reaches the
    // worker, so a second open inside the cache window would be invisible.
    const h = new Headers(img.headers);
    h.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return new Response(img.body, { status: img.status, headers: h });
  }
  // Tracked click-through for the two links in the email.
  const click = path.match(/^\/e\/c\/([a-z][0-9][a-z][0-9]{2})\/(verify|linkedin)$/);
  if (click) {
    const [, code, kind] = click;
    track(env, ctx, request, code, kind === "verify" ? "email_verify" : "email_linkedin", "email");
    const dest =
      kind === "verify"
        ? `https://${host}/${code}`
        : "https://www.linkedin.com/feed/?shareActive=true&text=" +
          encodeURIComponent(
            `I've earned the AI Badge from fiveinnolabs, a verifiable credential for applied, human-centred AI. Verify it here: https://${host}/${code}`
          );
    return Response.redirect(dest, 302);
  }
  // On-page button presses that produce no fetch of their own.
  if (path === "/api/track" && method === "POST") return apiTrack(request, env, ctx);
  if (path === "/api/stats" && method === "GET") return apiStats(request, env);

  // ---- per-credential artifacts & page -------------------------------------
  // /<code>/badge.png etc.
  const art = path.match(/^\/([a-z][0-9][a-z][0-9]{2})\/(badge\.png|og\.png|credential\.pdf|credential\.json)$/);
  if (art) {
    const [, code, file] = art;
    const ct = file.endsWith(".png") ? "image/png" : file.endsWith(".pdf") ? "application/pdf" : "application/json";
    // og.png is the social unfurl image, so it means "someone previewed a share",
    // not "someone downloaded the badge". Counted separately on purpose.
    const ev = { "credential.pdf": "pdf", "badge.png": "png", "og.png": "preview", "credential.json": "vc" }[file];
    if (ev) track(env, ctx, request, code, ev, "direct");
    return serveR2(env, `${code}/${file}`, ct, request);
  }
  // legacy compatibility: /<code>.pdf -> the credential PDF
  const legacyPdf = path.match(/^\/([a-z][0-9][a-z][0-9]{2})\.pdf$/);
  if (legacyPdf) {
    const code = legacyPdf[1];
    // prefer the original legacy PDF if present, else the generated one
    const orig = await getArtifact(env, `${code}/legacy-original.pdf`);
    if (orig) return r2Response(orig, "application/pdf", request);
    return serveR2(env, `${code}/credential.pdf`, "application/pdf", request);
  }
  // /<code> -> credential page
  const codeMatch = path.match(/^\/([a-z][0-9][a-z][0-9]{2})$/);
  if (codeMatch) {
    const rec = await getRecord(env, codeMatch[1]);
    if (!rec) return html(notFoundPage(host, codeMatch[1]), 404);
    track(env, ctx, request, rec.ucid, "view", "page");
    return html(credentialPage(rec, host));
  }

  return html(notFoundPage(host), 404);
}

/* --------------------------------------------------------------- helpers ---- */
async function serveR2(env, key, contentType, request) {
  const obj = await getArtifact(env, key);
  if (!obj) return new Response("Not found", { status: 404 });
  return r2Response(obj, contentType, request);
}
function r2Response(obj, contentType, request) {
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "public, max-age=300");
  headers.set("Access-Control-Allow-Origin", "*");
  if (obj.httpEtag) headers.set("ETag", obj.httpEtag);
  return new Response(obj.body, { headers });
}

async function getPrivateKey(env) {
  const jwk = JSON.parse(env.ISSUER_PRIVATE_JWK);
  return importPrivateKeyJwk(jwk);
}

async function r2DataUri(env, key) {
  const obj = await getArtifact(env, key);
  const buf = new Uint8Array(await obj.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  return "data:image/png;base64," + btoa(bin);
}

// Load all brand assets as data URIs once, for embedding into rendered HTML.
async function loadAssets(env) {
  const [emblem, logoWhite, logoDark] = await Promise.all([
    r2DataUri(env, "assets/emblem.png"),
    r2DataUri(env, "assets/logo-white.png"),
    r2DataUri(env, "assets/logo-dark.png"),
  ]);
  return { emblem, logoWhite, logoDark };
}

function renderData(rec, host, assets) {
  const verifyUrl = `https://${host}/${rec.ucid}`;
  // Non-legacy AI Badges carry a level designation + competencies. Legacy
  // (HELIOS) certs do not — they render exactly as before.
  const lvl = rec.legacy ? null : (LEVELS[rec.level || DEFAULT_LEVEL] || LEVELS[DEFAULT_LEVEL]);
  return {
    name: rec.name,
    ucid: rec.ucid,
    cohort: rec.cohort || "",
    legacy: !!rec.legacy,
    designation: lvl ? lvl.designation : "",
    competencies: lvl ? lvl.competencies : [],
    issuedDisplay: fmtDate(rec.issuedDate),
    verifyUrl,
    verifyHost: host,
    emblemDataUri: assets.emblem,
    logoWhite: assets.logoWhite,
    logoDark: assets.logoDark,
    qr: qrSvg(verifyUrl, { size: 150, fg: "#0b1440", bg: "transparent", ecl: "M" }),
  };
}

// Marksheets and rosters disagree about Unicode: the same Irish name arrives as
// precomposed "Ó" (U+00D3) from one source and decomposed "O"+U+0301 from another.
// Both look identical and sign to different bytes, so everything is normalised to
// NFC before it is rendered or signed.
function nfc(v) {
  return String(v || "").normalize("NFC");
}

function validateInput(b) {
  if (!b || typeof b !== "object") return "invalid body";
  const name = nfc(b.name).trim();
  const email = String(b.email || "").trim();
  const issuedDate = String(b.issuedDate || "").trim();
  if (name.length < 2 || name.length > 80) return "name length";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "invalid email";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) return "invalid date";
  if (b.level !== undefined && b.level !== null && !ISSUABLE_LEVELS.includes(Number(b.level))) return "invalid level";
  return null;
}

// The tier being issued. Absent or unrecognised falls back to Level 1, which is
// what every credential issued before Level 2 existed already carries.
function levelOf(b) {
  const n = Number(b && b.level);
  return ISSUABLE_LEVELS.includes(n) ? n : DEFAULT_LEVEL;
}

async function uniqueUcid(env) {
  for (let i = 0; i < 30; i++) {
    const c = generateUcid();
    if (!(await exists(env, c))) return c;
  }
  throw new Error("could not allocate UCID");
}

/* ----------------------------------------------------------------- APIs ----- */
async function apiVerify(env, code) {
  if (!UCID_RE.test(code)) return json({ found: false }, 200, cors());
  const rec = await getRecord(env, code);
  if (!rec) return json({ found: false }, 200, cors());
  const vcObj = await getArtifact(env, artifactKeys(code).vc);
  const credential = vcObj ? JSON.parse(await vcObj.text()) : null;
  return json(
    {
      found: true,
      status: rec.status || "issued",
      legacy: !!rec.legacy,
      source: rec.source || null,
      name: rec.name,
      issuedDate: rec.issuedDate,
      credential,
      publicKeyMultikey: env.ISSUER_PUBLIC_MULTIKEY,
    },
    200,
    cors()
  );
}
function cors() {
  // "*" is correct here: every one of these responses is either public or already
  // gated on a bearer token, and no cookies are involved. The admin dashboard on
  // aibadge.fiveinnolabs.com relies on this to read /api/stats cross-origin.
  return { "Access-Control-Allow-Origin": "*", "Vary": "Origin" };
}

async function apiList(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const recs = await listRecords(env);
  return json({
    credentials: recs.map((r) => ({
      ucid: r.ucid,
      name: r.name,
      email: r.email || null,
      cohort: r.cohort || "",
      level: r.level || 1,
      issuedDate: r.issuedDate,
      emailedAt: r.emailedAt || null,
      emailCount: r.emailCount || 0,
      status: r.status || "issued",
      legacy: !!r.legacy,
      source: r.source || null,
    })),
  });
}

// Public, deliberately narrow: only the three on-page presses that leave no other
// trace, and only for a credential that actually exists. Everything else the system
// records is recorded server-side, so a stranger cannot forge a download count.
async function apiTrack(request, env, ctx) {
  // Cap before parsing: this endpoint is public and unauthenticated, so an
  // unbounded body is a free way to spend our CPU and D1 writes.
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > 512) return json({ error: "bad request" }, 400, cors());
  const body = await request.json().catch(() => null);
  const code = String((body && body.ucid) || "").toLowerCase();
  const event = String((body && body.event) || "");
  if (!UCID_RE.test(code) || !CLIENT_EVENTS.has(event)) return json({ error: "bad request" }, 400, cors());
  if (!(await exists(env, code))) return json({ error: "unknown credential" }, 400, cors());
  track(env, ctx, request, code, event, "page");
  return new Response(null, { status: 204, headers: cors() });
}

// Issuer-only. Joins the D1 aggregates to the KV records so the dashboard can show
// a name beside each code.
async function apiStats(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401, cors());
  const [stats, recs] = await Promise.all([readStats(env), listRecords(env)]);
  const meta = {};
  for (const r of recs) {
    meta[r.ucid] = {
      name: r.name,
      email: r.email || null,
      cohort: r.cohort || "",
      level: r.level || 1,
      issuedDate: r.issuedDate,
      status: r.status || "issued",
      legacy: !!r.legacy,
    };
  }
  const credentials = recs
    .map((r) => {
      const s = stats.credentials.find((c) => c.ucid === r.ucid);
      return { ...meta[r.ucid], ucid: r.ucid, events: (s && s.events) || {}, lastTs: (s && s.lastTs) || null };
    })
    .sort((a, b) => (b.issuedDate || "").localeCompare(a.issuedDate || ""));
  return json({ credentials, totals: stats.totals, proxyOpens: stats.proxyOpens, events: stats.events, error: stats.error || null }, 200, cors());
}

async function apiPreview(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const body = await request.json().catch(() => null);
  const err = validateInput(body);
  if (err) return json({ error: err }, 400);
  // Mint the real code now and return it, so the preview shows the actual code
  // that will be issued; the dashboard passes it back to /api/issue.
  const ucid = await uniqueUcid(env);
  const rec = {
    ucid,
    name: nfc(body.name).trim(),
    cohort: nfc(body.cohort).trim(),
    issuedDate: body.issuedDate,
    level: levelOf(body),
    legacy: false,
  };
  const assets = await loadAssets(env);
  const { badge, og, pdf } = await renderArtifacts(env, renderData(rec, new URL(request.url).host, assets));
  return json({
    ucid,
    badge: "data:image/png;base64," + b64(badge),
    og: "data:image/png;base64," + b64(og),
    pdf: "data:application/pdf;base64," + b64(pdf),
  });
}

async function apiIssue(request, env, ctx) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const body = await request.json().catch(() => null);
  const err = validateInput(body);
  if (err) return json({ error: err }, 400);

  const host = new URL(request.url).host;

  // One live credential per person. This is what makes a 37-row bulk run safely
  // resumable: re-running it cannot issue anybody twice.
  if (!body.allowDuplicate) {
    const existing = await findByEmail(env, body.email);
    if (existing) {
      return json(
        { error: "already_issued", ucid: existing.ucid, name: existing.name,
          issuedDate: existing.issuedDate, url: `https://${host}/${existing.ucid}` },
        409
      );
    }
  }

  // Issuer may target a specific code (re-create / vanity); otherwise allocate one.
  let ucid;
  if (body.ucid) {
    ucid = String(body.ucid).toLowerCase();
    if (!UCID_RE.test(ucid)) return json({ error: "invalid ucid" }, 400);
    // Never overwrite an existing credential by targeting its code. Replacing a
    // holder in place would leave the previous person's email index pointing at
    // a record that is now somebody else.
    const clash = await getRecord(env, ucid);
    if (clash && !body.allowOverwrite) {
      return json({ error: "ucid_taken", ucid, name: clash.name }, 409);
    }
  } else {
    ucid = await uniqueUcid(env);
  }
  const rec = {
    ucid,
    name: nfc(body.name).trim(),
    email: body.email.trim().toLowerCase(),
    cohort: nfc(body.cohort).trim(),
    issuedDate: body.issuedDate,
    level: levelOf(body),
    status: "issued",
    legacy: false,
    createdAt: new Date().toISOString(),
    createdBy: principal.email,
  };

  // 1. build + sign VC
  const priv = await getPrivateKey(env);
  const cred = buildCredential(rec);
  const signed = await signCredential(cred, priv, {
    created: new Date().toISOString(),
    verificationMethod: VERIFICATION_METHOD,
  });

  // 2. render artifacts
  const assets = await loadAssets(env);
  const { badge, og, pdf } = await renderArtifacts(env, renderData(rec, host, assets));

  // 3. store
  const keys = artifactKeys(ucid);
  await putArtifact(env, keys.vc, JSON.stringify(signed), "application/json");
  await putArtifact(env, keys.badge, badge, "image/png");
  await putArtifact(env, keys.og, og, "image/png");
  await putArtifact(env, keys.pdf, pdf, "application/pdf");
  // Index first, record second. If the second write fails, the orphan index key
  // resolves to null through findByEmail and is harmless. The reverse order would
  // leave a live public credential invisible to the duplicate guard forever.
  await indexEmail(env, rec.email, ucid);
  await putRecord(env, rec);

  // 4. email (optional)
  let emailed = false;
  if (body.sendEmail) {
    try {
      await sendBadgeEmail(env, {
        to: rec.email,
        name: rec.name,
        ucid,
        verifyUrl: `https://${host}/${ucid}`,
        badgeUrl: `https://${host}/${ucid}/badge.png`,
        host,
        badgeBytes: badge,
        pdfBytes: pdf,
        issuedDisplay: fmtDate(rec.issuedDate),
        level: rec.level || DEFAULT_LEVEL,
      });
      emailed = true;
      // Stamp the record, not the browser tab. Who has been emailed must survive
      // a refresh, a closed laptop and a different machine.
      rec.emailedAt = new Date().toISOString();
      rec.emailCount = (rec.emailCount || 0) + 1;
      await putRecord(env, rec);
    } catch (e) {
      return json({ ok: true, ucid, url: `https://${host}/${ucid}`, emailed: false, emailError: String(e.message) });
    }
  }
  return json({ ok: true, ucid, url: `https://${host}/${ucid}`, emailed });
}

// Send (or re-send) the graduation email for a credential that already exists.
// This is what lets a bulk run mint everything first, verify it, and only then
// email — and it doubles as the "I lost it, can you resend?" path.
async function apiSend(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const body = await request.json().catch(() => null);
  const code = String((body && body.ucid) || "").toLowerCase();
  if (!UCID_RE.test(code)) return json({ error: "invalid code" }, 400);
  const rec = await getRecord(env, code);
  if (!rec) return json({ error: "not found" }, 404);
  if (rec.status === "revoked") return json({ error: "revoked" }, 409);
  if (!rec.email) return json({ error: "no email on record" }, 400);

  const host = new URL(request.url).host;
  const [badgeObj, pdfObj] = await Promise.all([
    getArtifact(env, artifactKeys(code).badge),
    getArtifact(env, artifactKeys(code).pdf),
  ]);
  if (!badgeObj || !pdfObj) return json({ error: "artifacts missing" }, 409);

  try {
    await sendBadgeEmail(env, {
      to: rec.email,
      name: rec.name,
      ucid: code,
      verifyUrl: `https://${host}/${code}`,
      badgeUrl: `https://${host}/${code}/badge.png`,
      host,
      badgeBytes: new Uint8Array(await badgeObj.arrayBuffer()),
      pdfBytes: new Uint8Array(await pdfObj.arrayBuffer()),
      issuedDisplay: fmtDate(rec.issuedDate),
      level: rec.level || DEFAULT_LEVEL,
    });
  } catch (e) {
    return json({ ok: false, ucid: code, emailed: false, error: String(e.message) }, 502);
  }
  rec.emailedAt = new Date().toISOString();
  rec.emailCount = (rec.emailCount || 0) + 1;
  await putRecord(env, rec);
  return json({ ok: true, ucid: code, emailed: true, to: rec.email, emailedAt: rec.emailedAt });
}

// Re-render badge.png + og.png for an existing record (e.g. after a template
// change). Keeps the VC and PDF untouched. Issuer-gated.
async function apiRerender(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const body = await request.json().catch(() => null);
  const code = body && String(body.ucid || "");
  if (!UCID_RE.test(code)) return json({ error: "invalid code" }, 400);
  const rec = await getRecord(env, code);
  if (!rec) return json({ error: "not found" }, 404);
  const assets = await loadAssets(env);
  const { badge, og, pdf } = await renderArtifacts(env, renderData(rec, new URL(request.url).host, assets));
  const keys = artifactKeys(code);
  await putArtifact(env, keys.badge, badge, "image/png");
  await putArtifact(env, keys.og, og, "image/png");
  // Legacy keeps its ORIGINAL HELIOS PDF; only AI Badge PDFs are regenerated.
  if (!rec.legacy) await putArtifact(env, keys.pdf, pdf, "application/pdf");
  return json({ ok: true, ucid: code });
}

async function apiRevoke(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const body = await request.json().catch(() => null);
  const code = body && String(body.ucid || "");
  if (!UCID_RE.test(code)) return json({ error: "invalid code" }, 400);
  const rec = await getRecord(env, code);
  if (!rec) return json({ error: "not found" }, 404);
  rec.status = "revoked";
  rec.revokedAt = new Date().toISOString();
  await putRecord(env, rec);
  // Free the address so a corrected credential can be issued to the same person.
  await unindexEmail(env, rec.email, rec.ucid);
  return json({ ok: true });
}

// Permanently delete a credential. Guard: it must be REVOKED first, so deletion
// is always a deliberate two-step action. Wipes the KV record and all R2 artifacts.
async function apiDelete(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const body = await request.json().catch(() => null);
  const code = body && String(body.ucid || "");
  if (!UCID_RE.test(code)) return json({ error: "invalid code" }, 400);
  const rec = await getRecord(env, code);
  if (!rec) return json({ error: "not found" }, 404);
  if (rec.status !== "revoked") {
    return json({ error: "must_revoke_first", message: "Revoke this credential before deleting it." }, 409);
  }
  const keys = artifactKeys(code);
  await Promise.all([
    deleteArtifact(env, keys.vc),
    deleteArtifact(env, keys.badge),
    deleteArtifact(env, keys.og),
    deleteArtifact(env, keys.pdf),
    deleteArtifact(env, `${code}/legacy-original.pdf`),
  ]);
  await deleteRecord(env, code);
  await unindexEmail(env, rec.email, rec.ucid);
  return json({ ok: true, deleted: code });
}

function b64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}

function notFoundPage(host, code) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Not found · The AI Badge</title>
<body style="font-family:Inter,system-ui,sans-serif;background:linear-gradient(165deg,#0a1230,#04060f);color:#eef2ff;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;margin:0">
<div><img src="/assets/emblem.png" style="width:120px" alt=""><h1 style="font-weight:600">No credential found${code ? ` for <code style="color:#d8bd78">${code}</code>` : ""}</h1>
<p style="color:#9aa6c8">Check the 5-character code, or <a href="/" style="color:#6ea0ec">verify another credential</a>.</p></div></body>`;
}
