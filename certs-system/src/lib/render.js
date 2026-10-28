// render.js — render the artifact templates to PNG/PDF inside the Worker via
// Cloudflare Browser Rendering. Same templates used locally for visual iteration.
import puppeteer from "@cloudflare/puppeteer";
import { badgeCardHtml, ogHtml, pdfHtml } from "./templates.js";

// networkidle0 can hang inside Browser Rendering (28 Oct 2026: three issues failed with
// "Navigation timeout of 30000 ms"); the content is already set, so render what has loaded.
async function load(page, html) {
  try { await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 }); }
  catch (e) { if (!/timeout/i.test(String(e && e.message))) throw e; }
}

async function settle(page) {
  try {
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]);
      await new Promise((r) => setTimeout(r, 250));
    });
  } catch {}
}

// Returns { badge: Uint8Array, og: Uint8Array, pdf: Uint8Array }.
export async function renderArtifacts(env, data) {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await load(page, badgeCardHtml(data));
    await settle(page);
    const badge = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1080, height: 1080 } });

    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await load(page, ogHtml(data));
    await settle(page);
    const og = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });

    await load(page, pdfHtml(data));
    await settle(page);
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });

    return {
      badge: toBytes(badge),
      og: toBytes(og),
      pdf: toBytes(pdf),
    };
  } finally {
    await browser.close();
  }
}

function toBytes(x) {
  if (x instanceof Uint8Array) return x;
  if (x instanceof ArrayBuffer) return new Uint8Array(x);
  if (typeof x === "string") {
    // base64 fallback
    const bin = atob(x);
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  return new Uint8Array(x);
}
