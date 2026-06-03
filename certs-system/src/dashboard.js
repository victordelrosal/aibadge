// dashboard.js — issuer-only console at certs.fiveinnolabs.com/issue.
// Google sign-in, hard-gated to victordelrosal@gmail.com (also enforced server-side
// on every /api call). Multi-step confirmation before any official issuance.

export function dashboardPage(cfg) {
  const FB = JSON.stringify(cfg);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Issuer Console · The AI Badge</title>
<meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/assets/emblem.png">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Cormorant+Garamond:wght@700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--gold:#d8bd78;--gold-soft:rgba(216,189,120,.16);--lapis:#6ea0ec;--ink:#eef2ff;--muted:#9aa6c8;
    --muted2:#6c789e;--hair:rgba(255,255,255,.10);--ok:#5fd6a0;--bad:#ff7a7a;--surf:rgba(255,255,255,.03)}
  body{font-family:Inter,system-ui,sans-serif;color:var(--ink);min-height:100vh;
    background:radial-gradient(120% 80% at 50% -10%,rgba(110,160,236,.12),transparent 55%),linear-gradient(165deg,#0a1230,#04060f);
    background-attachment:fixed;-webkit-font-smoothing:antialiased}
  a{color:var(--lapis)}
  nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--hair)}
  nav .brand{display:flex;align-items:center;gap:10px;font-weight:600}
  nav .brand .dot{width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 10px var(--gold)}
  nav .who{font-size:13px;color:var(--muted)}
  .btn{display:inline-flex;align-items:center;gap:8px;font:inherit;font-weight:600;font-size:14px;padding:11px 18px;
    border-radius:12px;border:1px solid var(--hair);color:var(--ink);background:var(--surf);cursor:pointer;transition:.16s}
  .btn:hover{border-color:var(--gold-soft);background:rgba(255,255,255,.06)}
  .btn:disabled{opacity:.4;cursor:not-allowed}
  .btn.primary{background:var(--gold);color:#1a1405;border-color:transparent}
  .btn.danger{color:var(--bad);border-color:rgba(255,122,122,.3)}
  .btn.gold-ghost{border-color:var(--gold-soft);color:var(--gold)}
  .wrap{max-width:1040px;margin:0 auto;padding:26px 22px 80px}
  .gate{max-width:420px;margin:12vh auto;text-align:center}
  .gate img{width:120px;filter:drop-shadow(0 12px 30px rgba(0,0,0,.5))}
  .gate h1{font-family:"Cormorant Garamond",serif;font-size:36px;margin:16px 0 6px}
  .gate p{color:var(--muted);margin-bottom:22px}
  .hidden{display:none!important}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  @media(max-width:840px){.grid{grid-template-columns:1fr}}
  .panel{background:var(--surf);border:1px solid var(--hair);border-radius:18px;padding:22px}
  .panel h2{font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:16px}
  label{display:block;font-size:13px;color:var(--muted);margin:14px 0 6px;font-weight:500}
  input[type=text],input[type=email],input[type=date],select{width:100%;padding:11px 13px;border-radius:11px;
    border:1px solid var(--hair);background:rgba(0,0,0,.2);color:var(--ink);font:inherit;font-size:15px}
  input:focus,select:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px var(--gold-soft)}
  .row{display:flex;gap:12px}.row>*{flex:1}
  .check{display:flex;align-items:flex-start;gap:9px;margin-top:14px;font-size:14px;color:var(--ink)}
  .check input{margin-top:3px}
  .preview-box{aspect-ratio:1;border-radius:14px;border:1px solid var(--hair);background:rgba(0,0,0,.25);
    display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--muted2);text-align:center;font-size:14px}
  .preview-box img{width:100%;height:100%;object-fit:contain}
  .steps{display:flex;gap:6px;margin-bottom:18px}
  .step{flex:1;height:4px;border-radius:2px;background:var(--hair)}
  .step.on{background:var(--gold)}
  .msg{font-size:14px;margin-top:12px;min-height:20px}
  .msg.err{color:var(--bad)}.msg.ok{color:var(--ok)}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--hair)}
  th{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted2)}
  td .code{font-family:"JetBrains Mono",monospace;color:var(--gold)}
  .pill{font-size:11px;padding:3px 9px;border-radius:999px;border:1px solid var(--hair)}
  .pill.issued{color:var(--ok);border-color:rgba(95,214,160,.3)}
  .pill.revoked{color:var(--bad);border-color:rgba(255,122,122,.3)}
  .pill.legacy{color:var(--gold);border-color:var(--gold-soft)}
  .modal-bg{position:fixed;inset:0;background:rgba(2,4,10,.7);display:flex;align-items:center;justify-content:center;z-index:20;padding:20px}
  .modal{background:#0c142e;border:1px solid var(--hair);border-radius:18px;padding:26px;max-width:440px;width:100%}
  .modal h3{font-size:20px;margin-bottom:10px}.modal p{color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:18px}
  .modal .acts{display:flex;gap:10px;justify-content:flex-end}
  .success{text-align:center;padding:10px}
  .success .code{font-family:"JetBrains Mono",monospace;font-size:40px;color:var(--gold);letter-spacing:.1em;margin:10px 0}
</style></head><body>
<nav>
  <div class="brand"><span class="dot"></span>Issuer Console · The AI Badge</div>
  <div style="display:flex;align-items:center;gap:14px"><span class="who" id="who"></span><button class="btn hidden" id="signout">Sign out</button></div>
</nav>

<div id="gate" class="gate">
  <img src="/assets/emblem.png" alt="">
  <h1>Issuer Console</h1>
  <p>Restricted. Only the AI Badge issuer can sign in.</p>
  <button class="btn primary" id="signin">Sign in with Google</button>
  <div class="msg err" id="gateMsg"></div>
</div>

<div id="app" class="wrap hidden">
  <div class="grid">
    <div class="panel">
      <h2>Issue an AI Badge</h2>
      <div class="steps"><div class="step on" id="s1"></div><div class="step" id="s2"></div><div class="step" id="s3"></div></div>

      <div id="form">
        <label>Recipient full name</label>
        <input type="text" id="name" placeholder="Heather O'Malley" autocomplete="off">
        <label>Recipient email</label>
        <input type="email" id="email" placeholder="heather@example.com" autocomplete="off">
        <div class="row">
          <div><label>Cohort (optional)</label><input type="text" id="cohort" placeholder="2026"></div>
          <div><label>Date issued</label><input type="date" id="issuedDate"></div>
        </div>
        <label class="check"><input type="checkbox" id="sendEmail" checked><span>Email the recipient their badge from victor@fiveinnolabs.com</span></label>
        <div style="margin-top:18px"><button class="btn primary" id="previewBtn">Preview badge →</button></div>
        <div class="msg" id="formMsg"></div>
      </div>

      <div id="confirm" class="hidden">
        <p style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:8px">Review the preview carefully. To issue, re-type the recipient's full name exactly.</p>
        <div id="confirmSummary" style="font-size:14px;line-height:1.8;margin-bottom:10px"></div>
        <label>Re-type recipient full name to confirm</label>
        <input type="text" id="confirmName" placeholder="Type the name exactly" autocomplete="off">
        <label class="check"><input type="checkbox" id="confirmCheck"><span>I confirm the name, email and date are correct. This issues an official, permanent credential.</span></label>
        <div style="margin-top:18px;display:flex;gap:10px">
          <button class="btn" id="backBtn">← Back</button>
          <button class="btn primary" id="issueBtn" disabled>Issue official badge</button>
        </div>
        <div class="msg" id="confirmMsg"></div>
      </div>

      <div id="done" class="hidden success">
        <div style="color:var(--ok);font-weight:600;font-size:18px">✓ Badge issued</div>
        <div class="code" id="doneCode"></div>
        <div id="doneLinks" style="font-size:14px;line-height:2"></div>
        <div style="margin-top:18px"><button class="btn" id="againBtn">Issue another</button></div>
      </div>
    </div>

    <div class="panel">
      <h2>Live preview</h2>
      <div class="preview-box" id="previewBox">Fill the form and click <b style="color:var(--gold);margin:0 4px">Preview badge</b> to render.</div>
      <div id="previewLinks" style="margin-top:12px;font-size:13px;display:flex;gap:14px"></div>
    </div>
  </div>

  <div class="panel" style="margin-top:22px">
    <h2>Issued &amp; legacy credentials (<span id="count">…</span>)</h2>
    <div style="overflow-x:auto"><table id="tbl"><thead><tr><th>Code</th><th>Name</th><th>Issued</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody id="tbody"></tbody></table></div>
  </div>
</div>

<div id="modalRoot"></div>

<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script>
const ISSUER_EMAIL="victordelrosal@gmail.com";
firebase.initializeApp(${FB});
const auth=firebase.auth();
let TOKEN=null;
const $=id=>document.getElementById(id);
const gate=$('gate'),app=$('app');

$('signin').onclick=async()=>{
  const p=new firebase.auth.GoogleAuthProvider();
  try{await auth.signInWithPopup(p);}catch(e){$('gateMsg').textContent=e.message;}
};
$('signout').onclick=()=>auth.signOut();

auth.onAuthStateChanged(async u=>{
  if(u&&u.email===ISSUER_EMAIL&&u.emailVerified){
    TOKEN=await u.getIdToken();
    $('who').textContent=u.email;$('signout').classList.remove('hidden');
    gate.classList.add('hidden');app.classList.remove('hidden');
    $('issuedDate').value=new Date().toISOString().slice(0,10);
    loadList();
  }else{
    gate.classList.remove('hidden');app.classList.add('hidden');$('signout').classList.add('hidden');$('who').textContent='';
    if(u&&u.email!==ISSUER_EMAIL){$('gateMsg').textContent='That account is not authorised to issue badges.';auth.signOut();}
  }
});

async function api(path,opts={}){
  const t=await auth.currentUser.getIdToken();
  const r=await fetch(path,{...opts,headers:{...(opts.headers||{}),'Authorization':'Bearer '+t}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
  return j;
}

let PREVIEW_UCID=null;
function payload(){
  return {name:$('name').value.trim(),email:$('email').value.trim(),
    cohort:$('cohort').value.trim(),issuedDate:$('issuedDate').value,sendEmail:$('sendEmail').checked};
}
function setStep(n){$('s1').className='step'+(n>=1?' on':'');$('s2').className='step'+(n>=2?' on':'');$('s3').className='step'+(n>=3?' on':'');}

$('previewBtn').onclick=async()=>{
  const p=payload();
  if(!p.name||!p.email||!p.issuedDate){$('formMsg').className='msg err';$('formMsg').textContent='Name, email and date are required.';return;}
  $('previewBtn').disabled=true;$('formMsg').className='msg';$('formMsg').textContent='Rendering preview…';
  $('previewBox').textContent='Rendering…';
  try{
    const r=await api('/api/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
    PREVIEW_UCID=r.ucid||null;
    $('previewBox').innerHTML='<img src="'+r.badge+'" alt="preview">';
    $('previewLinks').innerHTML='<a href="'+r.pdf+'" target="_blank">Open PDF preview ↗</a><a href="'+r.og+'" target="_blank">Social image ↗</a>';
    $('formMsg').textContent='';
    // go to confirm step
    $('form').classList.add('hidden');$('confirm').classList.remove('hidden');setStep(2);
    $('confirmSummary').innerHTML='<b>'+esc(p.name)+'</b><br>'+esc(p.email)+'<br>Issued '+esc(p.issuedDate)+(p.cohort?(' · '+esc(p.cohort)):'')+'<br>Credential ID: <b style="font-family:monospace;color:var(--gold)">'+esc(PREVIEW_UCID||'—')+'</b><br>'+(p.sendEmail?'✉️ Will email recipient':'No email');
  }catch(e){$('previewBox').textContent='Preview failed';$('formMsg').className='msg err';$('formMsg').textContent=e.message;}
  finally{$('previewBtn').disabled=false;}
};

$('backBtn').onclick=()=>{$('confirm').classList.add('hidden');$('form').classList.remove('hidden');setStep(1);$('confirmName').value='';$('confirmCheck').checked=false;$('issueBtn').disabled=true;};
function checkConfirm(){const p=payload();$('issueBtn').disabled=!($('confirmName').value.trim()===p.name&&$('confirmCheck').checked);}
$('confirmName').oninput=checkConfirm;$('confirmCheck').onchange=checkConfirm;

$('issueBtn').onclick=()=>{
  const p=payload();
  openModal('Issue official badge?','This creates a permanent, signed credential for <b>'+esc(p.name)+'</b>'+(p.sendEmail?(' and emails it to <b>'+esc(p.email)+'</b>'):'')+'. This cannot be undone (only revoked).',async()=>{
    closeModal();$('confirmMsg').className='msg';$('confirmMsg').textContent='Issuing…';setStep(3);$('issueBtn').disabled=true;
    try{
      const r=await api('/api/issue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...p,ucid:PREVIEW_UCID||undefined})});
      $('confirm').classList.add('hidden');$('done').classList.remove('hidden');
      $('doneCode').textContent=r.ucid;
      $('doneLinks').innerHTML='<a href="'+r.url+'" target="_blank">'+r.url.replace('https://','')+' ↗</a><br>'+(r.emailed?'✉️ Emailed to recipient':'(no email sent)');
      loadList();
    }catch(e){$('confirmMsg').className='msg err';$('confirmMsg').textContent=e.message;$('issueBtn').disabled=false;}
  });
};
$('againBtn').onclick=()=>{
  $('done').classList.add('hidden');$('form').classList.remove('hidden');setStep(1);
  ['name','email','cohort','confirmName'].forEach(id=>$(id).value='');$('confirmCheck').checked=false;$('issueBtn').disabled=true;
  $('previewBox').textContent='Fill the form and click Preview badge to render.';$('previewLinks').innerHTML='';
};

async function loadList(){
  try{
    const r=await api('/api/list');
    $('count').textContent=r.credentials.length;
    $('tbody').innerHTML=r.credentials.map(c=>{
      const type=c.legacy?'<span class="pill legacy">'+(esc(c.source||'legacy'))+'</span>':'AI Badge';
      const st='<span class="pill '+(c.status==='revoked'?'revoked':(c.legacy?'legacy':'issued'))+'">'+(c.status==='revoked'?'revoked':(c.legacy?'legacy':'issued'))+'</span>';
      const revBtn=c.status==='revoked'?'':'<button class="btn danger" data-rev="'+esc(c.ucid)+'" style="padding:5px 10px;font-size:12px">Revoke</button>';
      const delBtn='<button class="btn" data-del="'+esc(c.ucid)+'" data-status="'+esc(c.status||'issued')+'" style="padding:5px 10px;font-size:12px;color:var(--muted2)">Delete</button>';
      const act='<div style="display:flex;gap:6px;justify-content:flex-end">'+revBtn+delBtn+'</div>';
      return '<tr><td><a class="code" href="/'+esc(c.ucid)+'" target="_blank">'+esc(c.ucid)+'</a></td><td>'+esc(c.name)+'</td><td>'+esc(c.issuedDate||'')+'</td><td>'+type+'</td><td>'+st+'</td><td>'+act+'</td></tr>';
    }).join('');
    $('tbody').querySelectorAll('[data-rev]').forEach(b=>b.onclick=()=>revoke(b.getAttribute('data-rev')));
    $('tbody').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(b.getAttribute('data-del'),b.getAttribute('data-status')));
  }catch(e){$('count').textContent='error';}
}
function revoke(code){
  openModal('Revoke '+code+'?','The credential will show as revoked and fail verification. Artifacts remain but the badge is marked invalid.',async()=>{
    closeModal();try{await api('/api/revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ucid:code})});loadList();}catch(e){alert(e.message);}
  });
}
function del(code,status){
  if(status!=='revoked'){
    openInfo('Revoke first','You must <b>revoke</b> '+esc(code)+' before it can be deleted. Click <b>Revoke</b>, then <b>Delete</b>. This two-step guard prevents accidental loss.');
    return;
  }
  openModal('Delete '+code+' permanently?','This <b>wipes</b> the credential and all its files (badge, certificate, social image, signed record) from the system. This cannot be undone.',async()=>{
    closeModal();try{await api('/api/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ucid:code})});loadList();}catch(e){alert(e.message);}
  });
}

function openModal(title,body,onYes){
  $('modalRoot').innerHTML='<div class="modal-bg"><div class="modal"><h3></h3><p></p><div class="acts"><button class="btn" id="mNo">Cancel</button><button class="btn primary" id="mYes">Confirm</button></div></div></div>';
  $('modalRoot').querySelector('h3').textContent=title;
  $('modalRoot').querySelector('p').innerHTML=body;
  $('mNo').onclick=closeModal;$('mYes').onclick=onYes;
}
function openInfo(title,body){
  $('modalRoot').innerHTML='<div class="modal-bg"><div class="modal"><h3></h3><p></p><div class="acts"><button class="btn primary" id="mOk">Got it</button></div></div></div>';
  $('modalRoot').querySelector('h3').textContent=title;
  $('modalRoot').querySelector('p').innerHTML=body;
  $('mOk').onclick=closeModal;
}
function closeModal(){$('modalRoot').innerHTML='';}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
</script>
</body></html>`;
}
