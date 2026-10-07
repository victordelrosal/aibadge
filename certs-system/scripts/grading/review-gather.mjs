// review-gather.mjs: NO AI. Collects everything the manual review page shows for one batch:
// meta + decision, verdict history (SLOTS verdictlog), earlier grading runs, profile name, lessons.
// Usage: node review-gather.mjs <batch>   -> writes <batch>/review-data.json (stays outside Dropbox)
import { kvList, kvGet, googleAccessToken, PROJECT, GRADING_HOME } from "./common.mjs";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const batch = process.argv[2].replace(/\/$/, ""), outPath = join(batch, "review-data.json");
const uids = readdirSync(batch).filter(n => existsSync(join(batch, n, "meta.json")));
const token = await googleAccessToken();
const fs = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const batches = readdirSync(GRADING_HOME).filter(n => n.startsWith("batch-")).sort();
const out = [];
for (const uid of uids) {
  const meta = JSON.parse(readFileSync(join(batch, uid, "meta.json"), "utf8"));
  const decision = JSON.parse(readFileSync(join(batch, uid, "decision.json"), "utf8"));
  const certreq = JSON.parse(kvGet("certreq:" + uid));
  const log = kvList(`verdictlog:${uid}:`).map(k => JSON.parse(kvGet(k.name)));
  const user = await (await fetch(`${fs}/users/${uid}`, { headers: { Authorization: "Bearer " + token } })).json();
  const comp = await (await fetch(`${fs}/users/${uid}/tutorial_completions?pageSize=100`, { headers: { Authorization: "Bearer " + token } })).json();
  const done = (comp.documents || []).map(x => x.name.split("/").pop());
  const f = user.fields || {};
  // prior grading attempts in earlier batches (whether or not posted)
  const prior = [];
  for (const b of batches) {
    const p = join(GRADING_HOME, b, uid, "decision.json");
    if (!existsSync(p) || join(GRADING_HOME, b) === batch.replace(/\/$/, "")) continue;
    try { const d = JSON.parse(readFileSync(p, "utf8")); const m = JSON.parse(readFileSync(join(GRADING_HOME, b, uid, "meta.json"), "utf8"));
      prior.push({ batch: b, recommend: d.recommend, exercises: (d.exercises || []).map(e => ({ exerciseId: e.exerciseId, verdict: e.verdict, confidence: e.confidence, feedback: e.feedback, reasons: e.reasons, sha: e.submissionSha256, url: (m.exercises.find(x => x.exerciseId === e.exerciseId) || {}).url })) }); } catch {}
  }
  const texts = {};
  for (const e of meta.exercises) { const t = join(batch, uid, e.exerciseId + ".txt"); texts[e.exerciseId] = existsSync(t) ? readFileSync(t, "utf8") : ""; }
  out.push({ uid, meta, decision, certreq, log, prior, done, name: f.displayName?.stringValue || "", programme: f.programme?.stringValue || f.course?.stringValue || "", created: user.createTime, texts });
}
writeFileSync(outPath, JSON.stringify(out));
console.log(out.map(o => `${o.meta.email} name=${o.name} done=${o.done.length} log=${o.log.length} prior=${o.prior.length}`).join("\n"));
