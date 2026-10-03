// freeze.mjs: NO AI. Turns each live-link submission into frozen plain text the grader can read.
// Public https pages are fetched as source and reduced to visible text; chat-share links (ChatGPT,
// Gemini, Claude) only render with JavaScript, so they go through one headless browser, closed in
// the same run. Private, local and non-https targets are refused at every hop, because this runs
// on Victor's Mac next to local services (bridge 7321, dropbridge 7322).
// Usage: node freeze.mjs <batch>
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { sha256 } from "./common.mjs";

const batch = process.argv[2];
if (!batch || !existsSync(batch)) { console.error("usage: node freeze.mjs <batch>"); process.exit(2); }

const RENDER_HOSTS = ["chatgpt.com", "chat.openai.com", "share.gemini.google", "gemini.google.com", "g.co", "claude.ai"];
const MAX_TEXT = 30000;

function publicHttpsUrl(u) {
  let url; try { url = new URL(u); } catch (e) { return null; }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  const h = url.hostname.toLowerCase();
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || /(^|\.)(localhost|local|internal|lan|home|arpa)$/.test(h)) return null;
  return url;
}

function visibleText(html) {
  const title = (html.match(/<title[^>]*>([^<]*)/i) || [, ""])[1].trim();
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  return (title ? "Page title: " + title + "\n\n" : "") + body;
}

async function fetchText(start) {
  let url = publicHttpsUrl(start);
  for (let hop = 0; url && hop < 4; hop++) {
    const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 AI-Badge-review" }, signal: AbortSignal.timeout(20000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = publicHttpsUrl(new URL(r.headers.get("location"), url).href); continue; }
    if (!r.ok) return { error: "http " + r.status };
    return { text: visibleText(await r.text()) };
  }
  return { error: url ? "too many redirects" : "refused: not a public https address" };
}

let browser = null;
async function renderText(u) {
  if (!browser) {
    const { chromium } = createRequire(import.meta.url)(join(homedir(), "node_modules", "playwright"));
    browser = await chromium.launch({ headless: true });
  }
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" });
  await ctx.route("**/*", (route) => (publicHttpsUrl(route.request().url()) ? route.continue() : route.abort()));
  try {
    const p = await ctx.newPage();
    try { await p.goto(u.href, { waitUntil: "networkidle", timeout: 45000 }); } catch (e) {}
    await p.waitForTimeout(3000);
    return { text: await p.evaluate(() => document.body.innerText) };
  } finally { await ctx.close(); }
}

let frozen = 0, failed = 0;
try {
  for (const uid of readdirSync(batch)) {
    const metaPath = join(batch, uid, "meta.json");
    if (!existsSync(metaPath)) continue;
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    for (const ex of meta.exercises) {
      if (!ex.awaitingFreeze) continue;
      const u = publicHttpsUrl(ex.url);
      let res;
      try {
        res = !u ? { error: "refused: not a public https address" }
          : RENDER_HOSTS.includes(u.hostname.toLowerCase()) ? await renderText(u) : await fetchText(u.href);
      } catch (e) { res = { error: String(e.message).slice(0, 200) }; }
      if (res.error || !res.text || res.text.trim().length < 40) { ex.freezeError = res.error || "page had no readable text"; failed++; continue; }
      const text = res.text.slice(0, MAX_TEXT);
      writeFileSync(join(batch, uid, ex.exerciseId + ".txt"), text, { mode: 0o600 });
      Object.assign(ex, { awaitingFreeze: false, frozenFrom: ex.url, frozenAt: new Date().toISOString(), bytes: Buffer.byteLength(text), submissionSha256: sha256(text) });
      delete ex.freezeError;
      frozen++;
    }
    writeFileSync(metaPath, JSON.stringify(meta, null, 2), { mode: 0o600 });
  }
} finally { if (browser) await browser.close(); }
console.log(JSON.stringify({ frozen, failed }));
