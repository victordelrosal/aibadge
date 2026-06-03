// rerender-legacy.mjs — re-render ONLY the legacy badge.png + og.png with the
// corrected HELIOS wording and re-upload. Fresh browser per item for reliability.
import { readFileSync, readdirSync, mkdirSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import { badgeCardHtml, ogHtml } from "../src/lib/templates.js";
import { qrSvg } from "../src/lib/qr.js";
import { fmtDate } from "../src/pages.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const BUCKET = "aibadge-certs";
const HOST = "certs.fiveinnolabs.com";
const LOG = join(root, "test-out/rerender.log");
const say = (m) => { console.log(m); try { appendFileSync(LOG, m + "\n"); } catch {} };

const ROSTER = [
  { ucid: "a1b23", name: "Joe Bloggs", issuedDate: "2025-09-03", cohort: "sample" },
  { ucid: "d5t81", name: "Gar Mac Críosta", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "f3f45", name: "Joe Wilde", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "f5p61", name: "Michael Callan", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "h8k35", name: "Will Fahy", issuedDate: "2025-11-27", cohort: "Oct 2025" },
  { ucid: "w7r56", name: "Michael Webb", issuedDate: "2025-09-03", cohort: "Aug 2025" },
  { ucid: "x3r48", name: "Patrick Baxter", issuedDate: "2025-09-03", cohort: "Aug 2025" },
];

const emblem = "data:image/png;base64," + readFileSync(join(root, "assets/emblem-web.png")).toString("base64");
const base = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
const ver = readdirSync(base).filter((d) => d.startsWith("mac")).sort().pop();
const exe = join(base, ver, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");

function run(args) {
  for (let i = 0; i < 4; i++) { try { execFileSync("npx", args, { cwd: root, stdio: "ignore" }); return; } catch (e) { if (i === 3) throw e; } }
}

let launchN = 0;
async function render(htmlFn, w, h, data, file) {
  const browser = await puppeteer.launch({ executablePath: exe, headless: "shell",
    userDataDir: "/tmp/certs-prof-" + Date.now() + "-" + (launchN++),
    args: ["--no-sandbox", "--disable-gpu", "--force-color-profile=srgb", "--hide-scrollbars"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(htmlFn(data), { waitUntil: "networkidle0" });
    try { await page.evaluate(async () => await document.fonts.ready); } catch {}
    await new Promise((r) => setTimeout(r, 350));
    await page.screenshot({ path: file, type: "png", clip: { x: 0, y: 0, width: w, height: h } });
  } finally { await browser.close(); }
}

for (const r of ROSTER) {
  const dir = join(root, "test-out/legacy", r.ucid);
  mkdirSync(dir, { recursive: true });
  const verifyUrl = `https://${HOST}/${r.ucid}`;
  const data = { name: r.name, ucid: r.ucid, cohort: r.cohort, legacy: true, issuedDisplay: fmtDate(r.issuedDate),
    verifyUrl, verifyHost: HOST, emblemDataUri: emblem, qr: qrSvg(verifyUrl, { size: 150, fg: "#0b1440", ecl: "M" }) };
  await render(badgeCardHtml, 1080, 1080, data, join(dir, "badge.png"));
  await render(ogHtml, 1200, 630, data, join(dir, "og.png"));
  run(["wrangler", "r2", "object", "put", `${BUCKET}/${r.ucid}/badge.png`, "--file", join(dir, "badge.png"), "--content-type", "image/png", "--remote"]);
  run(["wrangler", "r2", "object", "put", `${BUCKET}/${r.ucid}/og.png`, "--file", join(dir, "og.png"), "--content-type", "image/png", "--remote"]);
  say("re-rendered + uploaded " + r.ucid + " (" + r.name + ")");
}
say("rerender complete");
