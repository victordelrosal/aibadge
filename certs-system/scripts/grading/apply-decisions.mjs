// apply-decisions.mjs: NO AI. Applies Victor's per-learner decisions from a manual review
// (see docs/CERT-MANUAL-REVIEW.md). Only learners named in the decisions file are touched.
// Usage: node apply-decisions.mjs <batch> <decisions.json> [--dry-run]
//
// decisions.json: { "approvedBy": "Victor del Rosal", "learners": [ {
//   "uid": "...", "decision": "approve" | "resubmit" | "hold",
//   "items": { "<exerciseId>": { "verdict": "PASS"|"REPEAT", "feedback": "..." } | "drop" },
//   "notes": ["learner-facing to-do", ...] } ] }
//
// approve  -> issue Level 1 on certs (emails the learner), then cert-resolve "pass".
//             Every kept item must be PASS; "drop" leaves an item out of the record.
// resubmit -> cert-resolve "repeat" with per-item verdicts + notes (shown on the site, no email).
// hold     -> same as resubmit; use it for admin blockers (email code, profile name).
// config:autoissue is switched on only for the issue calls and restored in finally.
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { WORKER, PROJECT, keychain, googleAccessToken } from "./common.mjs";

const CERTS = "https://certs.fiveinnolabs.com";
const CERTS_KV = "9b8899effb804056a435ae5af6151966";
const [batch, decPath] = process.argv.slice(2);
const DRY = process.argv.includes("--dry-run");
if (!batch || !decPath) { console.error("usage: node apply-decisions.mjs <batch> <decisions.json> [--dry-run]"); process.exit(2); }
const dec = JSON.parse(readFileSync(decPath, "utf8"));
if (!dec.approvedBy) throw new Error("decisions.json needs approvedBy");

const wenv = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "CLOUDFLARE_API_TOKEN"));
const kv = (...a) => execFileSync("npx", ["wrangler", "kv", "key", ...a, "--namespace-id", CERTS_KV, "--remote"], { env: wenv }).toString();
const kvGet = (k) => { try { const t = kv("get", k).trim(); return /not found/i.test(t) ? null : t; } catch { return null; } };
async function post(url, headers, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
}

const token = await googleAccessToken();
const fs = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const autoKey = keychain("aibadge-certs-auto-issue-key");
const resolveKey = keychain("aibadge-grading-resolve-key");
const resolve = (uid, outcome, exercises, notes, note) => DRY ? { status: 0 } : post(WORKER + "/api/cert-resolve", { "X-Grading-Key": resolveKey },
  { uid, outcome, exercises, notes, note, humanApproval: { by: dec.approvedBy, at: new Date().toISOString() } });

const results = [];
const needIssue = dec.learners.some((l) => l.decision === "approve");
const prevAuto = needIssue ? kvGet("config:autoissue") : null;
try {
  if (needIssue && !DRY) kv("put", "config:autoissue", "on");
  for (const l of dec.learners) {
    const dir = join(batch, l.uid);
    if (!existsSync(join(dir, "decision.json"))) { results.push({ uid: l.uid, error: "not in batch" }); continue; }
    const d = JSON.parse(readFileSync(join(dir, "decision.json"), "utf8"));
    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
    const email = String(meta.email || "").toLowerCase();
    const items = l.items || {};
    const exercises = [];
    for (const e of d.exercises || []) {
      const o = items[e.exerciseId];
      if (o === "drop") continue;
      const verdict = (o && o.verdict) || (e.verdict === "PASS" ? "PASS" : "REPEAT");
      exercises.push({ exerciseId: e.exerciseId, verdict, feedback: (o && o.feedback) ?? e.feedback ?? "", submissionSha256: e.submissionSha256 });
    }
    const notes = l.notes || [];
    const r = { uid: l.uid, email, decision: l.decision };

    if (l.decision === "approve") {
      if (exercises.some((x) => x.verdict !== "PASS")) { r.error = "approve needs every kept item PASS (override or drop)"; results.push(r); continue; }
      if (!(meta.emailProven && meta.emailProven.method === "code" && String(meta.emailProven.email).toLowerCase() === email)) { r.error = "email not proven"; results.push(r); continue; }
      const user = await (await fetch(`${fs}/users/${l.uid}`, { headers: { Authorization: "Bearer " + token } })).json();
      const name = String(user.fields?.displayName?.stringValue || "").normalize("NFC").trim();
      if (name.length < 2 || name.includes("@")) { r.error = "no usable profile name"; results.push(r); continue; }
      r.name = name;
      if (DRY) { r.wouldIssue = true; results.push(r); continue; }
      const iss = await post(CERTS + "/api/auto-issue", { "X-Auto-Issue-Key": autoKey }, { name, email });
      if (iss.status !== 200 || !iss.body?.ok) { r.error = `issue refused ${iss.status} ${JSON.stringify(iss.body)}`; results.push(r); continue; }
      r.ucid = iss.body.ucid; r.url = iss.body.url; r.emailed = iss.body.emailed;
      r.resolve = (await resolve(l.uid, "pass", exercises, notes, "issued " + iss.body.ucid)).status;
    } else if (l.decision === "resubmit" || l.decision === "hold") {
      r.resolve = (await resolve(l.uid, "repeat", exercises, notes, l.decision === "hold" ? "held: admin step" : "feedback to learner")).status;
    } else r.error = "unknown decision";
    results.push(r);
  }
} finally {
  if (needIssue && !DRY) kv("put", "config:autoissue", prevAuto === "on" ? "on" : "off");
}
writeFileSync(join(batch, "APPLIED" + (DRY ? "-dry" : "") + ".json"), JSON.stringify(results, null, 2), { mode: 0o600 });
console.log(JSON.stringify(results, null, 2));
