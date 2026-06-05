// pages.js — public HTML: the verify landing and the per-credential brag/verify page.
// Cosmic AI Badge brand. The credential page verifies the Ed25519 signature live
// in the visitor's own browser (trustless) by importing the shared crypto-core.
import { FRAMEWORK_NAMES, ALIGNMENT_SUBLINE, ALIGNMENT_DISCLAIMER, LEVELS, DEFAULT_LEVEL } from "./lib/credential.js";

export function fmtDate(ymd) {
  try {
    const [y, m, d] = ymd.split("-").map(Number);
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${d} ${months[m - 1]} ${y}`;
  } catch {
    return ymd;
  }
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

const HEAD_STYLE = `
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--gold:#d8bd78;--gold-soft:rgba(216,189,120,.16);--lapis:#6ea0ec;--ink:#eef2ff;
    --muted:#9aa6c8;--muted2:#6c789e;--hair:rgba(255,255,255,.10);--ok:#5fd6a0;--warn:#ffb45f;--bad:#ff7a7a}
  html{scroll-behavior:smooth}
  body{font-family:Inter,system-ui,-apple-system,sans-serif;color:var(--ink);min-height:100vh;position:relative;
    -webkit-font-smoothing:antialiased;
    background:
      radial-gradient(120% 80% at 50% -10%,rgba(110,160,236,.14) 0%,rgba(110,160,236,0) 55%),
      radial-gradient(90% 60% at 50% 115%,rgba(216,189,120,.08) 0%,rgba(216,189,120,0) 60%),
      linear-gradient(165deg,#0a1230 0%,#070c1d 45%,#04060f 100%);background-attachment:fixed}
  .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:
    linear-gradient(rgba(110,160,236,.05) 1px,transparent 1px),
    linear-gradient(90deg,rgba(110,160,236,.05) 1px,transparent 1px);background-size:48px 48px;
    -webkit-mask-image:radial-gradient(80% 70% at 50% 30%,#000 50%,transparent 100%);
    mask-image:radial-gradient(80% 70% at 50% 30%,#000 50%,transparent 100%)}
  nav{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;
    padding:18px 26px;max-width:1100px;margin:0 auto}
  nav .brand{display:flex;align-items:center;gap:10px;font-size:15px;letter-spacing:.06em;font-weight:600}
  nav .brand .dot{width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold)}
  nav a{color:var(--muted);text-decoration:none;font-size:14px}
  nav a:hover{color:var(--ink)}
  nav .right{display:flex;align-items:center;gap:16px}
  .nav-logo{width:30px;height:auto;opacity:.9;display:block;transition:opacity .15s}
  .nav-logo:hover{opacity:1}
  .page-foot{text-align:center;margin-top:26px;font-size:13px;color:var(--muted2)}
  .page-foot a{color:var(--muted);text-decoration:none;border-bottom:1px solid var(--hair)}
  .page-foot a:hover{color:var(--ink)}
  .wrap{position:relative;z-index:2;max-width:680px;margin:0 auto;padding:18px 22px 70px}
  a{color:var(--lapis)}
  .btn{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:600;font-size:14px;
    padding:12px 20px;border-radius:999px;border:1px solid var(--hair);color:var(--ink);background:rgba(255,255,255,.03);
    cursor:pointer;transition:.18s}
  .btn:hover{border-color:var(--gold-soft);background:rgba(255,255,255,.06)}
  .btn.primary{background:var(--gold);color:#1a1405;border-color:transparent}
  .btn.primary:hover{filter:brightness(1.06)}
`;

const FONTS = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet">`;

const EMBLEM = "/assets/emblem.png";

/* --------------------------------------------------------------- landing ---- */
export function landingPage(host) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verify a credential · The AI Badge</title>
<meta name="description" content="Verify an AI Badge credential from fiveinnolabs. Enter the 5-character credential ID.">
<meta property="og:title" content="Verify a credential · The AI Badge">
<meta property="og:description" content="Verify an AI Badge credential from fiveinnolabs.">
<meta property="og:image" content="https://${host}/assets/emblem.png">
<link rel="icon" href="/assets/emblem.png">
${FONTS}<style>${HEAD_STYLE}
  .hero{text-align:center;padding:40px 0 10px}
  .hero img{width:150px;filter:drop-shadow(0 14px 34px rgba(0,0,0,.5))}
  h1{font-family:"Cormorant Garamond",serif;font-weight:700;font-size:42px;margin:18px 0 6px}
  .sub{color:var(--muted);font-size:17px;margin-bottom:26px}
  form{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px}
  input{font-family:"JetBrains Mono",monospace;font-size:24px;letter-spacing:.4em;text-align:center;
    width:230px;padding:14px 18px;border-radius:14px;border:1px solid var(--hair);background:rgba(255,255,255,.04);
    color:var(--ink);text-transform:lowercase}
  input:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 4px var(--gold-soft)}
  .msg{margin-top:16px;min-height:22px;font-size:15px}
  .msg.err{color:var(--bad)} .msg.ok{color:var(--ok)}
</style></head><body>
<div class="grid-bg"></div>
<nav><div class="brand"><span class="dot"></span>fiveinnolabs · The AI Badge</div>
<div class="right"><a href="https://aibadge.fiveinnolabs.com">aibadge.fiveinnolabs.com →</a><img class="nav-logo" src="/assets/logo-white.png" alt="fiveinnolabs"></div></nav>
<div class="wrap">
  <div class="hero">
    <img src="${EMBLEM}" alt="The AI Badge">
    <h1>Verify a credential</h1>
    <div class="sub">Enter the 5-character credential ID to view and verify an AI Badge.</div>
    <form id="f" novalidate>
      <input id="code" maxlength="5" placeholder="a1b23" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Credential ID">
      <button class="btn primary" type="submit">Verify →</button>
    </form>
    <div id="msg" class="msg"></div>
  </div>
</div>
<script>
  const f=document.getElementById('f'),i=document.getElementById('code'),m=document.getElementById('msg');
  const RE=/^[a-z][0-9][a-z][0-9]{2}$/;
  i.addEventListener('input',()=>{i.value=i.value.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5);m.textContent='';});
  f.addEventListener('submit',async e=>{e.preventDefault();const c=i.value.trim().toLowerCase();
    if(!RE.test(c)){m.className='msg err';m.textContent='Format: letter, digit, letter, two digits (e.g. a1b23).';return;}
    m.className='msg';m.textContent='Checking…';
    const r=await fetch('/api/verify/'+c).then(x=>x.json()).catch(()=>({}));
    if(r&&r.found){m.className='msg ok';m.textContent='Found — opening…';location.href='/'+c;}
    else{m.className='msg err';m.textContent='No credential found for that code.';}
  });
  i.focus();
</script>
</body></html>`;
}

/* ----------------------------------------------------- per-credential page -- */
export function credentialPage(rec, host) {
  const url = `https://${host}/${rec.ucid}`;
  const og = `https://${host}/${rec.ucid}/og.png`;
  const title = `${rec.name} — The AI Badge`;
  const desc = rec.legacy
    ? `${rec.name} holds a HELIOS legacy credential from fiveinnolabs. Cryptographically verifiable.`
    : `${rec.name} has earned the AI Badge from fiveinnolabs — a cryptographically verifiable credential.`;
  const issued = fmtDate(rec.issuedDate);
  // Non-legacy AI Badges carry a level designation + the competencies certified.
  const lvl = rec.legacy ? null : (LEVELS[rec.level || DEFAULT_LEVEL] || LEVELS[DEFAULT_LEVEL]);
  const legacyBadge = rec.legacy
    ? `<div class="legacy-chip">HELIOS · legacy credential (not re-issued)</div>`
    : "";
  // LinkedIn "Add to profile" prefilled certification.
  const li =
    "https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME" +
    "&name=" + encodeURIComponent("The AI Badge") +
    "&organizationName=" + encodeURIComponent("fiveinnolabs") +
    "&issueYear=" + rec.issuedDate.slice(0, 4) +
    "&issueMonth=" + String(Number(rec.issuedDate.slice(5, 7))) +
    "&certUrl=" + encodeURIComponent(url) +
    "&certId=" + encodeURIComponent(rec.ucid);
  const liShare =
    "https://www.linkedin.com/feed/?shareActive=true&text=" +
    encodeURIComponent(`I've earned the AI Badge from fiveinnolabs — a verifiable credential for applied, human-centred AI. Verify it: ${url}`);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="/assets/emblem.png">
${FONTS}<style>${HEAD_STYLE}
  .legacy-chip{display:inline-block;margin:0 auto 14px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--gold);border:1px solid var(--gold-soft);border-radius:999px;padding:5px 13px}
  .card{position:relative;text-align:center;background:rgba(255,255,255,.03);border:1px solid var(--hair);
    border-radius:26px;padding:42px 34px 34px;margin-top:14px;box-shadow:0 30px 80px rgba(0,0,0,.4)}
  .emblem{width:210px;filter:drop-shadow(0 16px 36px rgba(0,0,0,.55))}
  .eyebrow{font-size:14px;letter-spacing:.42em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-top:14px}
  .name{font-family:"Cormorant Garamond",serif;font-weight:700;font-size:58px;line-height:1.04;margin:8px 0 4px;color:#fff}
  .earned{color:var(--muted);font-size:18px}
  .designation{margin-top:10px;font-size:20px;font-weight:600;color:var(--gold);letter-spacing:.03em}
  .competencies{margin-top:24px;text-align:left;border:1px solid var(--hair);border-radius:16px;padding:20px 22px;background:rgba(255,255,255,.02)}
  .competencies h3{font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:14px;text-align:center}
  .comp-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:11px 22px}
  .comp-list li{position:relative;padding-left:24px;font-size:14.5px;line-height:1.5;color:var(--ink)}
  .comp-list li svg{position:absolute;left:0;top:3px;width:15px;height:15px}
  @media(max-width:520px){.comp-list{grid-template-columns:1fr}}
  .status{display:inline-flex;align-items:center;gap:10px;margin:22px 0 6px;padding:11px 20px;border-radius:999px;
    border:1px solid var(--hair);font-weight:600;font-size:15px;background:rgba(255,255,255,.03)}
  .status .ico{width:20px;height:20px;flex:0 0 auto}
  .status.ok{color:var(--ok);border-color:rgba(95,214,160,.35);background:rgba(95,214,160,.08)}
  .status.bad{color:var(--bad);border-color:rgba(255,122,122,.35);background:rgba(255,122,122,.08)}
  .status.warn{color:var(--warn);border-color:rgba(255,180,95,.35);background:rgba(255,180,95,.08)}
  .meta{display:flex;justify-content:center;gap:38px;margin-top:18px;flex-wrap:wrap}
  .meta .k{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted2);font-weight:600}
  .meta .v{font-size:18px;font-weight:600;margin-top:4px}
  .meta .v.mono{font-family:"JetBrains Mono",monospace;color:var(--gold);letter-spacing:.08em;font-size:22px}
  .actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:28px}
  .verify-note{margin-top:22px;font-size:13px;color:var(--muted2);line-height:1.6}
  .verify-note a{color:var(--lapis)}
  details{margin-top:22px;text-align:left;border:1px solid var(--hair);border-radius:14px;padding:0 18px;background:rgba(255,255,255,.02)}
  details summary{cursor:pointer;padding:16px 0;font-weight:600;color:var(--ink);list-style:none}
  details summary::-webkit-details-marker{display:none}
  details .body{padding:0 0 18px;color:var(--muted);font-size:14px;line-height:1.7}
  details code{font-family:"JetBrains Mono",monospace;color:var(--gold);font-size:12px;word-break:break-all}
  .frameworks{margin-top:24px;text-align:left;border:1px solid var(--hair);border-radius:16px;padding:20px 22px;background:rgba(255,255,255,.02)}
  .frameworks h3{font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px;text-align:center}
  .fw-sub{font-size:13.5px;color:var(--muted);text-align:center;margin-bottom:16px;line-height:1.5}
  .fw-grid{display:flex;flex-wrap:wrap;gap:9px;justify-content:center}
  .fw-chip{font-size:14px;color:var(--ink);font-weight:500;border:1px solid var(--hair);border-radius:999px;
    padding:8px 16px;background:rgba(255,255,255,.03)}
  .fw-note{margin-top:16px;font-size:11.5px;color:var(--muted2);line-height:1.55;text-align:center}
  .toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:#0e1631;
    border:1px solid var(--hair);color:var(--ink);padding:11px 18px;border-radius:12px;opacity:0;transition:.25s;z-index:9}
  .toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  @media(max-width:520px){.name{font-size:44px}.emblem{width:160px}}
