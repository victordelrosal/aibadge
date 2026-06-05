// templates.js — HTML/CSS for the rendered artifacts. Each function returns a
// complete HTML document rendered by headless Chrome (locally for iteration, and
// by Cloudflare Browser Rendering in the Worker). Identical input → identical pixels.
//
// `data` shape: { name, ucid, issuedDisplay, verifyUrl, verifyHost, emblemDataUri,
//                 qr (svg string), cohort?, legacy?, source? }

import { qrSvg } from "./qr.js";
import { FRAMEWORK_NAMES, ALIGNED_WITH_LINE, ALIGNMENT_SUBLINE, ALIGNMENT_DISCLAIMER } from "./credential.js";

const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">`;

// Shared cosmic background + Tron corner tickmarks.
const COSMIC = `
  --gold:#d8bd78; --gold-soft:rgba(216,189,120,.18);
  --lapis:#6ea0ec; --ink:#eef2ff; --muted:#9aa6c8; --muted2:#6c789e;
  --hair:rgba(255,255,255,.10); --hair-strong:rgba(255,255,255,.18);`;

function cosmicBg() {
  return `
    background:
      radial-gradient(120% 90% at 50% -10%, rgba(110,160,236,.16) 0%, rgba(110,160,236,0) 55%),
      radial-gradient(90% 70% at 50% 120%, rgba(216,189,120,.10) 0%, rgba(216,189,120,0) 60%),
      radial-gradient(70% 70% at 78% 22%, #10183a 0%, rgba(16,24,58,0) 60%),
      linear-gradient(165deg, #0a1230 0%, #070c1d 45%, #04060f 100%);`;
}

// Faint 48px grid, masked to fade at edges.
function gridLayer() {
  return `<div style="position:absolute;inset:0;background-image:
      linear-gradient(rgba(110,160,236,.05) 1px,transparent 1px),
      linear-gradient(90deg,rgba(110,160,236,.05) 1px,transparent 1px);
      background-size:48px 48px;
      -webkit-mask-image:radial-gradient(80% 80% at 50% 45%,#000 55%,transparent 100%);
      mask-image:radial-gradient(80% 80% at 50% 45%,#000 55%,transparent 100%);"></div>`;
}

