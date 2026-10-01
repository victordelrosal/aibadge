// resolve.mjs: NO AI. Sends Victor-approved decisions to the server. A learner is written only
// when Victor names them on the command line: approval is explicit, per learner, every time.
// Usage: node resolve.mjs <batch> --approve <uid>[,<uid>...] [--as pass|repeat]
//   --as defaults to the validated recommendation; ESCALATE learners need --as to be set by Victor.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { WORKER, keychain } from "./common.mjs";

const args = process.argv.slice(2);
const batch = args[0];
const ai = args.indexOf("--approve"); const asi = args.indexOf("--as");
if (!batch || ai < 0) { console.error("usage: node resolve.mjs <batch> --approve <uid>[,<uid>] [--as pass|repeat]"); process.exit(2); }
const uids = args[ai + 1].split(",").filter(Boolean);
const forced = asi >= 0 ? args[asi + 1] : null;
const key = keychain("aibadge-grading-resolve-key");
for (const uid of uids) {
  const p = join(batch, uid, "decision.json");
  if (!existsSync(p)) { console.log(uid, "no decision.json"); continue; }
  const d = JSON.parse(readFileSync(p, "utf8"));
  let outcome = forced || (d.recommend === "RECOMMEND PASS" ? "pass" : d.recommend === "RECOMMEND REPEAT" ? "repeat" : null);
  if (!outcome) { console.log(uid, "ESCALATE: Victor must choose --as pass|repeat after reading REVIEW.md"); continue; }
  const exercises = d.exercises.map((e) => ({ exerciseId: e.exerciseId, verdict: outcome === "pass" ? "PASS" : (e.verdict === "PASS" ? "PASS" : "REPEAT"), feedback: e.feedback || "", submissionSha256: e.submissionSha256 }));
  const res = await fetch(WORKER + "/api/cert-resolve", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Grading-Key": key },
    body: JSON.stringify({ uid, outcome, humanApproval: { by: "Victor del Rosal", at: new Date().toISOString() }, exercises }),
  });
  console.log(uid, res.status, await res.text());
}
