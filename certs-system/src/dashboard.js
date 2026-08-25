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
          <div><label>Level</label><select id="level"><option value="1">Level 1 &middot; AI Builder</option><option value="2">Level 2 &middot; Agent Operator</option></select></div>
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
    <h2>Bulk issue</h2>
    <p style="color:var(--dim);font-size:13.5px;line-height:1.6;margin:0 0 12px">
      One row per person: <code style="color:var(--gold)">name,email,cohort,level</code>. A header row is
      detected and skipped. <b>Validate</b> checks every row and writes nothing.
      Anyone who already holds a live credential is skipped automatically, so a run that
      stops halfway can simply be run again.
    </p>
    <textarea id="bulkCsv" spellcheck="false" placeholder="Ada Lovelace,ada@example.com,NCI &middot; Customer Engagement &amp; AI (H9CEAI) 2026,2"
      style="width:100%;min-height:130px;background:var(--surf);color:var(--ink);border:1px solid var(--hair);
             border-radius:10px;padding:12px;font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical"></textarea>
    <div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <button class="btn" id="bulkValidate">Validate</button>
      <button class="btn primary" id="bulkRun" disabled>Issue all</button>
      <button class="btn" id="bulkStop" disabled>Stop</button>
      <label style="display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--dim)">
        <input type="checkbox" id="bulkEmail"> Email each recipient as it is issued
      </label>
      <span style="flex:1"></span>
      <label style="display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--muted)">
        send <input type="number" id="bulkBatch" value="12" min="1" max="200"
          style="width:62px;background:var(--surf);color:var(--ink);border:1px solid var(--hair);border-radius:8px;padding:6px 8px;font:13px ui-monospace,monospace"> at a time
      </label>
      <button class="btn" id="bulkSend">Send emails</button>
      <span id="bulkProgress" style="font-size:13px;color:var(--muted)"></span>
    </div>
    <div id="bulkMsg" class="msg" style="margin-top:10px"></div>
    <div style="overflow-x:auto;margin-top:10px"><table id="bulkTbl"><thead><tr>
      <th>#</th><th>Name</th><th>Email</th><th>Lvl</th><th>Status</th><th>Code</th></tr></thead>
      <tbody id="bulkBody"></tbody></table></div>
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
    cohort:$('cohort').value.trim(),level:Number($('level').value)||1,issuedDate:$('issuedDate').value,sendEmail:$('sendEmail').checked};
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
    $('confirmSummary').innerHTML='<b>'+esc(p.name)+'</b><br>'+esc(p.email)+'<br>Issued '+esc(p.issuedDate)+(p.cohort?(' · '+esc(p.cohort)):'')+'<br><b style="color:var(--gold)">'+esc(p.level===2?'Level 2 · Agent Operator':'Level 1 · AI Builder')+'</b><br>Credential ID: <b style="font-family:monospace;color:var(--gold)">'+esc(PREVIEW_UCID||'—')+'</b><br>'+(p.sendEmail?'✉️ Will email recipient':'No email');
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
      const sendBtn=(c.legacy||c.status==='revoked'||!c.email)?'':'<button class="btn" data-send="'+esc(c.ucid)+'" data-to="'+esc(c.email)+'" style="padding:5px 10px;font-size:12px">Send</button>';
      const revBtn=c.status==='revoked'?'':'<button class="btn danger" data-rev="'+esc(c.ucid)+'" style="padding:5px 10px;font-size:12px">Revoke</button>';
      const delBtn='<button class="btn" data-del="'+esc(c.ucid)+'" data-status="'+esc(c.status||'issued')+'" style="padding:5px 10px;font-size:12px;color:var(--muted2)">Delete</button>';
      const act='<div style="display:flex;gap:6px;justify-content:flex-end">'+sendBtn+revBtn+delBtn+'</div>';
      return '<tr><td><a class="code" href="/'+esc(c.ucid)+'" target="_blank">'+esc(c.ucid)+'</a></td><td>'+esc(c.name)+'</td><td>'+esc(c.issuedDate||'')+'</td><td>'+type+'</td><td>'+st+'</td><td>'+act+'</td></tr>';
    }).join('');
    $('tbody').querySelectorAll('[data-send]').forEach(b=>b.onclick=()=>sendOne(b.getAttribute('data-send'),b.getAttribute('data-to')));
    $('tbody').querySelectorAll('[data-rev]').forEach(b=>b.onclick=()=>revoke(b.getAttribute('data-rev')));
    $('tbody').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>del(b.getAttribute('data-del'),b.getAttribute('data-status')));
  }catch(e){$('count').textContent='error';}
}
function sendOne(code,to){
  openModal('Email '+code+' to '+to+'?','This sends the graduation email with the certificate PDF and badge image attached. It can be sent again later if needed.',async()=>{
    closeModal();
    try{ await api('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ucid:code})});
         openInfo('Sent','The email is on its way to <b>'+esc(to)+'</b>.'); }
    catch(e){ openInfo('Not sent',esc(e.message)); }
  });
}

/* Send the emails for everything the current bulk list has a code for. This is
   the second half of the mint-first sequence: mint with email off, look at real
   credentials, then send in controlled batches. */
$('bulkSend').onclick=async()=>{
  const targets=BULK.filter(r=>r.code && !/^sent/.test(r.status));
  if(!targets.length){ bulkMsg('','Nothing to send. Run Validate, then Issue all.'); return; }
  const n=Math.min(targets.length, Number($('bulkBatch').value)||targets.length);
  if(!confirm('Email '+n+' recipient'+(n===1?'':'s')+' now?\\n\\nThis cannot be unsent.')) return;
  $('bulkSend').disabled=true; $('bulkValidate').disabled=true;
  let sent=0, failed=0;
  for(const r of targets.slice(0,n)){
    r.status='sending…'; bulkRender();
    $('bulkProgress').textContent=(sent+failed+1)+' of '+n;
    try{ await api('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ucid:r.code})});
         r.status='sent'; sent++; }
    catch(e){ r.status='send failed: '+e.message; failed++; }
    bulkRender();
    /* a short gap between messages: 36 near-identical emails into one domain in a
       burst is exactly what an institutional filter is tuned to catch */
    await new Promise(res=>setTimeout(res,2500));
  }
  $('bulkSend').disabled=false; $('bulkValidate').disabled=false; $('bulkProgress').textContent='';
  bulkMsg(failed?'err':'ok', sent+' sent'+(failed?', '+failed+' failed':'. Done.'));
};

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

/* ---------------------------------------------------------------- bulk ---- */
/* Sequential by design. Each issue signs a credential and renders three
   artifacts through Browser Rendering, so running rows in parallel trades a
   complete slow run for a half-finished fast one. */
let BULK=[], BULK_STOP=false, BULK_RUNNING=false;

/* Split a CSV line honouring double quotes, because cohort strings contain commas. */
function csvSplit(line){
  const out=[]; let cur='', q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){ if(q&&line[i+1]==='"'){cur+='"';i++;} else q=!q; }
    else if(c===','&&!q){ out.push(cur); cur=''; }
    else cur+=c;
  }
  out.push(cur);
  return out.map(v=>v.trim());
}

