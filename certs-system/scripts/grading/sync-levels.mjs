// sync-levels.mjs: NO AI. Makes the navbar level gem and the level XP match the issued credentials.
// For every live AI Badge credential (certs KV, not legacy HELIOS) it finds the aibadge account with that
// email and writes badge_levels on the fiveinnolabs broker (D1 ai-reckoning-topics). The broker then
// shows the gem and backfills badge_l1..lN XP on the person's next sign-in (filXp.hello in account-card.js),
// whatever way they sign in. A level is only ever raised, never lowered.
// Binding rule: the person typed the emailed code for that address (certreq.emailProven). The one exception
// is Victor's one-time vouch (3 Oct 2026, "Code = verified"): credentials issued up to VOUCH_CUTOFF bind to an
// account that existed before the credential. After the cutoff an older account proves nothing (a squatter
// could have registered the address first), so only the typed code counts.
// Usage: node sync-levels.mjs [--dry-run]   -> prints one JSON summary line
import { execFileSync } from "node:child_process";
import { googleAccessToken, PROJECT, KV_NAMESPACE } from "./common.mjs";

const DRY = process.argv.includes("--dry-run");
const VOUCH_CUTOFF = "2026-10-03T23:59:59Z";
const CERTS_KV = "9b8899effb804056a435ae5af6151966";
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "CLOUDFLARE_API_TOKEN"));
const wr = (args) => execFileSync("npx", ["wrangler", ...args], { env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 << 20 });
const kvList = (ns, prefix) => JSON.parse((s => s.slice(s.indexOf("[")))(wr(["kv", "key", "list", "--namespace-id", ns, "--remote", "--prefix", prefix])));
const kvGet = (ns, key) => { try { const t = wr(["kv", "key", "get", "--namespace-id", ns, "--remote", key]).trim().split("\n").pop(); return /fallback value|not found/i.test(t) ? null : t; } catch (e) { return null; } };
const d1 = (sql) => JSON.parse(wr(["d1", "execute", "ai-reckoning-topics", "--remote", "--json", "--command", sql]));

// 1. live credentials, highest level per email
const best = {};
for (const { name } of kvList(CERTS_KV, "cred:")) {
  const r = JSON.parse(kvGet(CERTS_KV, name) || "{}");
  if (r.status !== "issued" || r.legacy || !r.email) continue;
  const e = r.email.toLowerCase(), lv = Number(r.level || 1);
  if (!best[e] || lv > best[e].level) best[e] = { email: e, level: lv, ucid: r.ucid, credAt: r.createdAt || "" };
}
const holders = Object.values(best);

// 2. their aibadge accounts
const token = await googleAccessToken();
const accounts = {};
for (let i = 0; i < holders.length; i += 50) {
  const res = await (await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
    method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "x-goog-user-project": PROJECT },
    body: JSON.stringify({ email: holders.slice(i, i + 50).map((h) => h.email) }) })).json();
  for (const u of res.users || []) accounts[String(u.email).toLowerCase()] = { uid: u.localId, createdAt: new Date(Number(u.createdAt)).toISOString() };
}

// 3. current levels on the broker
const current = Object.fromEntries((d1("SELECT uid, level FROM badge_levels")[0].results || []).map((r) => [r.uid, r.level]));

// 4. decide
const writes = [], skipped = { noAccount: [], unboundAccount: [], alreadyAtOrAbove: 0 }, boundUids = new Set();
for (const h of holders) {
  const a = accounts[h.email];
  if (!a) { skipped.noAccount.push(h.ucid); continue; }
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(a.uid) || !/^[a-z0-9]{5}$/.test(h.ucid)) continue;
  let bound = h.credAt <= VOUCH_CUTOFF && a.createdAt <= h.credAt;
  if (!bound) {
    const req = JSON.parse(kvGet(KV_NAMESPACE, `certreq:${a.uid}`) || "{}");
    const p = req.emailProven;
    bound = !!p && p.method === "code" && String(p.email || "").toLowerCase() === h.email;
  }
  if (!bound) { skipped.unboundAccount.push(h.ucid); continue; }
  boundUids.add(a.uid);
  if ((current[a.uid] || 0) >= h.level) { skipped.alreadyAtOrAbove++; continue; }
  writes.push({ uid: a.uid, level: h.level, ucid: h.ucid });
}

// 5. write (raise only)
if (writes.length && !DRY) {
  const at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const sql = writes.map((w) =>
    `INSERT INTO badge_levels (uid, level, awarded_at, note) VALUES ('${w.uid}', ${w.level}, '${at}', 'AI Badge credential ${w.ucid} (Level ${w.level}), synced by sync-levels.mjs') ` +
    `ON CONFLICT(uid) DO UPDATE SET level = excluded.level, awarded_at = excluded.awarded_at, note = excluded.note WHERE excluded.level > badge_levels.level`).join("; ");
  d1(sql);
}
// 6. Mark the address verified on the aibadge account (Victor, 3 Oct 2026: "Code = verified"). The broker
//    that serves XP, the level gem and LinkedIn linking refuses email_verified:false tokens, and NCI students
//    sign in with unverified password accounts, so without this they never see any of it. Proof is either a
//    credential bound above (account predates it, or the code was typed) or a typed code on a certificate
//    request. Firebase's own link verification cannot be used: ncirl.ie mail scanners pre-click links.
const toVerify = new Set(boundUids);
for (const { name } of kvList(KV_NAMESPACE, "certreq:")) {
  const r = JSON.parse(kvGet(KV_NAMESPACE, name) || "{}");
  const p = r.emailProven;
  if (r.uid && p && p.method === "code" && String(p.email || "").toLowerCase() === String(r.email || "").toLowerCase()) toVerify.add(r.uid);
}
let verified = 0;
const ids = [...toVerify];
for (let i = 0; i < ids.length; i += 100) {
  const res = await (await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
    method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "x-goog-user-project": PROJECT },
    body: JSON.stringify({ localId: ids.slice(i, i + 100) }) })).json();
  for (const u of res.users || []) {
    if (u.emailVerified) continue;
    // only an address we hold proof for: the credential's or the request's email must equal the account's
    const e = String(u.email || "").toLowerCase();
    const holder = boundUids.has(u.localId) && !!best[e] && accounts[e] && accounts[e].uid === u.localId;
    let proven = false;
    if (!holder) { const r = JSON.parse(kvGet(KV_NAMESPACE, `certreq:${u.localId}`) || "{}"); proven = !!(r.emailProven && r.emailProven.method === "code" && String(r.emailProven.email || "").toLowerCase() === e); }
    if (!holder && !proven) continue;
    if (!DRY) {
      const up = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "x-goog-user-project": PROJECT },
        body: JSON.stringify({ localId: u.localId, emailVerified: true }) });
      if (!up.ok) continue;
    }
    verified++;
  }
}
console.log(JSON.stringify({ dryRun: DRY, holders: holders.length, written: writes.length, markedVerified: verified, byLevel: writes.reduce((m, w) => (m["L" + w.level] = (m["L" + w.level] || 0) + 1, m), {}), skipped: { noAccount: skipped.noAccount.length, unboundAccount: skipped.unboundAccount, alreadyAtOrAbove: skipped.alreadyAtOrAbove } }));
