// pull-queue.mjs: NO AI. Fetch pending certificate requests and each learner's submissions as
// plain text into a fresh batch folder outside Dropbox. Never opens live links, never runs code.
// Usage: node pull-queue.mjs            -> prints the batch path
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { GRADING_HOME, PROJECT, ensureDir, kvList, kvGet, googleAccessToken, sha256 } from "./common.mjs";

const batch = ensureDir(join(GRADING_HOME, "batch-" + new Date().toISOString().replace(/[:.]/g, "-")));
const token = await googleAccessToken();
const pending = [];
for (const { name } of kvList("certreq:")) {
  const rec = JSON.parse(kvGet(name));
  if ((rec.reviewStatus || "pending") === "pending") pending.push(rec);
}
const fv = (f) => f ? (f.stringValue ?? f.timestampValue ?? f.integerValue ?? "") : "";
for (const rec of pending) {
  const dir = ensureDir(join(batch, rec.uid));
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${rec.uid}/submissions?pageSize=100`;
  const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("firestore " + r.status);
  const docs = (await r.json()).documents || [];
  const exercises = [];
  for (const d of docs) {
    const f = d.fields || {};
    const exerciseId = d.name.split("/").pop();
    const type = fv(f.type), value = fv(f.value);
    if (!/^[A-Za-z0-9_.:-]{1,80}$/.test(exerciseId)) continue;
    // A live link is never fetched here; it must be frozen first (SOP item E).
    const awaitingFreeze = type === "url";
    const text = awaitingFreeze ? "" : String(value);
    const file = join(dir, exerciseId + ".txt");
    writeFileSync(file, text, { mode: 0o600 });
    exercises.push({ exerciseId, type, awaitingFreeze, submissionSha256: sha256(text), bytes: Buffer.byteLength(text), submittedAt: fv(f.submittedAt), url: awaitingFreeze ? String(value) : undefined });
  }
  writeFileSync(join(dir, "meta.json"), JSON.stringify({ uid: rec.uid, email: rec.email, status: rec.status, priceReason: rec.priceReason, emailProven: rec.emailProven || null, exercises }, null, 2), { mode: 0o600 });
}
console.log(JSON.stringify({ batch, learners: pending.length }));