function parseBulk(text){
  const rows=[];
  text.split(/\\r?\\n/).forEach(line=>{
    if(!line.trim()) return;
    const f=csvSplit(line);
    if(/^name$/i.test(f[0]||'')) return;                 /* header */
    const rawLevel=(f[3]||'').trim();
    rows.push({
      name:(f[0]||'').normalize('NFC'),
      email:(f[1]||'').toLowerCase(),
      cohort:(f[2]||'').normalize('NFC'),
      /* No default. An absent or non-numeric level is an error, never a silent
         Level 1 — that would publish a permanent downgrade nobody noticed. */
      level: rawLevel==='' ? null : (/^\\d+$/.test(rawLevel) ? Number(rawLevel) : NaN),
      fields: f.length,
      status:'', code:''
    });
  });
  return rows;
}

function bulkRender(){
  $('bulkBody').innerHTML = BULK.map((r,i)=>{
    const cls = /^issued|^sent/.test(r.status) ? 'color:var(--ok);font-weight:600'
              : /already issued/.test(r.status) ? 'color:var(--gold)'
              : /error|invalid|duplicate/.test(r.status) ? 'color:var(--bad);font-weight:600'
              : 'color:var(--muted)';
    return '<tr><td>'+(i+1)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.email)+'</td><td>'+(r.level==null||isNaN(r.level)?'—':'L'+r.level)+
           '</td><td style="'+cls+'">'+esc(r.status||'—')+'</td><td class="mono">'+
           (r.code?'<a href="/'+r.code+'" target="_blank" style="color:var(--gold)">'+r.code+'</a>':'')+'</td></tr>';
  }).join('');
}