</style></head><body>
<div class="grid-bg"></div>
<nav><div class="brand"><span class="dot"></span>fiveinnolabs · The AI Badge</div>
<div class="right"><a href="/">Verify another →</a><a href="https://aibadge.fiveinnolabs.com" title="The AI Badge by fiveinnolabs"><img class="nav-logo" src="/assets/logo-white.png" alt="fiveinnolabs"></a></div></nav>
<div class="wrap">
  ${legacyBadge}
  <div class="card">
    <img class="emblem" src="${EMBLEM}" alt="The AI Badge">
    <div class="eyebrow">${rec.legacy ? "HELIOS Programme" : "The AI Badge"}</div>
    <div class="name">${esc(rec.name)}</div>
    <div class="earned">${rec.legacy ? "completed the HELIOS programme" : "has earned the AI Badge"}${rec.cohort ? " · " + esc(rec.cohort) : ""}</div>
    ${lvl ? `<div class="designation">${esc(lvl.designation)}</div>` : ""}
    <div id="status" class="status"><span class="ico" id="statusIco"></span><span id="statusTxt">Verifying signature…</span></div>
    <div class="meta">
      <div><div class="k">Credential ID</div><div class="v mono">${esc(rec.ucid)}</div></div>
      <div><div class="k">Issued</div><div class="v">${esc(issued)}</div></div>
      <div><div class="k">Issuer</div><div class="v">fiveinnolabs</div></div>
    </div>
    <div class="actions">
      <a class="btn primary" href="/${rec.ucid}/credential.pdf">Download certificate (PDF)</a>
      <a class="btn" href="/${rec.ucid}/badge.png" download="AI-Badge-${rec.ucid}.png">Download image</a>
      <a class="btn" href="${li}" target="_blank" rel="noopener">Add to LinkedIn</a>
      <button class="btn" id="copyBtn">Copy link</button>
      <a class="btn" href="${liShare}" target="_blank" rel="noopener">Share</a>
    </div>
    <div class="verify-note">This page checks the credential's <b>Ed25519</b> signature live, in your browser, against the public key published by fiveinnolabs. Nothing is taken on trust.</div>
    ${lvl ? `<div class="competencies">
      <h3>Competencies demonstrated</h3>
      <ul class="comp-list">
        ${lvl.competencies.map((c) => `<li><svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${esc(c)}</li>`).join("")}
      </ul>
    </div>` : ""}
    ${rec.legacy ? "" : `<div class="frameworks">
      <h3>Framework Alignment</h3>
      <div class="fw-sub">${esc(ALIGNMENT_SUBLINE)}</div>
      <div class="fw-grid">
        ${FRAMEWORK_NAMES.map((n) => `<div class="fw-chip">${esc(n)}</div>`).join("")}
      </div>
      <div class="fw-note">${esc(ALIGNMENT_DISCLAIMER)}</div>
    </div>`}
    ${rec.legacy ? "" : `<details>
      <summary>About these frameworks ↓</summary>
      <div class="body">
        <p>The AI Badge curriculum is mapped to leading international AI-competency frameworks, so your credential is legible in terms others already recognise. This reflects programme design — not a graded test.</p>
        <ul style="margin:10px 0 0;padding-left:18px;line-height:1.8">
          <li><b>UNESCO</b> — UNESCO's AI competency frameworks: a global reference for the knowledge, skills and values needed to engage with AI responsibly.</li>
          <li><b>The Alan Turing Institute</b> — the UK's national institute for AI &amp; data science; its skills framing spans AI citizens, workers and leaders.</li>
          <li><b>DigComp 3.0</b> — the European Commission's Digital Competence Framework, extended with AI-specific competences.</li>
          <li><b>SFIA 9</b> — the Skills Framework for the Information Age, the global standard for describing professional digital and AI skills.</li>
          <li><b>EU AI Act</b> — the EU's AI regulation; Article 4 requires organisations to ensure staff have sufficient AI literacy.</li>
          <li><b>OECD/EC AILit</b> — the OECD &amp; European Commission AI Literacy Framework for learners.</li>
        </ul>
      </div>
    </details>`}
    <details>
      <summary>How verification works ↓</summary>
      <div class="body">
        <p>The AI Badge is issued as an <b>Open Badges 3.0</b> / W3C Verifiable Credential. Each badge is signed with the fiveinnolabs issuer's Ed25519 private key. This page fetches the signed credential and the issuer's <b>public</b> key, then recomputes the signature: if a single character of the name, date or code had been altered, verification would fail.</p>
        <p style="margin-top:8px">Inspect the raw materials:
          <a href="/${rec.ucid}/credential.json">credential.json</a> ·
          <a href="/issuer">issuer profile</a> ·
          <a href="/.well-known/issuer-public.json">public key</a>
        </p>
      </div>
    </details>
  </div>
  <div class="page-foot">The AI Badge · <a href="https://aibadge.fiveinnolabs.com">aibadge.fiveinnolabs.com</a></div>
