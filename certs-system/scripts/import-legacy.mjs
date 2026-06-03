// import-legacy.mjs — incorporate the already-issued HELIOS certificates as
// verifiable records WITHOUT re-issuing them (no email, original PDF preserved).
// Signs a legacy VC, renders a legacy-marked badge + social image, and uploads
// artifacts to R2 + a KV record. Run from certs-system/.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { signCredential, importPrivateKeyJwk } from "../src/lib/crypto-core.js";
import { buildLegacyCredential, VERIFICATION_METHOD } from "../src/lib/credential.js";
import { badgeCardHtml, ogHtml } from "../src/lib/templates.js";
import { qrSvg } from "../src/lib/qr.js";
import { fmtDate } from "../src/pages.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const NS = "9b8899effb804056a435ae5af6151966"; // CERTS_KV
const BUCKET = "aibadge-certs";
const HOST = "certs.fiveinnolabs.com"; // canonical host for legacy links

const ROSTER = [
  { ucid: "a1b23", name: "Joe Bloggs", issuedDate: "2025-09-03", cohort: "sample" },
  { ucid: "d5t81", name: "Gar Mac Críosta", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "f3f45", name: "Joe Wilde", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "f5p61", name: "Michael Callan", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "h8k35", name: "Will Fahy", issuedDate: "2025-11-27", cohort: "Oct 2025" },
  { ucid: "w7r56", name: "Michael Webb", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "x3r48", name: "Patrick Baxter", issuedDate: "2025-09-03", cohort: "Aug 2025" },
];

const priv = await importPrivateKeyJwk(JSON.parse(readFileSync(join(root, "keys/issuer-private.jwk.json"), "utf8")));
const emblem = "data:image/png;base64," + readFileSync(join(root, "assets/emblem-web.png")).toString("base64");

function shellPath() {
  const base = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  const ver = readdirSync(base).filter((d) => d.startsWith("mac")).sort().pop();
  return join(base, ver, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");
}

const browser = await puppeteer.launch({
  executablePath: shellPath(),
  headless: "shell",
  userDataDir: "/tmp/certs-render-profile",
  args: ["--no-sandbox", "--disable-gpu", "--force-color-profile=srgb", "--hide-scrollbars"],
});

async function png(htmlFn, w, h, data, file) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(htmlFn(data), { waitUntil: "networkidle0" });
  try { await page.evaluate(async () => await document.fonts.ready); } catch {}
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: file, type: "png", clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
}

function run(args) {
  for (let i = 0; i < 3; i++) {
    try {
      execFileSync("npx", args, { cwd: root, stdio: "ignore" });
      return true;
    } catch (e) {
      if (i === 2) throw e;
    }
  }
}
function r2put(key, file, ct) {
  run(["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", file, "--content-type", ct, "--remote"]);
}
function kvput(code, recObj) {
  const tmp = join(root, "test-out/legacy", `${code}.record.json`);
  writeFileSync(tmp, JSON.stringify(recObj));
  run(["wrangler", "kv", "key", "put", `cred:${code}`, "--path", tmp, "--namespace-id", NS, "--remote"]);
}

mkdirSync(join(root, "test-out/legacy"), { recursive: true });

const failures = [];
for (const r of ROSTER) {
 try {
  const dir = join(root, "test-out/legacy", r.ucid);
  mkdirSync(dir, { recursive: true });
  const verifyUrl = `https://${HOST}/${r.ucid}`;
  const data = {
    name: r.name, ucid: r.ucid, cohort: r.cohort, legacy: true,
    issuedDisplay: fmtDate(r.issuedDate), verifyUrl, verifyHost: HOST, emblemDataUri: emblem,
    qr: qrSvg(verifyUrl, { size: 150, fg: "#0b1440", ecl: "M" }),
  };
  // 1. sign legacy VC
  const vc = await signCredential(buildLegacyCredential(r), priv, {
    created: new Date(r.issuedDate + "T12:00:00Z").toISOString(),
    verificationMethod: VERIFICATION_METHOD,
  });
  writeFileSync(join(dir, "credential.json"), JSON.stringify(vc));
  // 2. render badge + og
  await png(badgeCardHtml, 1080, 1080, data, join(dir, "badge.png"));
  await png(ogHtml, 1200, 630, data, join(dir, "og.png"));
  // 3. upload (original PDF already at test-out/legacy/<code>.pdf)
  r2put(`${r.ucid}/credential.pdf`, join(root, "test-out/legacy", `${r.ucid}.pdf`), "application/pdf");
  r2put(`${r.ucid}/badge.png`, join(dir, "badge.png"), "image/png");
  r2put(`${r.ucid}/og.png`, join(dir, "og.png"), "image/png");
  r2put(`${r.ucid}/credential.json`, join(dir, "credential.json"), "application/json");
  // 4. KV record
  kvput(r.ucid, {
    ucid: r.ucid, name: r.name, email: "", cohort: r.cohort, issuedDate: r.issuedDate,
    status: "issued", legacy: true, source: "HELIOS", createdAt: r.issuedDate + "T12:00:00Z", createdBy: "legacy-import",
  });
  console.log("imported", r.ucid, "-", r.name);
 } catch (e) {
  failures.push(r.ucid + ": " + (e && e.message));
  console.log("FAILED", r.ucid, "-", e && e.message);
 }
}

await browser.close();
console.log("legacy import complete.", failures.length ? "FAILURES: " + failures.join("; ") : "all ok");
