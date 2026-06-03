// store.js — credential persistence. KV (CERTS_KV) holds the fast index + status
// (instant revocation, listing). R2 (CERTS_R2) holds the artifacts + signed VC.

const KEY = (code) => "cred:" + code;

// record: { ucid, name, email, cohort, issuedDate, status, legacy, source,
//           createdAt, createdBy, verificationMethod, multikey }
export async function getRecord(env, code) {
  const raw = await env.CERTS_KV.get(KEY(code));
  return raw ? JSON.parse(raw) : null;
}

export async function putRecord(env, record) {
  await env.CERTS_KV.put(KEY(record.ucid), JSON.stringify(record));
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
