// autorun.mjs: the autonomous Level 1 loop (Victor, 3 Oct 2026: "fully autonomous", terminal only).
// pull -> freeze -> grade (2 no-tool runs) -> validate -> policy -> issue + email -> close request -> digest.
// This process never reads learner text itself; only grade.mjs's tool-less model does. It runs from
// launchd while the Mac is awake. Policy (CERT-RUBRIC.md):
//   superseded  the learner already holds a credential: close the request; email it if never emailed.
//   pass        all nine Level 1 lessons complete, a build artifact passes, every submission passes.
//   pending     anything else stays in the queue and is reported to Victor once per change.
// Usage: node autorun.mjs [--dry-run]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, appendFileSync, rmSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GRADING_HOME, PROJECT, WORKER, ensureDir, keychain, googleAccessToken, sha256 } from "./common.mjs";

const DRY = process.argv.includes("--dry-run");
const HERE = new URL(".", import.meta.url).pathname;
const CERTS = "https://certs.fiveinnolabs.com";
const CERTS_KV = "9b8899effb804056a435ae5af6151966";
const L1_LESSONS = ["what-is-html", "hello-world-2", "ai-foundations", "retro-game", "deploy-github", "ai-interviews-you", "five-innovators", "thinking-partner", "eu-ai-act"];
const BUILDS = ["ai-interviews-you", "five-innovators"];
const POLICY = "Lars, automated policy v1";

ensureDir(GRADING_HOME);
const LOCK = join(GRADING_HOME, "autorun.lock");
if (existsSync(LOCK) && Date.now() - statSync(LOCK).mtimeMs < 2 * 3600e3) { console.log("another run holds the lock"); process.exit(0); }
writeFileSync(LOCK, String(process.pid));
const STATE_PATH = join(GRADING_HOME, "state.json");
const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf8")) : { reported: {} };
const log = (m) => { const line = new Date().toISOString() + " " + m; console.log(line); appendFileSync(join(GRADING_HOME, "runs.log"), line + "\n"); };