function bulkMsg(kind,text){ const m=$('bulkMsg'); m.className='msg'+(kind?' '+kind:''); m.textContent=text; }

/* Validate writes nothing. It parses, checks each field, and cross-references the
   live credential list so duplicates are visible BEFORE anything is issued. */
$('bulkValidate').onclick=async()=>{
  BULK=parseBulk($('bulkCsv').value);
  if(!BULK.length){ bulkMsg('err','No rows found.'); $('bulkRun').disabled=true; return; }
  let existing={};
  try{
    const r=await api('/api/list');
    (r.credentials||[]).forEach(c=>{ if(c.email&&c.status!=='revoked') existing[c.email.toLowerCase()]=c.ucid; });
  }catch(e){ bulkMsg('err','Could not read existing credentials: '+e.message); return; }

  const seen={}; let ok=0,dup=0,bad=0;
  BULK.forEach(r=>{
    if(r.fields<4){ r.status='too few columns ('+r.fields+')'; bad++; return; }
    if(!r.name||r.name.length<2){ r.status='invalid name'; bad++; return; }
    if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(r.email)){ r.status='invalid email'; bad++; return; }
    if(r.level===null){ r.status='level missing'; bad++; return; }
    if(r.level!==1&&r.level!==2){ r.status='invalid level'; bad++; return; }
    if(seen[r.email]){ r.status='duplicate in CSV'; bad++; return; }
    seen[r.email]=1;
    if(existing[r.email]){ r.status='already issued'; r.code=existing[r.email]; dup++; return; }
    r.status='ready'; ok++;
  });
  bulkRender();
  bulkMsg(bad?'err':'ok', ok+' ready · '+dup+' already issued (will be skipped) · '+bad+' need fixing');
  $('bulkRun').disabled = ok===0 || bad>0;
};

$('bulkStop').onclick=()=>{ BULK_STOP=true; bulkMsg('','Stopping after the current row…'); };

$('bulkRun').onclick=async()=>{
  if(BULK_RUNNING) return;                 /* a second click must not start a second loop */
  const ready=BULK.filter(r=>r.status==='ready');
  if(!ready.length) return;
  const withEmail=$('bulkEmail').checked;
  if(!confirm('Issue '+ready.length+' credential'+(ready.length===1?'':'s')+
              (withEmail?' AND email each recipient':' without sending any email')+'?\\n\\nThis cannot be undone in bulk.')) return;
  BULK_STOP=false; BULK_RUNNING=true;
  $('bulkRun').disabled=true; $('bulkValidate').disabled=true; $('bulkStop').disabled=false;
  const today=new Date().toISOString().slice(0,10);
  let done=0, failed=0;
  for(const r of BULK){
    if(BULK_STOP){ bulkMsg('','Stopped. '+done+' issued. Press Validate then Issue all to resume safely.'); break; }
    if(r.status!=='ready') continue;
    r.status='issuing…'; bulkRender();
    $('bulkProgress').textContent=(done+failed+1)+' of '+ready.length;
    try{
      const res=await api('/api/issue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        name:r.name,email:r.email,cohort:r.cohort,level:r.level,
        issuedDate:today,sendEmail:withEmail
      })});
      r.code=res.ucid; r.status=res.emailed?'issued + emailed':'issued'; done++;
    }catch(e){
      /* 409 is the duplicate guard doing its job, not a failure. */
      if(/already_issued/.test(e.message)){ r.status='already issued'; }
      else { r.status='error: '+e.message; failed++; }
    }
    bulkRender();
  }
  BULK_RUNNING=false;
  $('bulkValidate').disabled=false; $('bulkStop').disabled=true; $('bulkProgress').textContent='';
  if(!BULK_STOP) bulkMsg(failed?'err':'ok', done+' issued'+(failed?', '+failed+' failed — fix and press Validate again':'. Done.'));
  loadList();
};


</script>
</body></html>`;
}
