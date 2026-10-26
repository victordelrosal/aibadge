// mexnet-page.js — the public page for one RGMX Irlanda botón (Spanish). Like the AI Badge page, it checks
// the Ed25519 signature live in the visitor's browser, and adds the holder check: anyone who knows the
// holder's email can confirm the botón was issued to that address, without the address being published.
import { BOTONES, botonTitle } from "./lib/mexnet.js";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function fecha(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return d && m && y ? `${d} de ${MESES[m - 1]} de ${y}` : String(ymd);
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Mirrors of the issuer public key that do not depend on certs.fiveinnolabs.com staying up.
export const KEY_MIRRORS = [
  "https://raw.githubusercontent.com/victordelrosal/aibadge/main/certs-system/issuer-key/issuer-public.json",
];

export function botonPage(rec, host) {
  const b = BOTONES[rec.slug];
  const title = botonTitle(rec.slug);
  const url = `https://${host}/${rec.ucid}`;
  const img = `/assets/mexnet/${rec.slug}.svg`;
  const where = b.series === "emb" ? "En la Embajada" : "En línea";
  const desc = `${rec.name} recibió el ${title} (${b.metal}) de RGMX Irlanda (Red Global MX Capítulo Irlanda). Constancia verificable emitida por fiveinnolabs.`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${esc(rec.name)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(rec.name)} · ${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://mexnet.pages.dev/ie/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="https://mexnet.pages.dev/favicon.png">
<style>
:root{--bg:#0b0f1a;--card:rgba(255,255,255,.05);--line:rgba(255,255,255,.12);--ink:#f3efe6;--muted:#a9b0c2;--rosa:#ff4fae;--gold:#e3c878;--ok:#5fd6a0;--bad:#ff7a7a;--warn:#ffb45f}
*{box-sizing:border-box}html,body{margin:0}
body{min-height:100vh;background:radial-gradient(1200px 600px at 50% -10%,rgba(228,0,124,.18),transparent 60%),var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.wrap{max-width:560px;margin:0 auto;padding:28px 20px 48px;text-align:center}
.kick{font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--rosa)}
.medal{width:min(300px,72vw);height:auto;margin:22px auto 8px;display:block;filter:drop-shadow(0 24px 40px rgba(0,0,0,.55))}
h1{font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.2;margin:10px 0 4px}
.who{font-family:Georgia,serif;font-style:italic;font-size:22px;color:var(--gold);margin:14px 0 2px}
.meta{color:var(--muted);font-size:14px}
.status{display:flex;align-items:center;justify-content:center;gap:8px;margin:22px auto 0;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--card);font-weight:600;font-size:15px;max-width:420px}
.status svg{width:20px;height:20px;flex:none}.status.ok{color:var(--ok)}.status.bad{color:var(--bad)}.status.warn{color:var(--warn)}
.card{margin:22px auto 0;padding:16px;border-radius:14px;border:1px solid var(--line);background:var(--card);text-align:left;max-width:420px}
.card h2{font-size:15px;margin:0 0 6px}.card p{margin:0 0 10px;color:var(--muted);font-size:14px}
.row{display:flex;gap:8px}input{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(0,0,0,.25);color:var(--ink);font-size:15px}
button{padding:10px 14px;border-radius:10px;border:0;background:linear-gradient(160deg,#ff4fae,#E4007C 55%,#a8005c);color:#fff;font-weight:700;font-size:14px;cursor:pointer}
#own{margin-top:8px;font-size:14px;min-height:1.4em}
.links{margin-top:22px;font-size:13px;color:var(--muted)}.links a{color:var(--ink)}
.foot{margin-top:26px;font-size:12px;color:var(--muted);line-height:1.6}.foot a{color:var(--muted)}
</style></head><body><div class="wrap">
<div class="kick">Constancia digital de participación</div>
<img class="medal" src="${img}" alt="${esc(title)}, ${esc(b.metal)}" width="300" height="300">
<h1>${esc(title)}</h1>
<div class="meta">${esc(b.meeting)} · ${where} · ${esc(b.metal)}</div>
<div class="who">${esc(rec.name)}</div>
<div class="meta">Emitido el ${fecha(rec.issuedDate)} · ID ${esc(rec.ucid)}</div>
<div class="status warn" id="status"><span id="statusIco"></span><span id="statusTxt">Verificando la firma…</span></div>
<div class="card">
  <h2>¿Es de esta persona?</h2>
  <p>El botón va ligado al correo de quien lo recibió, sin publicarlo. Escribe el correo y lo comprobamos aquí, en tu navegador.</p>
  <div class="row"><input id="em" type="email" autocomplete="email" placeholder="correo@ejemplo.com" aria-label="Correo"><button id="chk">Comprobar</button></div>
  <div id="own" aria-live="polite"></div>
</div>
<div class="links"><a href="/${esc(rec.ucid)}/credential.json">credential.json</a> · <a href="/.well-known/issuer-public.json">clave pública</a> · <a href="${KEY_MIRRORS[0]}">copia de la clave</a></div>
<div class="foot">Firmado con Ed25519 (Open Badges 3.0, W3C Verifiable Credentials). Emitido por fiveinnolabs para<br>RGMX Irlanda · Red Global MX Capítulo Irlanda · <a href="https://mexnet.pages.dev/ie/">mexnet.pages.dev</a></div>
</div>
<script type="module">
  import { verifyCredential, multikeyToPublicKey } from '/lib/crypto-core.js';
  const CRED_ID = ${JSON.stringify(rec.ucid)};
  const S=document.getElementById('status'),T=document.getElementById('statusTxt'),I=document.getElementById('statusIco');
  const ICONS={ok:'<svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="#5fd6a0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad:'<svg viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="#ff7a7a" stroke-width="2.5" stroke-linecap="round"/></svg>',
    warn:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01" stroke="#ffb45f" stroke-width="2.5" stroke-linecap="round"/></svg>'};
  function set(k,t){S.className='status '+k;T.textContent=t;I.innerHTML=ICONS[k]||'';}
  let cred=null;
  (async()=>{
    try{
      const r=await fetch('/api/verify/'+encodeURIComponent(CRED_ID)).then(x=>x.json());
      if(!r||!r.found){set('bad','No encontramos esta constancia');return;}
      if(r.status==='revoked'){set('warn','Esta constancia fue revocada');return;}
      cred=r.credential;
      const v=await verifyCredential(r.credential,multikeyToPublicKey(r.publicKeyMultikey));
      set(v.valid?'ok':'bad', v.valid?'Verificado · firma criptográfica auténtica':'Firma no válida: no confíes en esta constancia');
    }catch(e){set('warn','No se pudo completar la verificación');}
  })();
  const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
  document.getElementById('chk').addEventListener('click',async()=>{
    const out=document.getElementById('own');
    const ids=(cred&&cred.credentialSubject&&cred.credentialSubject.identifier)||[];
    const em=document.getElementById('em').value.trim().toLowerCase();
    if(!em||!ids.length){out.textContent='Escribe un correo.';return;}
    for(const id of ids){
      if(id.identityType!=='emailAddress'||!id.hashed)continue;
      const h='sha256$'+hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(em+id.salt)));
      if(h===String(id.identityHash).toLowerCase()){out.style.color='#5fd6a0';out.textContent='Sí: este botón se emitió a ese correo.';return;}
    }
    out.style.color='#ffb45f';out.textContent='No coincide: este botón no se emitió a ese correo.';
  });
</script>
</body></html>`;
}
