// store.js — credential persistence. KV (CERTS_KV) holds the fast index + status
// (instant revocation, listing). R2 (CERTS_R2) holds the artifacts + signed VC.

const KEY = (code) => "cred:" + code;
// Secondary index: one live credential per email address. This is what makes a
// bulk run resumable — a run that dies at row 20 can restart from row 1 without
// issuing anyone twice.
const EMAIL_KEY = (email) => "email:" + String(email || "").trim().toLowerCase();

// record: { ucid, name, email, cohort, issuedDate, status, legacy, source,
//           createdAt, createdBy, verificationMethod, multikey }
export async function getRecord(env, code) {
  const raw = await env.CERTS_KV.get(KEY(code));
  return raw ? JSON.parse(raw) : null;
}

export async function putRecord(env, record) {
  await env.CERTS_KV.put(KEY(record.ucid), JSON.stringify(record));
}

// Look up an existing LIVE credential for an email. Revoked ones do not count,
// so a revoked holder can be reissued.
export async function findByEmail(env, email) {
  if (!email) return null;
  const code = await env.CERTS_KV.get(EMAIL_KEY(email));
  if (!code) return null;
  const rec = await getRecord(env, code);
  if (!rec || rec.status === "revoked") return null;
  return rec;
}

export async function indexEmail(env, email, ucid) {
  if (!email) return;
  await env.CERTS_KV.put(EMAIL_KEY(email), ucid);
}

export async function unindexEmail(env, email) {
  if (!email) return;
  await env.CERTS_KV.delete(EMAIL_KEY(email));
}

export async function listRecords(env) {
  const out = [];
  let cursor;
  do {
    const res = await env.CERTS_KV.list({ prefix: "cred:", cursor });
    for (const k of res.keys) {
      const raw = await env.CERTS_KV.get(k.name);
      if (raw) out.push(JSON.parse(raw));
    }
    cursor = res.list_complete ? undefined : res.cursor;
  } while (cursor);
  out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return out;
}

export async function exists(env, code) {
  return (await env.CERTS_KV.get(KEY(code))) !== null;
}

export async function deleteRecord(env, code) {
  await env.CERTS_KV.delete(KEY(code));
}

// R2 artifact helpers ---------------------------------------------------------
export async function putArtifact(env, key, body, contentType) {
  await env.CERTS_R2.put(key, body, { httpMetadata: { contentType } });
}
export async function getArtifact(env, key) {
  return await env.CERTS_R2.get(key);
}
export async function deleteArtifact(env, key) {
  await env.CERTS_R2.delete(key);
}

export const artifactKeys = (code) => ({
  vc: `${code}/credential.json`,
  badge: `${code}/badge.png`,
  og: `${code}/og.png`,
  pdf: `${code}/credential.pdf`,
});
