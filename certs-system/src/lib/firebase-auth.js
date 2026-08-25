// firebase-auth.js — verify a Firebase ID token (keyless JWKS, RS256) and gate
// to the single issuer identity. Mirrors the proven aibadge-report-mailer logic.

export async function verifyFirebaseToken(idToken, env) {
  try {
    const projectId = env.FIREBASE_PROJECT_ID || "ai-badge-2026";
    const parts = String(idToken || "").split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(b64urlToString(parts[0]));
    const payload = JSON.parse(b64urlToString(parts[1]));
    if (!header.kid || header.alg !== "RS256") return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (!payload.exp || payload.exp < now) return null;
    if (payload.iat && payload.iat > now + 300) return null;
    const sub = payload.sub || payload.user_id;
    if (!sub) return null;

    const jwksRes = await fetch(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    );
    if (!jwksRes.ok) return null;
    const jwks = await jwksRes.json();
    const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const sig = b64urlToBytes(parts[2]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, signed);
    if (!valid) return null;

    return {
      uid: sub,
      email: (payload.email || "").toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name || "",
    };
  } catch {
    return null;
  }
}

// The ONLY identity allowed to issue or revoke. Hard-coded by design.
export const ISSUER_EMAIL = "victordelrosal@gmail.com";

// Returns the principal if the bearer token is a verified issuer, else null.
export async function requireIssuer(request, env) {
  // The alpha test hook that allowed a shared-secret bypass of Google sign-in was
  // REMOVED 2026-08-25. It was one `wrangler secret put` away from granting issue,
  // revoke, delete and /api/stats, and /api/stats now returns every recipient's
  // name and email. Google sign-in as the issuer is the only way in. Do not
  // reintroduce it: use the dashboard.
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const principal = await verifyFirebaseToken(m[1], env);
  if (!principal) return null;
  if (!principal.emailVerified) return null;
  if (principal.email !== ISSUER_EMAIL) return null;
  return principal;
}

// Any signed-in learner, as opposed to the single issuer identity. Used only to
// let someone look up THEIR OWN credential, matched on the email inside their
// verified Firebase token, so one learner can never read another's.
//
// emailVerified is deliberately NOT required: NCI students sign up with the class
// code rather than a verification link, so demanding it would lock out most of
// the cohort. The exposure that allows is narrow, because everything returned is
// already public at the credential URL itself.
export async function requireUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const principal = await verifyFirebaseToken(m[1], env);
  if (!principal || !principal.email) return null;
  return principal;
}

function b64urlToBytes(s) {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function b64urlToString(s) {
  return new TextDecoder().decode(b64urlToBytes(s));
}
