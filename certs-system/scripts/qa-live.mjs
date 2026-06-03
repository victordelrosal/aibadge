// qa-live.mjs — end-to-end quality gates against the LIVE certs.fiveinnolabs.com.
// Issues a throwaway credential via the test hook, exercises every path, then
// revokes + deletes it. Never touches a real recipient.
import { execFileSync } from "node:child_process";
import { verifyCredential, multikeyToPublicKey, UCID_RE } from "../src/lib/crypto-core.js";

const BASE = process.env.CERTS_BASE || "https://certs.fiveinnolabs.com";
const TEST_SECRET = "qa-1780444800000x9k2-alpha";
const NS = "9b8899effb804056a435ae5af6151966";

let pass = 0, fail = 0;
const log = (ok, name, extra = "") => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`); };
const get = (p) => fetch(BASE + p);
const getJson = (p) => get(p).then((r) => r.json());

console.log("QA against", BASE, "\n");

// 1. issuer infra
const issuer = await getJson("/issuer");
log(issuer.id === "https://certs.fiveinnolabs.com/issuer" && issuer.type?.includes("Profile"), "issuer profile (OB3.0 Profile)");
const wk = await getJson("/.well-known/issuer-public.json");
const pub = multikeyToPublicKey(wk.publicKeyMultibase);
log(wk.type === "Multikey" && wk.publicKeyMultibase?.startsWith("z6Mk"), "issuer public key (Multikey)");
const ach = await getJson("/achievements/ai-badge");
log(ach.type?.includes("Achievement"), "achievement definition");
log((await get("/lib/crypto-core.js")).status === 200, "client verifier served");
log((await get("/assets/emblem.png")).status === 200, "emblem asset served");

// 2. legacy credentials
const legacy = ["a1b23", "d5t81", "f3f45", "f5p61", "h8k35", "w7r56", "x3r48"];
for (const c of legacy) {
  const r = await getJson("/api/verify/" + c);
  const okFound = r.found && r.legacy && r.source === "HELIOS";
  const v = okFound ? await verifyCredential(r.credential, pub) : { valid: false };
  const pdf = await get("/" + c + ".pdf");
  const page = await get("/" + c);
  log(okFound && v.valid && pdf.status === 200 && page.status === 200, "legacy " + c + " (" + (r.name || "?") + ")",
    `found=${r.found} sig=${v.valid} pdf=${pdf.status} page=${page.status}`);
}

// 3. tamper detection on a legacy cred
{
  const r = await getJson("/api/verify/w7r56");
  const t = JSON.parse(JSON.stringify(r.credential)); t.credentialSubject.name = "Imposter";
  log((await verifyCredential(t, pub)).valid === false, "tamper detection (altered name rejected)");
  const t2 = JSON.parse(JSON.stringify(r.credential)); t2.validFrom = "2099-01-01T12:00:00Z";
  log((await verifyCredential(t2, pub)).valid === false, "tamper detection (altered date rejected)");
}

// 4. admin gating
for (const [p, opt] of [["/api/list", {}], ["/api/issue", { method: "POST" }], ["/api/revoke", { method: "POST" }], ["/api/preview", { method: "POST" }]]) {
  log((await fetch(BASE + p, opt)).status === 401, "unauth blocked " + p);
}
log((await fetch(BASE + "/api/list", { headers: { Authorization: "Bearer junk.token.x" } })).status === 401, "bad token blocked");

// 5. live issuance via test hook -> full lifecycle
const issueRes = await fetch(BASE + "/api/issue", {
  method: "POST",
  headers: { "X-Test-Issue": TEST_SECRET, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "QA Lifecycle Test", email: "qa@example.com", cohort: "QA", issuedDate: "2026-06-03", sendEmail: false }),
});
const issued = await issueRes.json();
const code = issued.ucid;
log(issueRes.status === 200 && UCID_RE.test(code || ""), "live issuance", "ucid=" + code);

if (code) {
  const r = await getJson("/api/verify/" + code);
  log(r.found && !r.legacy, "issued verify record");
  log((await verifyCredential(r.credential, pub)).valid, "issued signature valid");
  log(r.credential.type?.includes("OpenBadgeCredential") && r.credential.credentialSubject?.achievement?.name === "The AI Badge", "OB3.0 structure");
  for (const f of ["badge.png", "og.png", "credential.pdf", "credential.json"]) {
    log((await get(`/${code}/${f}`)).status === 200, "artifact " + f);
  }
  const page = await get("/" + code);
  const pageHtml = await page.text();
  log(pageHtml.includes(`og:image" content="${BASE}/${code}/og.png"`), "per-code OG meta");
  log(pageHtml.includes("QA Lifecycle Test"), "page shows recipient");

  // 6. revoke -> verify shows revoked
  const rev = await fetch(BASE + "/api/revoke", {
    method: "POST", headers: { "X-Test-Issue": TEST_SECRET, "Content-Type": "application/json" }, body: JSON.stringify({ ucid: code }),
  });
  log(rev.status === 200, "revoke accepted");
  const r2 = await getJson("/api/verify/" + code);
  log(r2.status === "revoked", "revoked status reflected");

  // 7. cleanup throwaway (KV + R2)
  try {
    execFileSync("npx", ["wrangler", "kv", "key", "delete", "cred:" + code, "--namespace-id", NS, "--remote"], { stdio: "ignore" });
    for (const f of ["badge.png", "og.png", "credential.pdf", "credential.json"])
      execFileSync("npx", ["wrangler", "r2", "object", "delete", `aibadge-certs/${code}/${f}`, "--remote"], { stdio: "ignore" });
    console.log("  (cleaned up throwaway " + code + ")");
  } catch (e) { console.log("  (cleanup warning: " + e.message + ")"); }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
