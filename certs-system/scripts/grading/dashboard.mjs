// dashboard.mjs: NO AI. Builds the credential approval dashboard: every credential, request, verdict,
// manual review and engagement event, joined per person, embedded into dashboard.template.html.
// Usage: node dashboard.mjs [out.html]   (default aibadge/reports/cert-dashboard.html, gitignored:
// it names learners, so it never goes to the public repo).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { GRADING_HOME, KV_NAMESPACE, PROJECT, googleAccessToken } from "./common.mjs";

const HERE = dirname(new URL(import.meta.url).pathname);
const OUT = process.argv[2] || join(HERE, "../../../reports/cert-dashboard.html");
const CERTS_KV = "9b8899effb804056a435ae5af6151966";
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "CLOUDFLARE_API_TOKEN"));
const wr = (args) => { const t = execFileSync("npx", ["wrangler", ...args], { env, cwd: join(HERE, "../.."), maxBuffer: 64 << 20 }).toString(); return t; };
// wrangler wraps JSON in banners ("Success!", warnings): cut from the first bracket to its last partner.
const jsonOf = (t) => { const a = t.search(/[[{]/); return JSON.parse(t.slice(a, t.lastIndexOf(t[a] === "[" ? "]" : "}") + 1)); };

function kvAll(ns, prefixes) {
  const keys = jsonOf(wr(["kv", "key", "list", "--remote", "--namespace-id", ns])).map((k) => k.name).filter((k) => prefixes.some((p) => k.startsWith(p)));
  const tmp = mkdtempSync(join(tmpdir(), "certdash-"));
  const out = {};
  try {
    for (let i = 0; i < keys.length; i += 100) {
      const f = join(tmp, "keys.json");
      writeFileSync(f, JSON.stringify(keys.slice(i, i + 100)));
      const got = jsonOf(wr(["kv", "bulk", "get", f, "--remote", "--namespace-id", ns]));
      for (const [k, v] of Object.entries(got)) { try { out[k] = typeof v === "string" ? JSON.parse(v) : v; } catch { out[k] = v; } }
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  return out;
}

const certs = kvAll(CERTS_KV, ["cred:", "config:"]);
const slots = kvAll(KV_NAMESPACE, ["certreq:", "verdictlog:"]);
const ev = jsonOf(wr(["d1", "execute", "aibadge-certs-stats", "--remote", "--json", "--command",
  "select ucid, event, count(*) n, min(ts) first, max(ts) last from events group by ucid, event"]))[0].results;

// Manual reviews (review.json = Claudus's read, APPLIED.json = what Victor approved and what happened).
const manual = [];
const runs = {};
for (const b of readdirSync(GRADING_HOME).filter((n) => n.startsWith("batch-")).sort()) {
  const dir = join(GRADING_HOME, b);
  for (const uid of readdirSync(dir)) {
    const p = join(dir, uid, "decision.json");
    if (!existsSync(p)) continue;
    try {
      const d = JSON.parse(readFileSync(p, "utf8"));
      (runs[uid] ||= []).push({ batch: b.slice(6), recommend: d.recommend, items: (d.exercises || []).map((e) => ({ id: e.exerciseId, v: e.verdict, c: e.confidence || "", why: (e.reasons || []).join("; ") })) });
    } catch {}
  }
  const ap = join(dir, "APPLIED.json"), rv = join(dir, "review.json"), rd = join(dir, "review-data.json");
  if (existsSync(ap)) {
    const applied = JSON.parse(readFileSync(ap, "utf8"));
    const review = existsSync(rv) ? JSON.parse(readFileSync(rv, "utf8")) : {};
    const names = existsSync(rd) ? Object.fromEntries(JSON.parse(readFileSync(rd, "utf8")).map((o) => [o.uid, o.name])) : {};
    let decisions = {};
    try { decisions = Object.fromEntries(JSON.parse(readFileSync(join(dir, "decisions.json"), "utf8")).learners.map((l) => [l.uid, l])); } catch {}
    for (const a of applied) {
      const r = review[names[a.uid]] || review[a.name] || {};
      manual.push({ batch: b.slice(6), uid: a.uid, email: a.email, name: names[a.uid] || a.name || "", decision: a.decision, ucid: a.ucid || null, emailed: a.emailed ?? null,
        score: r.score ?? null, rec: r.rec || null, headline: r.headline || "", why: r.why || "", notes: (decisions[a.uid] || {}).notes || [] });
    }
  }
}

// Profile names for people who asked but hold no credential yet (Firestore users/{uid}.displayName).
const names = {};
{ const token = await googleAccessToken();
  for (const r of Object.entries(slots).filter(([k]) => k.startsWith("certreq:")).map(([, v]) => v)) {
    const u = await (await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${r.uid}`, { headers: { Authorization: "Bearer " + token } })).json();
    const n = u.fields?.displayName?.stringValue; if (n) names[r.uid] = n;
  } }

const data = {
  generatedAt: new Date().toISOString(),
  config: { autoissue: certs["config:autoissue"] ?? null, autofeedback: certs["config:autofeedback"] ?? null },
  creds: Object.entries(certs).filter(([k]) => k.startsWith("cred:")).map(([, v]) => v),
  requests: Object.entries(slots).filter(([k]) => k.startsWith("certreq:")).map(([, v]) => v),
  verdicts: Object.entries(slots).filter(([k]) => k.startsWith("verdictlog:")).map(([, v]) => v),
  events: ev, manual, runs, names,
};
const html = readFileSync(join(HERE, "dashboard.template.html"), "utf8")
  .replace("/*__DATA__*/null", JSON.stringify(data).replace(/</g, "\\u003c"));
writeFileSync(OUT, html);
console.log(JSON.stringify({ out: OUT, creds: data.creds.length, requests: data.requests.length, verdicts: data.verdicts.length, manual: manual.length, eventRows: ev.length }));
