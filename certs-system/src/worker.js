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
import { buildCredential, buildLegacyCredential, ISSUER_PROFILE, ACHIEVEMENT, VERIFICATION_METHOD, LEVELS, DEFAULT_LEVEL } from "./lib/credential.js";
import { qrSvg } from "./lib/qr.js";
import { renderArtifacts } from "./lib/render.js";
import { sendBadgeEmail } from "./lib/email.js";
import { getRecord, putRecord, listRecords, exists, putArtifact, getArtifact, artifactKeys, deleteRecord, deleteArtifact } from "./lib/store.js";
import { landingPage, credentialPage, fmtDate } from "./pages.js";
import { dashboardPage } from "./dashboard.js";

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
  if (path === "/api/revoke" && method === "POST") return apiRevoke(request, env);
  if (path === "/api/delete" && method === "POST") return apiDelete(request, env);

  // ---- per-credential artifacts & page -------------------------------------
  // /<code>/badge.png etc.
  const art = path.match(/^\/([a-z][0-9][a-z][0-9]{2})\/(badge\.png|og\.png|credential\.pdf|credential\.json)$/);
  if (art) {
    const [, code, file] = art;
    const ct = file.endsWith(".png") ? "image/png" : file.endsWith(".pdf") ? "application/pdf" : "application/json";
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

function validateInput(b) {
  if (!b || typeof b !== "object") return "invalid body";
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const issuedDate = String(b.issuedDate || "").trim();
  if (name.length < 2 || name.length > 80) return "name length";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "invalid email";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) return "invalid date";
  return null;
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
  return { "Access-Control-Allow-Origin": "*" };
}

async function apiList(request, env) {
  const principal = await requireIssuer(request, env);
  if (!principal) return json({ error: "unauthorised" }, 401);
  const recs = await listRecords(env);
  return json({
    credentials: recs.map((r) => ({
      ucid: r.ucid,
      name: r.name,
      issuedDate: r.issuedDate,
      status: r.status || "issued",
      legacy: !!r.legacy,
      source: r.source || null,
    })),
  });
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
    name: body.name.trim(),
    cohort: (body.cohort || "").trim(),
    issuedDate: body.issuedDate,
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
  // Issuer may target a specific code (re-create / vanity); otherwise allocate one.
  let ucid;
  if (body.ucid) {
    ucid = String(body.ucid).toLowerCase();
    if (!UCID_RE.test(ucid)) return json({ error: "invalid ucid" }, 400);
  } else {
    ucid = await uniqueUcid(env);
  }
  const rec = {
    ucid,
    name: body.name.trim(),
    email: body.email.trim(),
    cohort: (body.cohort || "").trim(),
    issuedDate: body.issuedDate,
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
        badgeBytes: badge,
        pdfBytes: pdf,
        issuedDisplay: fmtDate(rec.issuedDate),
      });
      emailed = true;
    } catch (e) {
      return json({ ok: true, ucid, url: `https://${host}/${ucid}`, emailed: false, emailError: String(e.message) });
    }
  }
  return json({ ok: true, ucid, url: `https://${host}/${ucid}`, emailed });
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
