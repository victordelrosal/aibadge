/* Fair membership on AI Badge (14 Oct 2026, Victor: "implement the system you outlined").
   Loaded by index.html ONLY after the worker answered show:true for this signed-in account. The worker
   never answers true for NCI accounts, accounts with any NCI marker, or accounts created before launch
   (unless Victor allow-listed the address), so active NCI students never download this file.

   What it does: replaces the "Unlock the full path" modal with a pay-what's-fair sheet, adds a small
   membership card to the dashboard, records learning activity (a lesson opened) so billing can pause by
   itself after 30 idle days, and handles the return from Stripe Checkout. */
(function () {
  if (window.__fairLoaded) return;
  window.__fairLoaded = true;

  var API = 'https://aibadge-report-mailer.victordelrosal.workers.dev/api/fair';
  var state = window.__fairStatus || { show: false };
  if (!state.show) return;
  var SUGGESTED = state.suggestedCents || 2490, FLOOR = state.floorCents || 500, MAX = state.maxCents || 50000;
  var CHIPS = [500, 1200, 2490];

  function money(c) { return '\u20ac' + (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2)); }
  function dateStr(v) { return v ? new Date(v).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  async function call(path, body) {
    var u = firebase.auth().currentUser;
    if (!u) throw new Error('Sign in again.');
    var opts = { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + await u.getIdToken() } };
    if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    var r = await fetch(API + '/' + path, opts);
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || 'Something went wrong. Please try again.');
    return j;
  }

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.fm-scrim{position:fixed;inset:0;z-index:10000;background:rgba(0,0,30,.46);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px;animation:fm-fade .18s ease-out}',
    '.fm-sheet{position:relative;width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#000036;border-radius:22px;padding:30px 26px 22px;box-shadow:0 30px 80px rgba(0,0,40,.28),0 2px 8px rgba(0,0,40,.08);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;animation:fm-rise .22s cubic-bezier(.2,.8,.2,1)}',
    '@keyframes fm-fade{from{opacity:0}to{opacity:1}}@keyframes fm-rise{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){.fm-scrim,.fm-sheet,.fm-card{animation:none}}',
    '.fm-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;border:none;background:rgba(120,120,128,.12);color:#3c3c43;font-size:18px;cursor:pointer}',
    '.fm-x:hover{background:rgba(120,120,128,.2)}',
    '.fm-eyebrow{font:700 11px/1 -apple-system,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9a6b00;margin:0 0 10px}',
    '.fm-h{font:700 26px/1.15 -apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;letter-spacing:-.02em;margin:0 0 8px}',
    '.fm-sub{font:400 15px/1.5 -apple-system,sans-serif;color:rgba(60,60,67,.75);margin:0 0 20px}',
    '.fm-chips{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 10px}',
    '.fm-chip{position:relative;min-height:56px;border-radius:14px;border:1.5px solid rgba(60,60,67,.16);background:#fff;color:#000036;font:600 16px/1.1 -apple-system,sans-serif;cursor:pointer;padding:8px 4px;transition:border-color .15s,box-shadow .15s,transform .12s}',
    '.fm-chip:hover{border-color:rgba(0,122,255,.5)}.fm-chip:active{transform:scale(.97)}',
    '.fm-chip[aria-pressed="true"]{border-color:#007AFF;box-shadow:0 0 0 3px rgba(0,122,255,.14);background:rgba(0,122,255,.04)}',
    '.fm-chip small{display:block;margin-top:4px;font:600 10px/1 -apple-system,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#9a6b00}',
    '.fm-other{display:none;align-items:center;gap:8px;margin:0 0 10px;padding:0 14px;height:52px;border-radius:14px;border:1.5px solid #007AFF;box-shadow:0 0 0 3px rgba(0,122,255,.14)}',
    '.fm-other.on{display:flex}.fm-other span{font:600 18px -apple-system,sans-serif;color:#3c3c43}',
    '.fm-other input{flex:1;border:none;outline:none;font:600 18px -apple-system,sans-serif;color:#000036;background:transparent;min-width:0}',
    '.fm-total{display:flex;align-items:baseline;gap:6px;margin:14px 0 18px}',
    '.fm-total b{font:700 34px/1 -apple-system,"SF Pro Display",sans-serif;letter-spacing:-.02em;font-variant-numeric:tabular-nums}',
    '.fm-total span{font:400 15px -apple-system,sans-serif;color:rgba(60,60,67,.7)}',
    '.fm-promises{list-style:none;margin:0 0 16px;padding:14px 16px;border-radius:16px;background:#f5f6fa;display:grid;gap:10px}',
    '.fm-promises li{display:grid;grid-template-columns:22px 1fr;gap:10px;font:400 14px/1.45 -apple-system,sans-serif;color:#2a2f3d}',
    '.fm-promises svg{width:20px;height:20px;color:#007AFF;margin-top:1px}',
    '.fm-promises b{color:#000036;font-weight:600}',
    '.fm-how{margin:0 0 16px;font:400 13.5px/1.55 -apple-system,sans-serif;color:rgba(60,60,67,.8)}',
    '.fm-how summary{cursor:pointer;color:#007AFF;font-weight:500;list-style:none;padding:4px 0}.fm-how summary::-webkit-details-marker{display:none}',
    '.fm-how ul{margin:8px 0 0;padding-left:18px}.fm-how li{margin:5px 0}',
    '.fm-decl{display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:start;margin:0 0 16px;font:400 13.5px/1.45 -apple-system,sans-serif;color:#3c3c43;cursor:pointer}',
    '.fm-decl input{width:20px;height:20px;margin:1px 0 0;accent-color:#007AFF}',
    '.fm-cta{display:block;width:100%;min-height:52px;padding:14px;border:none;border-radius:14px;font:700 16px/1.3 -apple-system,sans-serif;color:#0A0E27;background:linear-gradient(135deg,#B8860B 0%,#D4AF37 50%,#F5E7A0 100%);box-shadow:0 6px 22px rgba(212,175,55,.38);cursor:pointer;transition:transform .12s,opacity .15s}',
    '.fm-cta:active{transform:scale(.985)}.fm-cta[disabled]{opacity:.45;cursor:default;box-shadow:none}',
    '.fm-blue{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 18px;border-radius:12px;border:none;background:#007AFF;color:#fff;font:600 15px -apple-system,sans-serif;cursor:pointer}',
    '.fm-ghost{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border:none;background:none;color:#007AFF;font:500 15px -apple-system,sans-serif;cursor:pointer}',
    '.fm-ghost.red{color:#d70015}',
    '.fm-later{display:block;margin:6px auto 0}',
    '.fm-err:empty{display:none}.fm-err{margin:10px 0 0;font:500 13.5px/1.4 -apple-system,sans-serif;color:#d70015;text-align:center}',
    '.fm-note{font:400 12.5px/1.5 -apple-system,sans-serif;color:rgba(60,60,67,.6);text-align:center;margin:12px 0 0}',
    '.fm-card{margin:18px 0 6px;padding:18px 18px 14px;border-radius:18px;background:#fff;border:1px solid rgba(0,0,54,.08);box-shadow:0 1px 3px rgba(0,0,40,.05),0 8px 28px rgba(0,0,40,.05);font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#000036;animation:fm-rise .22s ease-out}',
    '.fm-card p.fm-eyebrow{margin:0 0 8px;font:700 11px/1 -apple-system,sans-serif;letter-spacing:.14em;color:#9a6b00}',
    '.fm-actions > .fm-ghost:first-child{padding-left:0}',
    '.fm-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
    '.fm-card h3{margin:0;font:700 18px/1.3 -apple-system,sans-serif}',
    '.fm-card p{margin:4px 0 0;font:400 14px/1.5 -apple-system,sans-serif;color:rgba(60,60,67,.75)}',
    '.fm-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font:600 12px/1 -apple-system,sans-serif;background:rgba(52,199,89,.14);color:#1f7a3a;vertical-align:2px;margin-left:6px}',
    '.fm-pill.paused{background:rgba(120,120,128,.14);color:#3c3c43}.fm-pill.ending{background:rgba(255,149,0,.15);color:#9a5a00}',
    '.fm-actions{display:flex;gap:4px;flex-wrap:wrap;margin-top:10px;align-items:center}',
    '.fm-invite{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between}',
    '.fm-nav{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:999px;border:1.5px solid #D4AF37;background:linear-gradient(135deg,rgba(212,175,55,.18),rgba(245,231,160,.10));color:#F5E7A0;font:700 14px/1 -apple-system,sans-serif;cursor:pointer;white-space:nowrap;flex:0 0 auto;transition:transform .12s,box-shadow .15s}',
    '.fm-nav:hover{box-shadow:0 0 0 4px rgba(212,175,55,.18),0 6px 20px rgba(212,175,55,.3)}.fm-nav:active{transform:scale(.96)}',
    '.fm-nav i{width:8px;height:8px;border-radius:50%;background:#D4AF37;box-shadow:0 0 0 3px rgba(212,175,55,.28);animation:fm-pulse 2.4s ease-in-out infinite}',
    '@keyframes fm-pulse{50%{box-shadow:0 0 0 6px rgba(212,175,55,0)}}@media (prefers-reduced-motion:reduce){.fm-nav i{animation:none}}',
    '#view-dashboard:not(.lms-dark) .fm-nav{color:#7a5600;background:linear-gradient(135deg,rgba(212,175,55,.16),rgba(245,231,160,.30))}',
    '.fm-nav .fm-s{display:none}@media (max-width:640px){.fm-nav .fm-l{display:none}.fm-nav .fm-s{display:inline}.fm-nav{padding:0 12px;gap:6px}}',
    '.fm-hero{margin:22px 0 8px;border-radius:22px;padding:2px;background:linear-gradient(135deg,#D4AF37,#F5E7A0 40%,#B8860B);box-shadow:0 18px 50px rgba(0,0,54,.18);animation:fm-rise .25s ease-out}',
    '.fm-hero-in{border-radius:20px;padding:26px 24px 22px;color:#fff;background:radial-gradient(120% 140% at 100% 0%,rgba(212,175,55,.22),transparent 55%),linear-gradient(160deg,#0A0E5A 0%,#000036 70%);font-family:-apple-system,BlinkMacSystemFont,sans-serif}',
    '.fm-hero-eye{margin:0 0 10px;font:700 11px/1 -apple-system,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#E8C766}',
    '.fm-hero h3{margin:0 0 8px;font:700 24px/1.2 -apple-system,"SF Pro Display",sans-serif;letter-spacing:-.02em;color:#fff}',
    '.fm-hero-in > p:not(.fm-hero-eye):not(.fm-hero-note){margin:0 0 18px;font:400 15px/1.55 -apple-system,sans-serif;color:rgba(255,255,255,.78);max-width:52ch}',
    '.fm-hero-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}',
    '.fm-hero-row span{font:400 13px/1.4 -apple-system,sans-serif;color:rgba(255,255,255,.62)}',
    '.fm-hero-cta{display:inline-block;width:auto;padding:13px 22px;min-height:48px}',
    '.fm-hero-note{margin:14px 0 0;font:500 12.5px/1.4 -apple-system,sans-serif;color:#E8C766}',
    '.fm-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:10001;background:#000036;color:#fff;padding:13px 18px;border-radius:14px;font:500 15px/1.4 -apple-system,sans-serif;box-shadow:0 12px 40px rgba(0,0,40,.3);max-width:calc(100% - 32px);animation:fm-rise .2s ease-out}',
    '.lms-dark .fm-card{background:#1c1c24;border-color:rgba(255,255,255,.08);color:#f5f5f5}.lms-dark .fm-card p{color:rgba(235,235,245,.65)}',
    '@media (max-width:420px){.fm-sheet{padding:26px 18px 18px}.fm-h{font-size:23px}.fm-chips{grid-template-columns:repeat(2,1fr)}}'
  ].join('\n');
  document.head.appendChild(css);

  var ICON = {
    pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>'
  };

  function toast(msg) {
    var t = document.createElement('div'); t.className = 'fm-toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4200);
  }

  function openSheet(html, onMount) {
    closeSheet();
    var scrim = document.createElement('div');
    scrim.className = 'fm-scrim'; scrim.id = 'fm-scrim';
    scrim.innerHTML = '<div class="fm-sheet" role="dialog" aria-modal="true" aria-labelledby="fm-title"><button class="fm-x" aria-label="Close">&times;</button>' + html + '</div>';
    scrim.addEventListener('click', function (e) { if (e.target === scrim) closeSheet(); });
    scrim.querySelector('.fm-x').onclick = closeSheet;
    document.body.appendChild(scrim);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', escClose);
    if (onMount) onMount(scrim);
    var first = scrim.querySelector('[aria-pressed="true"]') || scrim.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }
  function closeSheet() {
    var s = document.getElementById('fm-scrim'); if (s) s.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeSheet(); }

  /* price picker shared by join and change */
  function pickerHtml(current) {
    var custom = CHIPS.indexOf(current) < 0;
    return '<div class="fm-chips" role="group" aria-label="Your monthly price">' +
      CHIPS.map(function (c) {
        return '<button type="button" class="fm-chip" data-c="' + c + '" aria-pressed="' + (!custom && c === current) + '">' + money(c) + (c === SUGGESTED ? '<small>Suggested</small>' : '') + '</button>';
      }).join('') +
      '<button type="button" class="fm-chip" data-c="other" aria-pressed="' + custom + '">Other</button></div>' +
      '<label class="fm-other' + (custom ? ' on' : '') + '"><span>\u20ac</span><input inputmode="decimal" aria-label="Your own monthly price in euro" placeholder="Your price" value="' + (custom ? (current / 100).toFixed(2) : '') + '"></label>' +
      '<div class="fm-total" aria-live="polite"><b class="fm-amt">' + money(current) + '</b><span>a month</span></div>';
  }
  function wirePicker(root, initial, onChange) {
    var cents = initial;
    var other = root.querySelector('.fm-other'), input = other.querySelector('input'), amt = root.querySelector('.fm-amt');
    function set(c) { cents = c; amt.textContent = c ? money(c) : '\u20ac \u2013'; onChange(c); }
    root.querySelectorAll('.fm-chip').forEach(function (b) {
      b.onclick = function () {
        root.querySelectorAll('.fm-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (b.dataset.c === 'other') { other.classList.add('on'); input.focus(); readInput(); }
        else { other.classList.remove('on'); set(Number(b.dataset.c)); }
      };
    });
    function readInput() {
      var v = Math.round(parseFloat(String(input.value).replace(',', '.')) * 100);
      set(Number.isFinite(v) && v >= FLOOR && v <= MAX ? v : 0);
    }
    input.addEventListener('input', readInput);
    onChange(cents);
  }

  /* ---------- the join sheet (replaces "Unlock the full path") ---------- */
  function openJoin() {
    var cents = SUGGESTED;
    openSheet(
      '<p class="fm-eyebrow">AI Badge membership</p>' +
      '<h2 class="fm-h" id="fm-title">Pay what&rsquo;s fair</h2>' +
      '<p class="fm-sub">Every lesson and the full path to your badge. You choose the price.</p>' +
      pickerHtml(cents) +
      '<ul class="fm-promises">' +
        '<li>' + ICON.pause + '<span><b>Life happens.</b> If you don&rsquo;t open a lesson for 30 days, billing pauses by itself. Nothing is charged while you&rsquo;re away.</span></li>' +
        '<li>' + ICON.hand + '<span><b>You approve every change.</b> Your price only moves when you say so. Cancel in one tap.</span></li>' +
        '<li>' + ICON.door + '<span><b>XP is earned, never bought.</b> It comes from your quests, exercises and builds. Your badges stay yours.</span></li>' +
      '</ul>' +
      '<details class="fm-how"><summary>How it works</summary><ul>' +
        '<li>Billed monthly by Stripe at the price you choose, from \u20ac5 to \u20ac500.</li>' +
        '<li>No lesson opened for 30 days: billing pauses and we email you. When you come back, you decide whether to resume.</li>' +
        '<li>Price changes start from your next payment and only happen when you confirm them. About once a quarter we may suggest a change, up or down, based on how much you used AI Badge.</li>' +
        '<li>Cancel from your dashboard at any time. Access runs to the end of the month you paid for.</li>' +
        '<li>Your price keeps AI Badge running (AI compute and servers) and keeps new lessons coming.</li>' +
      '</ul></details>' +
      '<label class="fm-decl"><input type="checkbox" class="fm-ok"><span>I&rsquo;m not currently a student in a module Victor del Rosal teaches or marks. Those students get access through their class and can&rsquo;t pay, so marking stays fair.</span></label>' +
      '<button class="fm-cta" disabled>Continue</button>' +
      '<p class="fm-err" role="alert"></p>' +
      '<button class="fm-ghost fm-later">Keep exploring the free lessons</button>' +
      '<p class="fm-note">Secure checkout by Stripe. Prices in euro.</p>',
      function (root) {
        var cta = root.querySelector('.fm-cta'), ok = root.querySelector('.fm-ok'), err = root.querySelector('.fm-err');
        function sync() {
          cta.disabled = !(cents && ok.checked);
          cta.textContent = cents ? 'Continue \u00b7 ' + money(cents) + ' a month' : 'Choose \u20ac5 to \u20ac500';
        }
        wirePicker(root, cents, function (c) { cents = c; sync(); });
        ok.onchange = sync;
        root.querySelector('.fm-later').onclick = closeSheet;
        cta.onclick = async function () {
          err.textContent = ''; cta.disabled = true; cta.textContent = 'Opening secure checkout\u2026';
          try {
            var r = await call('checkout', { amountCents: cents, declaration: true });
            location.href = r.checkoutUrl;
          } catch (e) { err.textContent = e.message; sync(); }
        };
      });
  }

  /* ---------- change price ---------- */
  function openChange(member, hint) {
    var cents = member.amountCents;
    openSheet(
      '<p class="fm-eyebrow">Your membership</p>' +
      '<h2 class="fm-h" id="fm-title">Change your price</h2>' +
      '<p class="fm-sub">' + (hint || 'You pay ' + money(member.amountCents) + ' a month now. A new price starts from your next payment.') + '</p>' +
      pickerHtml(cents) +
      '<button class="fm-cta" disabled>Confirm</button><p class="fm-err" role="alert"></p>' +
      '<button class="fm-ghost fm-later">Keep ' + money(member.amountCents) + '</button>',
      function (root) {
        var cta = root.querySelector('.fm-cta'), err = root.querySelector('.fm-err');
        wirePicker(root, cents, function (c) {
          cents = c;
          cta.disabled = !c || c === member.amountCents;
          cta.textContent = !c ? 'Choose \u20ac5 to \u20ac500' : (c === member.amountCents ? 'That is your price now' : 'Confirm ' + money(c) + ' a month');
        });
        root.querySelector('.fm-later').onclick = closeSheet;
        cta.onclick = async function () {
          err.textContent = ''; cta.disabled = true; cta.textContent = 'Saving\u2026';
          try {
            var r = await call('change', { amountCents: cents, confirm: true });
            apply(r.member); closeSheet(); toast('Done. From your next payment you pay ' + money(cents) + ' a month.');
          } catch (e) { err.textContent = e.message; cta.disabled = false; cta.textContent = 'Confirm ' + money(cents) + ' a month'; }
        };
      });
  }

  function openCancel(member) {
    openSheet(
      '<p class="fm-eyebrow">Your membership</p>' +
      '<h2 class="fm-h" id="fm-title">Cancel your membership?</h2>' +
      '<p class="fm-sub">Every lesson stays open until ' + (dateStr(member.periodEnd) || 'the end of the month you paid for') + '. Your XP and badges stay yours after that.</p>' +
      '<button class="fm-blue" style="width:100%">Keep my membership</button>' +
      '<button class="fm-ghost red fm-later fm-go">Cancel membership</button><p class="fm-err" role="alert"></p>',
      function (root) {
        root.querySelector('.fm-blue').onclick = closeSheet;
        var go = root.querySelector('.fm-go');
        go.onclick = async function () {
          go.disabled = true; go.textContent = 'Cancelling\u2026';
          try { var r = await call('cancel', {}); apply(r.member); closeSheet(); toast('Cancelled. Your lessons stay open until ' + (dateStr(r.member.periodEnd) || 'the end of this month') + '.'); }
          catch (e) { root.querySelector('.fm-err').textContent = e.message; go.disabled = false; go.textContent = 'Cancel membership'; }
        };
      });
  }

  /* ---------- the dashboard card ---------- */
  function slot() {
    var s = document.getElementById('fair-slot');
    return s;
  }
  function render() {
    var s = slot(); if (!s) return;
    var m = state.member;
    var auth = window.Alpine && Alpine.store('auth');
    if (!m) {
      // Every eligible account sees it (14 Oct, Victor: expected it on a non-NCI account with full access).
      var free = !!(auth && auth.isFreeTier);
      s.innerHTML = '<div class="fm-hero"><div class="fm-hero-in"><p class="fm-hero-eye">AI Badge membership</p>' +
        '<h3>' + (free ? 'Open every lesson. Pay what&rsquo;s fair.' : 'Back AI Badge. Pay what&rsquo;s fair.') + '</h3>' +
        '<p>' + (free ? 'You choose the price.' : 'You already have every lesson. If AI Badge is worth something to you, you choose the price.') +
        ' Suggested ' + money(SUGGESTED) + ' a month, from ' + money(FLOOR) + '. If you stop learning for 30 days, billing pauses by itself.</p>' +
        '<div class="fm-hero-row"><button class="fm-cta fm-hero-cta" data-a="join">Choose your price</button><span>Cancel anytime. XP is earned, never bought.</span></div>' +
        (state.preview ? '<p class="fm-hero-note">Admin preview. Never shown on NCI accounts.</p>' : '') +
        '</div></div>';
    } else if (m.welcomeBack) {
      s.innerHTML = '<div class="fm-card"><p class="fm-eyebrow">Welcome back</p><h3>Resume at ' + money(m.amountCents) + ' a month?</h3>' +
        '<p>Your membership paused while you were away, and nothing was charged. Resume when it suits you.</p>' +
        '<div class="fm-actions"><button class="fm-blue" data-a="resume">Resume</button><button class="fm-ghost" data-a="change">Change price</button><button class="fm-ghost" data-a="notnow">Not now</button></div></div>';
    } else if (m.nudge) {
      var up = m.nudge.direction === 'up';
      s.innerHTML = '<div class="fm-card"><p class="fm-eyebrow">Your quarter</p><h3>' + (up ? 'You learned on ' + Number(m.nudge.activeDays) + ' days this quarter' : 'You were quiet this quarter') + '</h3>' +
        '<p>' + (up ? 'If AI Badge is worth more to you now, you can raise your price. Nothing changes unless you confirm.' : 'Want to pay less for a while? You keep everything either way.') + '</p>' +
        '<div class="fm-actions"><button class="fm-blue" data-a="change">' + (up ? 'Raise my price' : 'Lower my price') + '</button><button class="fm-ghost" data-a="nudgeseen">Keep ' + money(m.amountCents) + '</button></div></div>';
    } else {
      var pill = m.cancelling ? '<span class="fm-pill ending">Ends ' + esc(dateStr(m.periodEnd)) + '</span>'
        : (m.status === 'paused' ? '<span class="fm-pill paused">Paused</span>' : '<span class="fm-pill">Active</span>');
      var line = m.cancelling ? 'Every lesson stays open until ' + esc(dateStr(m.periodEnd)) + '.'
        : (m.status === 'paused' ? 'Paused since ' + esc(dateStr(m.pausedAt)) + '. Nothing is charged while paused.'
          : 'Pauses by itself if you go 30 days without a lesson.');
      s.innerHTML = '<div class="fm-card"><div class="fm-row"><div><p class="fm-eyebrow">Fair membership</p><h3>' + money(m.amountCents) + ' a month' + pill + '</h3><p>' + line + '</p></div></div>' +
        '<div class="fm-actions">' + (m.cancelling ? '<button class="fm-ghost" data-a="undo">Keep my membership</button>'
          : (m.status === 'paused' ? '<button class="fm-ghost" data-a="resume">Resume</button>' : '') +
            '<button class="fm-ghost" data-a="change">Change price</button><button class="fm-ghost red" data-a="cancel">Cancel</button>') + '</div></div>';
    }
    menuEntry();
    navPill();
    s.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = function () { act(b.dataset.a, b); };
    });
  }


  /* ---------- an entry in the top bar's More menu (topbar-tidy.js) ---------- */
  function menuEntry() {
    var auth = window.Alpine && Alpine.store('auth');
    var want = !!state.show;
    window.__fairMenu = want ? function () {
      return state.member
        ? { label: 'Membership \u00b7 ' + money(state.member.amountCents) + '/mo', run: function () { location.hash = '#/dashboard'; setTimeout(function () { var x = slot(); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); } }
        : { label: 'Membership: pay what\u2019s fair', run: openJoin };
    } : null;
  }


  /* ---------- navbar pill (14 Oct, Victor: "expecting [it] prominently in navbar") ---------- */
  function navPill() {
    var b = document.querySelector('#view-dashboard .lms-topbar');
    var anchor = b && (b.querySelector('.fil-me') || b.querySelector('.tb-more'));
    var pill = b && b.querySelector('.fm-nav');
    if (!state.show) { if (pill) pill.remove(); return; }
    if (!anchor) return;
    if (!pill) {
      pill = document.createElement('button'); pill.type = 'button'; pill.className = 'fm-nav';
      pill.onclick = function () {
        if (state.member) { location.hash = '#/dashboard'; setTimeout(function () { var x = slot(); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); }
        else openJoin();
      };
    }
    if (pill.nextElementSibling !== anchor) anchor.parentNode.insertBefore(pill, anchor);
    pill.innerHTML = '<i></i><span class="fm-l">' + (state.member ? 'Member \u00b7 ' + money(state.member.amountCents) + '/mo' : 'Membership') + '</span><span class="fm-s">' + (state.member ? 'Member' : 'Join') + '</span>';
    pill.setAttribute('aria-label', state.member ? 'Your membership' : 'AI Badge membership: pay what is fair');
  }
  setInterval(navPill, 1500);   // the photo and More menu mount after sign-in; keep the pill beside them

  async function act(a, btn) {
    var m = state.member;
    if (a === 'join') return openJoin();
    if (a === 'change') return openChange(m, m && m.nudge ? (m.nudge.direction === 'up' ? 'Thank you for learning so much. Pick a new monthly price, or keep the one you have.' : 'Pick a lower price if that is fairer for now. Everything you earned stays.') : null);
    if (a === 'cancel') return openCancel(m);
    var path = { resume: 'resume', notnow: 'not-now', nudgeseen: 'nudge-seen', undo: 'undo-cancel' }[a];
    if (!path) return;
    btn.disabled = true;
    try {
      var r = await call(path, {});
      apply(r.member);
      if (a === 'resume') toast('Resumed at ' + money(r.member.amountCents) + ' a month. Good to have you back.');
      if (a === 'undo') toast('Your membership carries on.');
    } catch (e) { btn.disabled = false; toast(e.message); }
  }

  function apply(member) {
    state.member = member || null;
    var auth = window.Alpine && Alpine.store('auth');
    if (auth) auth.fairMember = !!member;
    render();
  }

  /* ---------- hooks into the app ---------- */
  var ui = window.Alpine && Alpine.store('ui');
  if (ui && !ui.__fairWrapped) {
    var orig = ui.showModal.bind(ui);
    ui.showModal = function (name) {
      if (name === 'upgrade' && state.show && !state.member) return openJoin();
      return orig(name);
    };
    ui.__fairWrapped = true;
  }

  // Learning activity: opening a lesson. Members only; it is what keeps billing from pausing.
  var lastPing = '';
  function ping() {
    if (!state.member || location.hash.indexOf('#/lesson/') !== 0) return;
    var key = location.hash + '|' + new Date().toISOString().slice(0, 13);
    if (key === lastPing) return;
    lastPing = key;
    call('activity', {}).then(function (r) { apply(r.member); }).catch(function () {});
  }
  window.addEventListener('hashchange', function () { ping(); setTimeout(render, 50); });

  // Back from Stripe Checkout.
  var qs = new URLSearchParams(location.search);
  function cleanUrl() { history.replaceState({}, '', location.pathname + (location.hash || '#/dashboard')); }
  if (qs.get('fair') === 'success' && qs.get('cs')) {
    var cs = qs.get('cs'); cleanUrl();
    (async function confirm(tries) {
      try {
        var r = await call('confirm', { sessionId: cs });
        if (r.member) { apply(r.member); toast('Welcome in. Every lesson is open.'); return; }
      } catch (e) {}
      if (tries > 0) setTimeout(function () { confirm(tries - 1); }, 2500);
      else toast('Payment received. Your access is being set up; refresh in a minute.');
    })(4);
  } else if (qs.get('fair') === 'cancelled') { cleanUrl(); }

  // Signed out: remove everything this module drew.
  setInterval(function () {
    var auth = window.Alpine && Alpine.store('auth');
    if (auth && !auth.user) { var s = slot(); if (s) s.innerHTML = ''; closeSheet(); state = { show: false }; window.__fairMenu = null; }
  }, 2000);

  apply(state.member);
  ping();
})();
