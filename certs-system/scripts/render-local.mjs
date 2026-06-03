// render-local.mjs — render the artifact templates with the locally installed
// Chrome (via puppeteer-core) so we can iterate on the visuals and SEE them.
// Mirrors what Cloudflare Browser Rendering will do in the Worker.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import puppeteer from "puppeteer-core";
import { badgeCardHtml, ogHtml, pdfHtml } from "../src/lib/templates.js";
import { qrSvg } from "../src/lib/qr.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "test-out");

// Resolve the installed chrome-headless-shell (purpose-built, no conflict with
// the user's running Chrome).
function findHeadlessShell() {
  const base = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  const ver = readdirSync(base).filter((d) => d.startsWith("mac")).sort().pop();
  return join(base, ver, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");
}
const CHROME = findHeadlessShell();

const emblem = readFileSync(join(root, "assets", "emblem.png"));
const emblemDataUri = "data:image/png;base64," + emblem.toString("base64");
const logoWhite = "data:image/png;base64," + readFileSync(join(root, "assets", "logo-white.png")).toString("base64");
const logoDark = "data:image/png;base64," + readFileSync(join(root, "assets", "logo-dark.png")).toString("base64");

const ucid = process.argv[3] || "a1b23";
const name = process.argv[2] || "Heather O'Malley";
const verifyHost = "certs.fiveinnolabs.com";
const verifyUrl = `https://${verifyHost}/${ucid}`;
const d = {
  name,
  ucid,
  issuedDisplay: "3 June 2026",
  verifyUrl,
  verifyHost,
  emblemDataUri,
  logoWhite,
  logoDark,
  cohort: "",
  qr: qrSvg(verifyUrl, { size: 150, fg: "#0b1440", bg: "transparent", ecl: "M" }),
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "shell",
  userDataDir: "/tmp/certs-render-profile",
  args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars", "--disable-gpu"],
});

async function shot(html, w, h, file, scale = 1) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: "networkidle0" });
  try {
    await page.evaluate(async () => await document.fonts.ready);
  } catch {}
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: join(out, file), type: "png", clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log("wrote", file);
}

await shot(badgeCardHtml(d), 1080, 1080, "badge.png", 1);
await shot(ogHtml(d), 1200, 630, "og.png", 1);
await shot(badgeCardHtml({ ...d, name: "Michael Webb", ucid: "w7r56", cohort: "HELIOS Aug25", legacy: true, issuedDisplay: "28 August 2025" }), 1080, 1080, "badge-legacy.png", 1);

// PDF (A4)
{
  const page = await browser.newPage();
  await page.setContent(pdfHtml(d), { waitUntil: "networkidle0" });
  try {
    await page.evaluate(async () => await document.fonts.ready);
  } catch {}
  await new Promise((r) => setTimeout(r, 400));
  await page.pdf({ path: join(out, "credential.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
  await page.close();
  console.log("wrote credential.pdf");
}

await browser.close();
console.log("done");