function corner(pos) {
  const m = 46,
    s = 30;
  const base = `position:absolute;width:${s}px;height:${s}px;border-color:var(--gold);opacity:.7;`;
  const map = {
    tl: `top:${m}px;left:${m}px;border-top:2px solid;border-left:2px solid;`,
    tr: `top:${m}px;right:${m}px;border-top:2px solid;border-right:2px solid;`,
    bl: `bottom:${m}px;left:${m}px;border-bottom:2px solid;border-left:2px solid;`,
    br: `bottom:${m}px;right:${m}px;border-bottom:2px solid;border-right:2px solid;`,
  };
  return `<div style="${base}${map[pos]}"></div>`;
}
function corners() {
  return corner("tl") + corner("tr") + corner("bl") + corner("br");
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ------------------------------------------------- square badge card (1080) -- */
export function badgeCardHtml(d) {
  const legacyTag = d.legacy
    ? `<div class="legacy">HELIOS · legacy credential</div>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${FONTS}
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{${COSMIC}}
  html,body{width:1080px;height:1080px}
  body{font-family:Inter,system-ui,sans-serif;${cosmicBg()}position:relative;overflow:hidden;color:var(--ink);
    -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  .frame{position:absolute;inset:30px;border:1px solid var(--hair);border-radius:26px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.05);}
  .wm{position:absolute;inset:0;z-index:0;background-repeat:no-repeat;background-position:center 56%;
    background-size:60%;opacity:.05;pointer-events:none}
  .brandmark{position:absolute;top:50px;right:56px;width:54px;height:auto;opacity:.9;z-index:5}
  .wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
    padding:70px 92px 52px;text-align:center}
  .aligned{margin-top:20px;font-size:15px;color:var(--muted);letter-spacing:.01em}
  .aligned b{color:var(--gold);font-weight:600}
  .designation{margin-top:12px;font-size:30px;font-weight:600;color:var(--gold);letter-spacing:.03em}
  .brand{display:flex;align-items:center;gap:10px;font-size:20px;letter-spacing:.34em;
    text-transform:uppercase;color:var(--muted);font-weight:500}
  .brand .dot{width:6px;height:6px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold)}
  .emblem-wrap{position:relative;margin:26px 0 8px}
  .emblem-wrap::before{content:"";position:absolute;inset:-10% ;
    background:radial-gradient(circle at 50% 46%,rgba(110,160,236,.30),rgba(216,189,120,.10) 45%,transparent 68%);
    filter:blur(18px);z-index:0}
  .emblem{position:relative;z-index:1;width:430px;height:auto;display:block;
    filter:drop-shadow(0 18px 40px rgba(0,0,0,.55))}
  .eyebrow{font-size:23px;letter-spacing:.46em;text-transform:uppercase;color:var(--gold);
    font-weight:600;margin-top:6px}
  .name{font-family:"Cormorant Garamond",Georgia,serif;font-weight:700;font-size:86px;line-height:1.02;
    color:#fff;margin:18px 0 6px;letter-spacing:.005em}
  .sub{font-size:25px;color:var(--muted);font-weight:400}
  .sub b{color:var(--ink);font-weight:500}
  .divider{width:200px;height:1px;margin:30px 0 26px;
    background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.8}
  .meta{display:flex;align-items:center;gap:30px;margin-top:auto;width:100%;justify-content:center}
  .qr{background:#fff;border-radius:16px;padding:14px;width:150px;height:150px;flex:0 0 auto;
    box-shadow:0 10px 30px rgba(0,0,0,.45)}
  .qr svg{width:100%;height:100%;display:block}
  .info{text-align:left;display:flex;flex-direction:column;gap:7px}
  .info .lbl{font-size:14px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted2);font-weight:600}
  .code{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:50px;color:var(--gold);
    letter-spacing:.10em;line-height:1}
  .issued{font-size:21px;color:var(--ink);font-weight:500}
  .verify{font-size:18px;color:var(--lapis);font-family:"JetBrains Mono",monospace}
  .vtag{display:inline-flex;align-items:center;gap:8px;font-size:16px;color:var(--muted);margin-top:2px}
  .vtag svg{width:16px;height:16px}
  .legacy{position:absolute;top:54px;left:60px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--gold);border:1px solid var(--gold-soft);border-radius:999px;padding:5px 12px}
</style></head>
<body>
  ${gridLayer()}${corners()}
  <div class="wm" style="background-image:url('${d.logoWhite}')"></div>
  <div class="frame"></div>
  <img class="brandmark" src="${d.logoWhite}" alt="fiveinnolabs">
  ${legacyTag}
  <div class="wrap">
    <div class="brand"><span class="dot"></span>fiveinnolabs</div>
    <div class="emblem-wrap"><img class="emblem" src="${d.emblemDataUri}" alt=""></div>
    <div class="eyebrow">${d.legacy ? "HELIOS Programme" : "The AI Badge"}</div>
    <div class="name">${esc(d.name)}</div>
    <div class="sub">${d.legacy ? "completed the <b>HELIOS</b> programme" : "has earned the <b>AI Badge</b>"}${d.cohort ? " · " + esc(d.cohort) : ""}</div>
    ${d.designation ? `<div class="designation">${esc(d.designation)}</div>` : ""}
    <div class="divider"></div>
    <div class="meta">
      <div class="qr">${d.qr}</div>
      <div class="info">
        <div class="lbl">Credential ID</div>
        <div class="code">${esc(d.ucid)}</div>
        <div class="issued">Issued ${esc(d.issuedDisplay)}</div>
        <div class="verify">${esc(d.verifyHost)}/${esc(d.ucid)}</div>
        <div class="vtag">${checkIcon()} Cryptographically verifiable</div>
      </div>
    </div>
    ${d.legacy ? "" : `<div class="aligned">${ALIGNED_WITH_LINE}</div>`}
  </div>
</body></html>`;
}

/* ----------------------------------------------------- social OG (1200x630) -- */
export function ogHtml(d) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${FONTS}
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{${COSMIC}}
  html,body{width:1200px;height:630px}
  body{font-family:Inter,system-ui,sans-serif;${cosmicBg()}position:relative;overflow:hidden;color:var(--ink);
    -webkit-font-smoothing:antialiased;display:flex;align-items:center;gap:50px;padding:0 86px}
  .frame{position:absolute;inset:24px;border:1px solid var(--hair);border-radius:22px}
  .wm{position:absolute;inset:0;z-index:0;background-repeat:no-repeat;background-position:90% 52%;background-size:30%;opacity:.05;pointer-events:none}
  .brandmark{position:absolute;top:36px;right:44px;width:46px;height:auto;opacity:.9;z-index:5}
  .emblem-wrap{position:relative;flex:0 0 auto;z-index:1}
  .emblem-wrap::before{content:"";position:absolute;inset:-14%;
    background:radial-gradient(circle at 50% 46%,rgba(110,160,236,.34),rgba(216,189,120,.10) 46%,transparent 70%);
    filter:blur(20px)}
  .emblem{position:relative;width:340px;height:auto;display:block;
    filter:drop-shadow(0 16px 36px rgba(0,0,0,.55))}
  .col{position:relative;display:flex;flex-direction:column;gap:4px}
  .brand{font-size:18px;letter-spacing:.34em;text-transform:uppercase;color:var(--muted);font-weight:500;
    display:flex;align-items:center;gap:9px}
  .brand .dot{width:6px;height:6px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold)}
  .eyebrow{font-size:19px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-top:14px}
  .name{font-family:"Cormorant Garamond",Georgia,serif;font-weight:700;font-size:74px;line-height:1.02;color:#fff;margin:6px 0}
  .sub{font-size:23px;color:var(--muted)}
  .row{display:flex;align-items:center;gap:16px;margin-top:22px}
  .pill{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:22px;color:var(--gold);
    border:1px solid var(--gold-soft);border-radius:999px;padding:7px 16px;letter-spacing:.08em}
  .vtag{display:inline-flex;align-items:center;gap:8px;font-size:18px;color:var(--muted)}
  .vtag svg{width:18px;height:18px}
</style></head>
<body>
  ${gridLayer()}
  <div class="wm" style="background-image:url('${d.logoWhite}')"></div>
  <div class="frame"></div>
  <img class="brandmark" src="${d.logoWhite}" alt="fiveinnolabs">
  <div class="emblem-wrap"><img class="emblem" src="${d.emblemDataUri}" alt=""></div>
  <div class="col">
    <div class="brand"><span class="dot"></span>fiveinnolabs · ${d.legacy ? "HELIOS" : "The AI Badge"}</div>
    <div class="eyebrow">Verified Credential</div>
    <div class="name">${esc(d.name)}</div>
    <div class="sub">${d.legacy ? "completed the HELIOS programme" : "has earned the AI Badge"}${d.cohort ? " · " + esc(d.cohort) : ""}</div>
    ${d.designation ? `<div class="sub" style="margin-top:6px;color:var(--gold);font-weight:600;font-size:21px">${esc(d.designation)}</div>` : ""}
    <div class="row">
      <span class="pill">${esc(d.ucid)}</span>
      <span class="vtag">${checkIcon()} Cryptographically verifiable</span>
    </div>
    <div class="sub" style="margin-top:14px;font-family:'JetBrains Mono',monospace;font-size:18px;color:var(--lapis)">${esc(d.verifyHost)}/${esc(d.ucid)}</div>
    ${d.legacy ? "" : `<div class="sub" style="margin-top:12px;font-size:15px;color:var(--muted2)">${ALIGNED_WITH_LINE}</div>`}
  </div>
</body></html>`;
}

function checkIcon(color = "#d8bd78") {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* --------------------------------------------- official PDF (A4 portrait) ---- */
// Light, ivory, print-perfect certificate with CURP-style gravitas: ornate border,
// credential card, a signed letter from the issuer, and a cryptographic
// verification footer with QR + the credential code rendered as a code strip.
export function pdfHtml(d) {
  const verifyQr = qrSvg(d.verifyUrl, { size: 150, fg: "#173f73", bg: "transparent", ecl: "M" });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${FONTS}
<style>
  @page{size:A4;margin:0}
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--navy:#173f73;--navy2:#1d4d8c;--gold:#a88742;--ink:#0b1220;--body:#2a3142;--muted:#5a6273;
    --paper:#fcfbf7;--hair:rgba(15,23,42,.12)}
  html,body{width:210mm;height:297mm;overflow:hidden}
  body{font-family:Inter,system-ui,sans-serif;background:var(--paper);color:var(--body);
    -webkit-font-smoothing:antialiased;position:relative}
  /* ornate border */
  .border-outer{position:absolute;inset:9mm;border:2.2px solid var(--navy);border-radius:3px}
  .border-inner{position:absolute;inset:11mm;border:1px solid var(--gold)}
  .orn{position:absolute;width:16px;height:16px;border-color:var(--gold)}
  .watermark{position:absolute;top:50%;left:50%;width:135mm;transform:translate(-50%,-46%);
    opacity:.05;z-index:0}
  .brandmark{position:absolute;top:14.5mm;right:15mm;width:15mm;height:auto;opacity:.92;z-index:3}
  .content{position:absolute;inset:16mm;display:flex;flex-direction:column;z-index:2}
  /* header */
  .brand{display:flex;align-items:center;justify-content:center;gap:9px;font-size:13px;letter-spacing:.36em;
    text-transform:uppercase;color:var(--muted);font-weight:600}
  .brand .dot{width:5px;height:5px;border-radius:50%;background:var(--gold)}
  .title{text-align:center;font-family:"Cormorant Garamond",Georgia,serif;font-weight:700;color:var(--navy);
    font-size:34px;letter-spacing:.01em;margin-top:7px;line-height:1.05}
  .title small{display:block;font-family:Inter;font-weight:600;font-size:12px;letter-spacing:.32em;
    text-transform:uppercase;color:var(--gold);margin-top:9px}
  .rule{width:62mm;height:2px;margin:13px auto 0;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
  /* credential card */
  .card{display:flex;gap:12mm;align-items:center;margin-top:8mm}
  .card .emblem{width:46mm;height:auto;flex:0 0 auto;filter:drop-shadow(0 6px 14px rgba(23,63,115,.22))}
  .fields{flex:1}
  .awarded{font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .recipient{font-family:"Cormorant Garamond",Georgia,serif;font-weight:700;font-size:46px;color:var(--ink);
    line-height:1.02;margin:4px 0 12px}
  .grid{display:flex;gap:10mm}
  .grid .k{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .grid .v{font-size:16px;color:var(--ink);font-weight:600;margin-top:3px}
  .grid .v.mono{font-family:"JetBrains Mono",monospace;color:var(--navy2);letter-spacing:.06em}
  /* letter */
  .letter{margin-top:7mm;font-size:12.5px;line-height:1.72;color:var(--body)}
  .letter p{margin-bottom:8px}
  .sign{margin-top:9mm;display:flex;justify-content:space-between;align-items:flex-end}
  .sig .who{font-family:"Cormorant Garamond",serif;font-size:26px;color:var(--navy);border-bottom:1px solid var(--hair);
    padding-bottom:4px;width:62mm}
  .sig .role{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:6px;font-weight:600}
  .seal{text-align:center}
  .seal .ring{width:30mm;height:30mm;border:1.5px solid var(--gold);border-radius:50%;display:flex;
    flex-direction:column;align-items:center;justify-content:center;color:var(--navy);
    font-family:"Cormorant Garamond",serif;font-size:13px;text-align:center;line-height:1.12;font-weight:700;
    position:relative;box-shadow:inset 0 0 0 1px rgba(168,135,66,.25)}
  .seal .ring small{display:block;font-family:Inter;font-size:6.5px;letter-spacing:.24em;color:var(--gold);
    margin-top:4px;font-weight:600}
  /* framework alignment */
  .fw{margin-top:5mm;border:1px solid var(--hair);border-radius:7px;padding:5mm 7mm 4mm;background:#fbfcfe}
  .fw-h{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);font-weight:700;text-align:center;margin-bottom:2mm}
  .fw-sub{font-size:9.5px;color:var(--muted);text-align:center;margin-bottom:3.5mm}
  .fw-grid{display:flex;flex-wrap:wrap;gap:2mm 2.5mm;justify-content:center}
  .fw-chip{font-size:10px;color:var(--ink);font-weight:600;border:1px solid var(--hair);border-radius:999px;padding:1.6mm 3.5mm;background:#fff}
  .fw-note{margin-top:3.5mm;font-size:8px;color:var(--muted);line-height:1.45;text-align:center}
  /* level designation + competencies */
  .cred-level{text-align:center;font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-top:6px}
  .comp{margin-top:5mm;border:1px solid var(--hair);border-radius:7px;padding:4.5mm 7mm 4mm;background:#fbfcfe}
  .comp-h{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--navy2);font-weight:700;text-align:center;margin-bottom:3mm}
  .comp ul{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:1.7mm 7mm}
  .comp li{position:relative;padding-left:5mm;font-size:9.5px;line-height:1.38;color:var(--ink)}
  .comp li::before{content:"";position:absolute;left:0;top:1.3mm;width:2mm;height:2mm;border-radius:50%;background:var(--gold)}
  /* verification footer */
  .verify{margin-top:auto;display:flex;gap:11mm;align-items:center;border-top:1px solid var(--hair);
    padding-top:6mm}
  .verify .vqr{width:23mm;height:23mm;flex:0 0 auto}
  .verify .vqr svg{width:100%;height:100%;display:block}
  .card .emblem,.watermark{display:block}
  .verify .vtext{flex:1;min-width:0;font-size:10.5px;line-height:1.6;color:var(--muted)}
  .verify .vtext b{color:var(--ink)}
  .verify .vurl{font-family:"JetBrains Mono",monospace;color:var(--navy2);font-size:12px;font-weight:600}
  .codestrip{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:22px;color:var(--navy);
    letter-spacing:.5em;border:1px solid var(--hair);border-radius:6px;padding:8px 14px 8px 19px;background:#fff}
</style></head>
<body>
  <img class="watermark" src="${d.emblemDataUri}" alt="">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="orn" style="top:10.2mm;left:10.2mm;border-top:2px solid;border-left:2px solid"></div>
  <div class="orn" style="top:10.2mm;right:10.2mm;border-top:2px solid;border-right:2px solid"></div>
  <div class="orn" style="bottom:10.2mm;left:10.2mm;border-bottom:2px solid;border-left:2px solid"></div>
  <div class="orn" style="bottom:10.2mm;right:10.2mm;border-bottom:2px solid;border-right:2px solid"></div>
  <img class="brandmark" src="${d.logoDark}" alt="fiveinnolabs">
  <div class="content">
    <div class="brand"><span class="dot"></span>fiveinnolabs</div>
    <div class="title">Certificate of Achievement<small>${d.legacy ? "HELIOS · The AI Foundations Programme" : "The AI Badge"}</small></div>
    <div class="rule"></div>
    ${d.designation ? `<div class="cred-level">${esc(d.designation)}</div>` : ""}

    <div class="card">
      <img class="emblem" src="${d.emblemDataUri}" alt="The AI Badge">
      <div class="fields">
        <div class="awarded">This certifies that</div>
        <div class="recipient">${esc(d.name)}</div>
        <div class="grid">
          <div><div class="k">Credential ID</div><div class="v mono">${esc(d.ucid)}</div></div>
          <div><div class="k">Date issued</div><div class="v">${esc(d.issuedDisplay)}</div></div>
          ${d.cohort ? `<div><div class="k">Cohort</div><div class="v">${esc(d.cohort)}</div></div>` : ""}
        </div>
      </div>
    </div>

    <div class="letter">
      <p>has earned <b>the AI Badge</b> from fiveinnolabs, in recognition of demonstrated, applied mastery of human-centred artificial intelligence: the fluent use of frontier AI tools to do real work with sound judgement, an evaluator's mindset, and responsible practice.</p>
      <p>The AI Badge is awarded not for watching, but for doing. This certificate is a cryptographically signed, independently verifiable credential, confirmable at any time via the link and code below.</p>
    </div>

    ${d.competencies && d.competencies.length ? `<div class="comp">
      <div class="comp-h">Competencies demonstrated</div>
      <ul>${d.competencies.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>` : ""}

    ${d.legacy ? "" : `<div class="fw">
      <div class="fw-h">Framework Alignment</div>
      <div class="fw-sub">${esc(ALIGNMENT_SUBLINE)}</div>
      <div class="fw-grid">
        ${FRAMEWORK_NAMES.map((n) => `<span class="fw-chip">${esc(n)}</span>`).join("")}
      </div>
      <div class="fw-note">${esc(ALIGNMENT_DISCLAIMER)}</div>
    </div>`}

    <div class="sign">
      <div class="sig">
        <div class="who">Victor del Rosal</div>
        <div class="role">Founder, fiveinnolabs · Issuer</div>
      </div>
      <div class="seal"><div class="ring">The AI<br>BADGE<small>VERIFIED</small></div></div>
    </div>

    <div class="verify">
      <div class="vqr">${verifyQr}</div>
      <div class="vtext">
        <div class="vurl">${esc(d.verifyHost)}/${esc(d.ucid)}</div>
        <div style="margin-top:4px"><b>Verify this credential.</b> Scan the code or visit the link above. This badge is issued as an <b>Open Badges 3.0</b> Verifiable Credential and signed with an <b>Ed25519</b> digital signature; any alteration invalidates it.</div>
      </div>
      <div class="codestrip">${esc(d.ucid)}</div>
    </div>
  </div>
</body></html>`;
}

// Re-export qrSvg so the worker/render scripts have one import surface.
export { qrSvg };
