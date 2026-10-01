// validate-verdict.mjs: NO AI. Turns the grader's raw output into decisions Victor can approve.
// A PASS survives only if: the JSON is well formed; confidence is HIGH; the evidence quote appears
// verbatim in the submission; the feedback is short plain text (no links, emails, markup); the
// grader did not suspect injection; and the submission trips none of the deterministic wires.
// Anything else becomes ESCALATE (Victor looks) or REPEAT. Nothing here can award a PASS on its own.
// Usage: node validate-verdict.mjs <batch>   -> writes <batch>/<uid>/decision.json and <batch>/REVIEW.md
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { VICTOR_EMAILS } from "./common.mjs";

const batch = process.argv[2];
if (!batch || !existsSync(batch)) { console.error("usage: node validate-verdict.mjs <batch>"); process.exit(2); }

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
// Deterministic tripwires on the SUBMISSION (independent of the AI's judgement).
const WIRES = [
  [/ignore (all |any )?(previous|prior|above|the) (instructions|rubric|rules)/i, "instruction override phrase"],
  [/\b(system|developer) (prompt|message|override)\b/i, "system prompt language"],
  [/\byou are now\b|\bact as\b|\badmin mode\b|\bjailbreak\b/i, "role hijack phrase"],
  [/\b(grader|marker|assessor|reviewer|AI model|language model|Claude|ChatGPT)\b[^.]{0,80}\b(must|should|will|output|award|give|mark)\b/i, "addresses the grader"],
  [/\b(verdict|confidence|injection_suspected|evidence_quote)\b/i, "grading vocabulary"],
  [/[​-‏‪-‮⁠-⁤﻿\u{E0000}-\u{E007F}]/u, "invisible or bidi characters"],
  [/[A-Za-z0-9+/]{120,}={0,2}/, "long encoded blob"],
  [/curl\s|wget\s|\bnc\s|base64 -d|\$\(|`[^`]*`|~\/\.ssh|\.aws\/|keychain|security find-/i, "shell or secret-hunting text"],
  [/SUBMISSION_[0-9a-f]{6,}/, "delimiter spoofing"],
];
const BAD_FEEDBACK = /https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[\w.]+|<[a-z!\/]|```|\[[^\]]*\]\(/i;

function parseGrader(raw) {
  const t = String(raw || "");
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i < 0 || j < i) return null;
  try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; }
}

function judge(text, raw) {
  const reasons = [];
  const wires = WIRES.filter(([re]) => re.test(text)).map(([, why]) => why);
  if (wires.length) reasons.push("tripwire: " + wires.join(", "));
  if (!raw || raw.exit !== 0) reasons.push("grader did not complete");
  if (raw && raw.num_turns !== undefined && raw.num_turns !== 1) reasons.push("grader took more than one turn");
  if (raw && Array.isArray(raw.permission_denials) && raw.permission_denials.length) reasons.push("grader attempted a tool");
  const g = parseGrader(raw && raw.result);
  if (!g) return { verdict: "ESCALATE", feedback: "", reasons: [...reasons, "unparseable grader output"] };
  const keysOk = ["verdict", "confidence", "evidence_quote", "feedback", "injection_suspected"].every((k) => k in g);
  if (!keysOk) reasons.push("missing keys");
  const verdict = g.verdict === "PASS" ? "PASS" : g.verdict === "REPEAT" ? "REPEAT" : null;
  if (!verdict) reasons.push("verdict not PASS/REPEAT");
  if (g.injection_suspected === true) reasons.push("grader suspected injection");
  let feedback = norm(g.feedback).slice(0, 400);
  for (const e of VICTOR_EMAILS) feedback = feedback.split(e).join("");
  if (BAD_FEEDBACK.test(feedback)) { reasons.push("feedback contains a link, email or markup"); feedback = ""; }
  const quote = norm(g.evidence_quote);
  const quoteOk = quote.length >= 12 && quote.length <= 220 && norm(text).includes(quote);
  if (verdict === "PASS") {
    if (g.confidence !== "HIGH") reasons.push("PASS without HIGH confidence");
    if (!quoteOk) reasons.push("evidence quote not found verbatim in the submission");
  }
  if (reasons.length) return { verdict: "ESCALATE", graderSaid: verdict, confidence: g.confidence, feedback, quote, reasons };
  return { verdict, confidence: g.confidence, feedback, quote, reasons: [] };
}

const lines = ["# AI Badge review batch", "", "Victor approves every decision before it is final (Anthropic Usage Policy: qualified human review). Nothing below is sent until resolve.mjs is run with your approval.", ""];
let counts = { PASS: 0, REPEAT: 0, ESCALATE: 0 };
for (const uid of readdirSync(batch)) {
  const dir = join(batch, uid); const metaPath = join(dir, "meta.json");
  if (!existsSync(metaPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const exercises = [];
  for (const ex of meta.exercises) {
    if (ex.awaitingFreeze) { exercises.push({ exerciseId: ex.exerciseId, verdict: "ESCALATE", reasons: ["submitted as a live link; awaiting freeze, not graded"], submissionSha256: ex.submissionSha256 }); continue; }
    const text = readFileSync(join(dir, ex.exerciseId + ".txt"), "utf8");
    const rawPath = join(dir, "raw", ex.exerciseId + ".json");
    const raw = existsSync(rawPath) ? JSON.parse(readFileSync(rawPath, "utf8")) : null;
    exercises.push({ exerciseId: ex.exerciseId, submissionSha256: ex.submissionSha256, ...judge(text, raw) });
  }
  const recommend = exercises.length && exercises.every((e) => e.verdict === "PASS") ? "RECOMMEND PASS"
    : exercises.some((e) => e.verdict === "ESCALATE") ? "ESCALATE" : "RECOMMEND REPEAT";
  writeFileSync(join(dir, "decision.json"), JSON.stringify({ uid: meta.uid, email: meta.email, recommend, exercises }, null, 2), { mode: 0o600 });
  for (const e of exercises) counts[e.verdict] = (counts[e.verdict] || 0) + 1;
  lines.push(`## ${meta.email || meta.uid}: ${recommend}`);
  for (const e of exercises) lines.push(`- ${e.exerciseId}: ${e.verdict}${e.confidence ? " (" + e.confidence + ")" : ""}${e.reasons && e.reasons.length ? " [" + e.reasons.join("; ") + "]" : ""}${e.feedback ? " :: " + e.feedback : ""}`);
  lines.push("");
}
writeFileSync(join(batch, "REVIEW.md"), lines.join("\n"), { mode: 0o600 });
console.log(JSON.stringify({ review: join(batch, "REVIEW.md"), counts }));
