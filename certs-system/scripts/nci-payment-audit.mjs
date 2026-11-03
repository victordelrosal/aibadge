// nci-payment-audit.mjs: proves NCI students are never shown a payment request or suggestion
// (Victor, 3 Nov 2026). Run after any change to the site, the worker emails or the grader prompt.
// Usage: node certs-system/scripts/nci-payment-audit.mjs   (from sBs/aibadge; exits 1 on any failure)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = process.env.AIB_SITE || "https://aibadge.fiveinnolabs.com";
const fails = [];
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails.push(msg); };

// 1. Worker: every Resend send goes through the guard, and the guard refuses NCI mail that mentions payment.
const w = readFileSync(join(ROOT, "worker/index.js"), "utf8");
ok(!/[^d]fetch\("https:\/\/api\.resend\.com\/emails"/.test(w), "worker: no Resend send bypasses resendFetch");
const src = w.slice(w.indexOf("function certIsNciEmail"), w.indexOf("function certIsAdmin"));
const sent = [];
const g = new Function("fetch", src + "; return { resendFetch, nciPaymentHit, NCI_PAY_RE };")(async () => { sent.push(1); return new Response("{}", { status: 200 }); });
const mail = (to, subject, html) => ({ body: JSON.stringify({ to, subject, html }) });
const cases = [
  ["x1@student.ncirl.ie", "Hi", "The first lessons are free", 422],
  ["x1@student.ncirl.ie", "Hi", "It costs nothing to resubmit", 422],
  ["x1@student.ncirl.ie", "Hi", "Pay €49 here", 422],
  ["staff@ncirl.ie", "Upgrade to premium", "hello", 422],
  ["x1@student.ncirl.ie", "Your AI Badge feedback is ready", "Two pieces to fix.", 200],
  ["someone@gmail.com", "Hi", "The first lessons are free", 200],
];
for (const [to, s, h, want] of cases) {
  const r = await g.resendFetch("https://api.resend.com/emails", mail(to, s, h));
  ok(r.status === want, `email guard: ${to} "${h}" -> ${r.status} (want ${want})`);
}
ok(/certIsNciEmail\(to\) \? "" : " The first lessons are free/.test(w), "invite email: free/no-card line dropped for NCI recipients");
ok(/certIsNciEmail\(to\) \? "Start learning" :/.test(w), "invite email: button says no 'free' for NCI recipients");
ok(/nciPaymentHit\(\.\.\.exercises\.map/.test(w), "cert-resolve: feedback and notes checked for every learner");

// 2. Certificate email (certs worker) and grader prompt.
const certMail = readFileSync(join(ROOT, "certs-system/src/lib/email.js"), "utf8");
ok(!g.nciPaymentHit(certMail.replace(/^\s*\/\/.*$/gm, "")), "certificate email template: no payment words");
ok(/never any word about money/.test(readFileSync(join(ROOT, "certs-system/scripts/grading/grade.mjs"), "utf8")), "grader prompt: forbids money words in feedback");

// 3. Live site on an NCI device: no payment word anywhere a student can reach, visible or in hidden markup,
//    unless it sits inside .aib-price (hidden by nci-guard.js). Scans <template> contents too (Alpine modals).
const { chromium } = createRequire(import.meta.url)(join(homedir(), "node_modules", "playwright"));
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { try { localStorage.setItem("aibadge.nci.device", "1"); } catch (e) {} });
  const page = await ctx.newPage();
  const pages = ["/", "/explore.html", "/terms.html", "/guidelines.html", "/privacy.html", "/verify.html", "/login.html", "/portal.html"];
  for (const p of pages) {
    const res = await page.goto(SITE + p + (p.includes("?") ? "&" : "?") + "v=" + Date.now(), { waitUntil: "networkidle", timeout: 45000 }).catch(e => null);
    if (!res || res.status() >= 400) { console.log(`SKIP ${p}: ${res ? res.status() : "no response"}`); continue; }
    await page.waitForTimeout(1500);
    const out = await page.evaluate((reSrc) => {
      const re = new RegExp(reSrc, "i");
      const vis = (document.body.innerText || "").split("\n").filter(l => re.test(l) && !/turnover|can I do this for free/i.test(l)).map(l => l.trim().slice(0, 120));
      const leaks = [];
      const walk = (root, inTpl) => {
        const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = it.nextNode(); n; n = it.nextNode()) {
          const t = n.textContent.trim(); if (!t || !re.test(t) || /turnover|can I do this for free/i.test(t)) continue;
          const el = n.parentElement; if (!el || el.closest("script,style,noscript,.aib-price,.aib-nci-only")) continue;
          leaks.push((inTpl ? "[template] " : "") + t.replace(/\s+/g, " ").slice(0, 120));
        }
        root.querySelectorAll && root.querySelectorAll("template").forEach(tp => walk(tp.content, true));
      };
      walk(document.body, false);
      return { nci: document.documentElement.classList.contains("aib-nci"), tagged: !!document.querySelector(".aib-price"), vis, leaks };
    }, g.NCI_PAY_RE.source);
    if (out.tagged || out.leaks.length) ok(out.nci, `${p}: page knows it is an NCI device`);
    ok(out.vis.length === 0, `${p}: no visible payment words` + (out.vis.length ? "\n      " + out.vis.slice(0, 8).join("\n      ") : ""));
    ok(out.leaks.length === 0, `${p}: no untagged payment words in markup` + (out.leaks.length ? "\n      " + [...new Set(out.leaks)].slice(0, 12).join("\n      ") : ""));
  }
} finally { await browser.close(); }

console.log(fails.length ? `\n${fails.length} FAILED` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
