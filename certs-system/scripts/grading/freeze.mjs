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
import { lookup } from "node:dns/promises";
import { lookup as dnsLookup } from "node:dns";
import https from "node:https";
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

// A public name can still resolve to a private address (security review, 3 Oct 2026).
function privateIp(ip) {
  let v = String(ip).toLowerCase();
  const hex = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);           // ::ffff:7f00:1 form
  if (hex) { const h = parseInt(hex[1], 16), l = parseInt(hex[2], 16); v = [h >> 8, h & 255, l >> 8, l & 255].join("."); }
  v = v.replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) {
    const [a, b] = v.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0) || a >= 224;
  }
  // Anything that is not plainly a global-unicast IPv6 address is refused.
  return !/^[23][0-9a-f]{0,3}:/.test(v) || v.startsWith("2001:db8") || v.startsWith("64:ff9b");
}
// Connect only to an address that passed the check, so a second DNS answer cannot swap it.
function pinnedLookup(host, opts, cb) {
  dnsLookup(host, { all: true }, (err, addrs) => {
    if (err) return cb(err);
    const ok = addrs.filter((a) => !privateIp(a.address));
    if (!ok.length || ok.length !== addrs.length) return cb(new Error("refused: resolves to a private address"));
    return opts && opts.all ? cb(null, ok) : cb(null, ok[0].address, ok[0].family);
  });
}
function getPinned(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { lookup: pinnedLookup, headers: { "User-Agent": "Mozilla/5.0 AI-Badge-review" }, timeout: 20000 }, (res) => {
      let body = ""; res.setEncoding("utf8");
      res.on("data", (c) => { body += c; if (body.length > 5e6) req.destroy(new Error("page too large")); });
      res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location, body }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}
async function resolvesPublic(url) {
  try { const addrs = await lookup(url.hostname, { all: true }); return addrs.length > 0 && addrs.every((a) => !privateIp(a.address)); }
  catch (e) { return false; }
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
    let r;
    try { r = await getPinned(url); } catch (e) { return { error: String(e.message).slice(0, 120) }; }
    if (r.status >= 300 && r.status < 400 && r.location) { url = publicHttpsUrl(new URL(r.location, url).href); continue; }
    if (r.status < 200 || r.status >= 300) return { error: "http " + r.status };
    return { text: visibleText(r.body) };
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
  await ctx.route("**/*", async (route) => {
    const u = publicHttpsUrl(route.request().url());
    return u && (await resolvesPublic(u)) ? route.continue() : route.abort();
  });
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