</div>
<div class="toast" id="toast">Link copied ✓</div>
<script type="module">
  import { verifyCredential, multikeyToPublicKey } from '/lib/crypto-core.js';
  const S=document.getElementById('status'),T=document.getElementById('statusTxt'),I=document.getElementById('statusIco');
  const ICONS={
    ok:'<svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="#5fd6a0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad:'<svg viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="#ff7a7a" stroke-width="2.5" stroke-linecap="round"/></svg>',
    warn:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="#ffb45f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function set(kind,txt){S.className='status '+kind;T.textContent=txt;I.innerHTML=ICONS[kind]||'';}
  (async()=>{
    try{
      const r=await fetch('/api/verify/${rec.ucid}').then(x=>x.json());
      if(!r||!r.found){set('bad','Credential not found');return;}
      if(r.status==='revoked'){set('warn','This credential has been revoked');return;}
      const pub=multikeyToPublicKey(r.publicKeyMultikey);
      const v=await verifyCredential(r.credential,pub);
      if(v.valid){
        set('ok', r.legacy ? 'Verified · HELIOS legacy credential' : 'Verified · cryptographically authentic');
      } else {
        set('bad','Signature invalid — '+(v.reason||'do not trust'));
      }
    }catch(e){ set('warn','Could not complete verification'); }
  })();
  const to=document.getElementById('toast');
  document.getElementById('copyBtn').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText('${url}');to.classList.add('show');setTimeout(()=>to.classList.remove('show'),1600);}catch{}
  });
</script>
</body></html>`;
}