const step = (script, ...args) => execFileSync(process.execPath, [join(HERE, script), ...args], { encoding: "utf8", env: process.env, maxBuffer: 16 << 20 }).trim().split("\n").pop();
const wranglerEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "CLOUDFLARE_API_TOKEN"));
function certsKvGet(key) {
  try {
    const out = execFileSync("npx", ["wrangler", "kv", "key", "get", "--namespace-id", CERTS_KV, "--remote", key], { env: wranglerEnv, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const t = out.trim().split("\n").pop();
    return /fallback value|not found/i.test(t) || !t ? null : t;
  } catch (e) { return null; }
}
async function post(url, headers, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
}

const actions = [], waiting = [];
try {
  const { batch, learners } = JSON.parse(step("pull-queue.mjs"));
  log(`pulled ${learners} pending into ${batch}`);
  if (!learners) throw Object.assign(new Error("queue empty"), { quiet: true });
  const token = await googleAccessToken();
  const fs = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const autoKey = keychain("aibadge-certs-auto-issue-key");
  const resolveKey = keychain("aibadge-grading-resolve-key");
  const resolve = (uid, outcome, exercises, note) => DRY ? { status: 0 } : post(WORKER + "/api/cert-resolve", { "X-Grading-Key": resolveKey },
    { uid, outcome, note, humanApproval: { by: POLICY, at: new Date().toISOString() }, exercises });
  const uids = () => readdirSync(batch).filter((u) => existsSync(join(batch, u, "meta.json")));

  // 1. Already credentialed: close, deliver the existing credential if it never went out, and
  //    drop the learner from the batch before anything is frozen or graded.
  for (const uid of uids()) {
    const email = String(JSON.parse(readFileSync(join(batch, uid, "meta.json"), "utf8")).email || "").toLowerCase();
    const held = certsKvGet("email:" + email);
    if (!held) continue;
    const rec = JSON.parse(certsKvGet("cred:" + held) || "{}");
    let sent = "";
    if (!rec.emailedAt && rec.status === "issued" && !rec.legacy) {
      const s = DRY ? { status: 0 } : await post(CERTS + "/api/auto-send", { "X-Auto-Issue-Key": autoKey }, { ucid: held });
      sent = s.status === 200 ? ", existing credential emailed" : s.status === 409 ? ", already delivered per email evidence" : ` (send ${s.status})`;
    }
    const r = await resolve(uid, "superseded", [], `holds ${held} (Level ${rec.level || 1})`);
    actions.push(`${email}: already holds ${held} (Level ${rec.level || 1}), request closed${sent} [resolve ${r.status}]`);
    rmSync(join(batch, uid), { recursive: true, force: true });
  }

  if (uids().length) {
    log("froze " + step("freeze.mjs", batch));
    log("graded " + step("grade.mjs", batch));
    step("validate-verdict.mjs", batch);
  }

  for (const uid of uids()) {
    const dPath = join(batch, uid, "decision.json");
    if (!existsSync(dPath)) continue;
    const d = JSON.parse(readFileSync(dPath, "utf8"));
    const email = String(d.email || "").toLowerCase();

    // 2. Completion of all nine Level 1 lessons.
    const comp = await (await fetch(`${fs}/users/${uid}/tutorial_completions?pageSize=100`, { headers: { Authorization: "Bearer " + token } })).json();
    const done = new Set((comp.documents || []).map((x) => x.name.split("/").pop()));
    const missing = L1_LESSONS.filter((t) => !done.has(t));

    // 3. Grading outcome.
    const ex = d.exercises || [];
    const builds = ex.filter((e) => BUILDS.includes(e.exerciseId) && e.verdict === "PASS");
    const notPassed = ex.filter((e) => e.verdict !== "PASS");
    const why = [];
    if (missing.length) why.push("lessons not complete: " + missing.join(", "));
    if (!builds.length) why.push("no passing build artifact (ai-interviews-you or five-innovators)");
    for (const e of notPassed) why.push(`${e.exerciseId} ${e.verdict}${e.reasons && e.reasons.length ? ": " + e.reasons.join("; ") : ""}${e.feedback ? " :: " + e.feedback : ""}`);

    // 4. Name on the credential = the learner's own profile name.
    const user = await (await fetch(`${fs}/users/${uid}`, { headers: { Authorization: "Bearer " + token } })).json();
    const name = String((user.fields && user.fields.displayName && user.fields.displayName.stringValue) || "").normalize("NFC").trim();
    if (name.length < 2 || name.length > 80 || name.includes("@")) why.push("no usable profile name");

    if (why.length) {
      const sig = sha256(JSON.stringify(why));
      if (state.reported[uid] !== sig) { waiting.push(`${email}: ${why.join(" | ")}`); if (!DRY) state.reported[uid] = sig; }
      continue;
    }

    // 5. Issue + email, then close the request. If the close fails, the next run sees the
    //    credential and closes it as superseded, so no learner is ever issued twice.
    if (DRY) { actions.push(`${email}: WOULD ISSUE Level 1 to "${name}" (${ex.map((e) => e.exerciseId).join(", ")})`); continue; }
    const iss = await post(CERTS + "/api/auto-issue", { "X-Auto-Issue-Key": autoKey }, { name, email });
    if (iss.status !== 200 || !iss.body || !iss.body.ok) {
      waiting.push(`${email}: issue refused (${iss.status} ${JSON.stringify(iss.body)})`);
      if (iss.status === 403 || iss.status === 429) break;             // switch off or daily cap: stop for this run
      continue;
    }
    const r = await resolve(uid, "pass", ex.map((e) => ({ exerciseId: e.exerciseId, verdict: "PASS", feedback: e.feedback || "", submissionSha256: e.submissionSha256 })), "issued " + iss.body.ucid);
    actions.push(`${email}: ISSUED Level 1 to "${name}" ${iss.body.url} emailed=${iss.body.emailed} [resolve ${r.status}]`);
  }
} catch (e) {
  if (!e.quiet) waiting.push("RUN FAILED: " + String(e.message).split("\n")[0].slice(0, 300));
} finally {
  rmSync(LOCK, { force: true });
  if (!DRY) writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), { mode: 0o600 });
}

for (const a of actions) log("ACTION " + a);
for (const w of waiting) log("WAITING " + w);
if (!DRY && (actions.length || waiting.length)) {
  const body = ["AI Badge Level 1: autonomous run " + new Date().toISOString(), "",
    "Done:", ...(actions.length ? actions.map((a) => "- " + a) : ["- nothing"]), "",
    "Not issued (new or changed since last report):", ...(waiting.length ? waiting.map((w) => "- " + w) : ["- nothing"]), "",
    "Revoke any credential at " + CERTS + "/issue. Switch the loop off: wrangler kv key put config:autoissue off --namespace-id " + CERTS_KV + " --remote",
  ].join("\n");
  const r = await post("https://team-inbox.victordelrosal.workers.dev/send", { Authorization: "Bearer " + keychain("aibadge-digest-send-key") },
    { from: "v@vdr.me", to: "victordelrosal@gmail.com", subject: `AI Badge L1: ${actions.length} done, ${waiting.length} waiting`, body });
  log("digest " + r.status);
}
