/* The account card on AI Badge's dashboard (2 Oct 2026, Victor: "indicate to user if it's a Google
   or LinkedIn login ... link accounts ... make it beautiful seamless INTUITIVE").

   A round photo in the top bar, beside the other round buttons, carries a small brand tag for the
   way in that opened this session (Google, LinkedIn or email). A click opens a card with the ways
   into the one fiveinnolabs account, from the shared <fil-ways> element (aireckon.ing/fil/account.js):
   connect Google or LinkedIn and either one opens the same account on AI Badge and aireckon.ing.

   NCI students (2 Oct 2026, Victor: "allow them to LINK both their google auth and LinkedIn accounts ...
   next time a student logs in, ask them ... this will guarantee access after they leave NCI ... in navbar
   make it very easy clear inviting and intuitive to link these at any time"). An NCI account with no
   Google or LinkedIn yet gets a "Link accounts" pill beside the photo, a one-line note in the card, and,
   once a week at most, the card opens by itself after sign-in to ask. Either one linked: the pill goes.
   Access holds because the account keeps its NCI email whichever key opens it (isNci in index.html). */
(function () {
  var TAG = {
    google: '<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.6 42.6 14.6 48 24 48z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M2.6 8.3h4.3V22H2.6zM4.8 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM9.5 8.3h4.1v1.9c.6-1.1 2-2.2 4.1-2.2 4.4 0 5.2 2.9 5.2 6.6V22h-4.3v-6.7c0-1.6 0-3.6-2.2-3.6s-2.6 1.7-2.6 3.5V22H9.5z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="#3c3c43" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.8 7.2 12 13l8.2-5.8"/></svg>'
  };
  var NAME = { google: 'Google', linkedin: 'LinkedIn', email: 'email' };
  var CSS = [
    '.fil-me{position:relative;width:40px;height:40px;padding:4px;border-radius:50%;border:1px solid rgba(60,60,67,.12);background:#fff;cursor:pointer;flex:0 0 auto;box-shadow:0 1px 2px rgba(0,0,0,.05);transition:transform .12s cubic-bezier(.34,1.56,.64,1),border-color .2s}',
    '.fil-me:hover{border-color:rgba(0,122,255,.45)}.fil-me:active{transform:scale(.94)}',
    '.fil-me:focus-visible{outline:2px solid #007AFF;outline-offset:2px}',
    '.fil-me img,.fil-me .fil-ini,.fil-head img,.fil-head .fil-ini{width:100%;height:100%;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#E5E5EA;color:#000036;font:600 14px/1 -apple-system,sans-serif}',
    '.fil-tag{position:absolute;right:-2px;bottom:-2px;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;background:#fff;box-shadow:0 0 0 1.5px #fff,0 1px 2px rgba(0,0,0,.18);pointer-events:none}',
    '.fil-tag svg{width:10px;height:10px;display:block}.fil-tag.linkedin{background:#0A66C2}.fil-tag.linkedin svg{width:9px;height:9px}',
    '.fil-card{position:absolute;top:58px;right:16px;z-index:200;width:332px;padding:18px;border-radius:18px;background:#fff;color:#000036;',
    '  border:1px solid rgba(60,60,67,.12);box-shadow:0 22px 60px rgba(0,0,40,.18),0 2px 8px rgba(0,0,40,.06);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;',
    '  transform-origin:top right;animation:fil-in .16s ease-out}',
    '@keyframes fil-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}',
    '@media (prefers-reduced-motion:reduce){.fil-card{animation:none}.fil-me{transition:none}}',
    '.fil-card[hidden]{display:none}',
    '.fil-head{display:flex;align-items:center;gap:12px;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid rgba(60,60,67,.12);min-width:0}',
    '.fil-head .fil-pav{position:relative;flex:none;width:44px;height:44px}.fil-head .fil-tag{width:18px;height:18px}.fil-head .fil-tag svg{width:11px;height:11px}',
    '.fil-head .fil-nm{display:flex;align-items:center;gap:8px;min-width:0}.fil-head .fil-nm b{min-width:0}.fil-head fil-level{flex:none}',
    '.fil-head b{display:block;font-size:15px;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.fil-head small{display:block;font-size:12.5px;color:rgba(60,60,67,.6);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.fil-head > div:last-child{min-width:0}',
    '.fil-card fil-ways{--fil-ink:#000036;--fil-muted:rgba(60,60,67,.6);--fil-line:rgba(60,60,67,.12);--fil-accent:#007AFF;--fil-accent-ink:#fff;--fil-chip:rgba(0,122,255,.1);--fil-bad:#D70015;--fil-font:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif}',
    /* NCI: link a personal way in */
    '.fil-keep{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px 0 8px;border-radius:999px;border:1px solid rgba(0,122,255,.35);background:rgba(0,122,255,.07);color:#007AFF;cursor:pointer;flex:0 0 auto;font:600 13.5px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;white-space:nowrap;transition:background .2s,border-color .2s,transform .12s cubic-bezier(.34,1.56,.64,1)}',
    '.fil-keep:hover{background:rgba(0,122,255,.13);border-color:rgba(0,122,255,.55)}.fil-keep:active{transform:scale(.96)}',
    '.fil-keep:focus-visible{outline:2px solid #007AFF;outline-offset:2px}.fil-keep[hidden]{display:none}',
    '.fil-keep .fil-pair{display:flex}.fil-keep .fil-pair i{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#fff;box-shadow:0 0 0 1.5px #fff,0 1px 2px rgba(0,0,0,.15)}',
    '.fil-keep .fil-pair i.li{background:#0A66C2}.fil-top-level{display:inline-flex;align-items:center;flex:none}.fil-top-level[hidden]{display:none}',
    /* room for the level chip (3 Oct 2026): the email text repeats the photo card, and the invite field collapses
       to its button below 1100px as it already did on phones; on phones the pill keeps only its icon */
    '@media (max-width:1440px){.lms-topbar .lms-topbar-identity{display:none !important}}',
    '@media (max-width:1100px){.lms-topbar a[href="explore.html"]{display:none !important}.lms-topbar .lms-invite-input,.lms-topbar .lms-invite-label{display:none}.lms-topbar .lms-invite-btn{border-radius:999px;padding:0 12px}}',
    /* phones: no room in the bar, so the gem and XP show beside the welcome just below it (index.html) */
    '@media (max-width:600px){.fil-keep>span:last-child{display:none}.fil-keep{padding-right:6px}.lms-topbar .fil-top-level{display:none !important}}',
    '.fil-keep .fil-pair i+i{margin-left:-6px;background:#0A66C2}.fil-keep .fil-pair svg{width:13px;height:13px;display:block}.fil-keep .fil-pair i+i svg{width:12px;height:12px}',
    /* phone: the pill stands in for the photo until something is linked (both open the same card) */
    '@media (max-width:600px){.fil-keep{padding:0 12px 0 7px;gap:6px}.fil-keep .fil-long{display:none}.fil-keep:not([hidden])+.fil-me{display:none}}',
    '@media (max-width:400px){.lms-topbar > div:has(> .fil-keep:not([hidden])) > .lms-theme-toggle{display:none}}',
    '.fil-note{margin:0 0 14px;padding:11px 12px;border-radius:12px;background:rgba(0,122,255,.07);font-size:13px;line-height:1.45;color:#000036}',
    '.fil-note b{display:block;font-size:13.5px;margin-bottom:2px}',
    '.fil-golink{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:42px;margin-top:10px;border:0;border-radius:10px;background:#0A66C2;color:#fff;font:600 14px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;cursor:pointer}',
    '.fil-golink:hover{background:#004182}.fil-golink:focus-visible{outline:2px solid #007AFF;outline-offset:2px}.fil-golink svg{width:15px;height:15px}.fil-golink[aria-busy]{opacity:.75;cursor:progress}',
    '.fil-keep[aria-busy]{opacity:.75;cursor:progress}',
    '.fil-note.kept{background:rgba(52,199,89,.1);display:flex;gap:8px;align-items:center}.fil-note.kept svg{flex:none;width:16px;height:16px;color:#1f9d47}',
    '.fil-later{display:block;margin:12px auto 0;padding:8px 14px;min-height:36px;border:0;background:none;border-radius:999px;font:600 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;color:rgba(60,60,67,.6);cursor:pointer}',
    '.fil-later:hover{background:rgba(120,120,128,.1);color:#000036}.fil-later[hidden]{display:none}',
    '.lms-dark .fil-keep{color:#0A84FF;border-color:rgba(10,132,255,.45);background:rgba(10,132,255,.12)}.lms-dark .fil-keep:hover{background:rgba(10,132,255,.2)}',
    '.lms-dark .fil-keep .fil-pair i{box-shadow:0 0 0 1.5px #000036}',
    '.lms-dark .fil-note{background:rgba(10,132,255,.14);color:#fff}.lms-dark .fil-note.kept{background:rgba(48,209,88,.14)}.lms-dark .fil-note.kept svg{color:#30D158}',
    '.lms-dark .fil-later{color:rgba(235,235,245,.6)}.lms-dark .fil-later:hover{background:rgba(255,255,255,.08);color:#fff}',
    '.fil-due{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12.5px;font-weight:600;color:#a9761f}.lms-dark .fil-due{color:#E3C878}',
    '.fil-dots{display:inline-flex;gap:4px}.fil-dots i{width:8px;height:8px;border-radius:50%;background:rgba(169,118,31,.22)}.fil-dots i.on{background:#a9761f}',
    '.lms-dark .fil-dots i{background:rgba(227,200,120,.25)}.lms-dark .fil-dots i.on{background:#E3C878;box-shadow:0 0 8px rgba(227,200,120,.6)}',
    /* the gate after 3 lessons: navy glass, one gold seal as the focal point */
    'html.fil-gated,html.fil-gated body{overflow:hidden}',
    '.fil-gate{position:fixed;inset:0;z-index:10000;display:grid;grid-template-columns:minmax(0,420px);justify-content:center;align-content:center;padding:20px;background:rgba(0,0,30,.5);-webkit-backdrop-filter:blur(10px) saturate(.9);backdrop-filter:blur(10px) saturate(.9);animation:fil-fade .2s ease-out}',
    '.fil-gate[hidden]{display:none}.fil-gate.leaving{opacity:0;transition:opacity .3s ease}',
    '@keyframes fil-fade{from{opacity:0}to{opacity:1}}',
    '@keyframes fil-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
    '@keyframes fil-land{0%{opacity:0;transform:translateY(18px) scale(.97)}70%{transform:translateY(-2px) scale(1.005)}100%{opacity:1;transform:none}}',
    '.fil-gate,.fil-gate *{box-sizing:border-box}',
    '.fil-gate-card{position:relative;overflow:hidden;width:100%;max-width:420px;padding:30px 28px 18px;border-radius:24px;text-align:center;color:#fff;',
    '  background:radial-gradient(120% 70% at 0% 0%,rgba(227,200,120,.16),transparent 60%),linear-gradient(165deg,#13187a 0%,#000036 72%);',
    '  border:1px solid rgba(227,200,120,.24);box-shadow:0 40px 100px rgba(0,0,30,.55),inset 0 1px 0 rgba(255,255,255,.07);',
    '  font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;animation:fil-land .42s cubic-bezier(.2,.8,.2,1) both}',
    '.fil-gate-card:focus{outline:none}.fil-gate-card::before{content:"";position:absolute;left:12%;right:12%;top:0;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#E3C878,transparent);box-shadow:0 0 18px rgba(227,200,120,.7)}',
    '.fil-gate-card>*{animation:fil-rise .36s cubic-bezier(.2,.8,.2,1) both}',
    '.fil-gate-card>:nth-child(1){animation-delay:.08s}.fil-gate-card>:nth-child(2){animation-delay:.13s}.fil-gate-card>:nth-child(3){animation-delay:.16s}',
    '.fil-gate-card>:nth-child(4){animation-delay:.2s}.fil-gate-card>:nth-child(5){animation-delay:.25s}.fil-gate-card>:nth-child(n+6){animation-delay:.3s}',
    '.fil-gate-k{display:block;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(227,200,120,.9)}',
    '.fil-seal{position:relative;display:grid;place-items:center;width:84px;height:84px;margin:18px auto 8px;border-radius:50%;',
    '  background:radial-gradient(circle at 32% 28%,#FBEFC4 0%,#E3C878 42%,#B48B36 100%);box-shadow:0 0 0 6px rgba(227,200,120,.12),0 0 44px rgba(227,200,120,.45),inset 0 -4px 10px rgba(120,80,10,.35)}',
    '.fil-seal-n{font:700 38px/1 "Playfair Display",Georgia,serif;color:#000036;transition:transform .2s ease,opacity .2s ease}',
    '.fil-seal svg{position:absolute;width:40px;height:40px;color:#000036;opacity:0;transform:scale(.4) rotate(-20deg);transition:transform .32s cubic-bezier(.34,1.56,.64,1),opacity .2s}',
    '.fil-seal-cap{display:block;font-size:12px;color:rgba(255,255,255,.55);margin-bottom:14px}',
    '.fil-gate-card h2{margin:0 0 10px;font:700 29px/1.15 "Playfair Display",Georgia,serif;letter-spacing:-.01em;color:#fff}',
    '.fil-gate-card h2 em{font-style:italic;color:#E3C878;text-shadow:0 0 24px rgba(227,200,120,.45)}',
    '.fil-gate-p{margin:0 auto 20px;max-width:330px;font-size:14.5px;line-height:1.55;color:rgba(255,255,255,.78)}',
    '.fil-gate-acts{display:grid;gap:10px}',
    '.fil-gate-btn{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:50px;border-radius:14px;font:600 15px/1 Inter,-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;transition:transform .12s cubic-bezier(.34,1.56,.64,1),background-color .15s,box-shadow .15s}',
    '.fil-gate-btn:active{transform:scale(.97)}.fil-gate-btn:focus-visible{outline:2px solid #E3C878;outline-offset:3px}.fil-gate-btn[aria-busy]{cursor:progress;filter:saturate(.8) brightness(.95)}',
    '.fil-gate-btn i{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;flex:none}.fil-gate-btn i svg{width:15px;height:15px;display:block}',
    '.fil-gate-btn.li{border:0;background:#E3C878;color:#000036;box-shadow:0 8px 24px rgba(227,200,120,.28)}.fil-gate-btn.li:hover{background:#ECD590;box-shadow:0 10px 30px rgba(227,200,120,.4)}',
    '.fil-chip-li{background:#0A66C2}.fil-chip-g{background:#fff}',
    '.fil-gate-btn.g{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff}.fil-gate-btn.g:hover{background:rgba(255,255,255,.13)}',
    '.fil-gate-card .fil-gate-msg{margin:12px 0 0;font-size:13px;line-height:1.45;color:#FF9C8F}.fil-gate-card .fil-gate-msg:empty{display:none}',
    '.fil-gate-small{margin:14px 0 0;font-size:12.5px;color:rgba(255,255,255,.5)}',
    '.fil-gate-out{margin-top:6px;padding:8px 14px;min-height:36px;border:0;background:none;border-radius:999px;font:500 13px/1 Inter,-apple-system,sans-serif;color:rgba(255,255,255,.45);cursor:pointer}',
    '.fil-gate-out:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.8)}.fil-gate-out:focus-visible{outline:2px solid #E3C878}',
    /* joy: the seal becomes a tick, one glint crosses the card */
    '.fil-gate.won .fil-seal-n{opacity:0;transform:scale(.5)}.fil-gate.won .fil-seal svg{opacity:1;transform:none}',
    '.fil-gate.won .fil-seal{animation:fil-pop .45s cubic-bezier(.34,1.56,.64,1)}@keyframes fil-pop{50%{transform:scale(1.1)}}',
    '.fil-gate-card::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,240,200,.22),transparent);transform:skewX(-18deg);opacity:0;pointer-events:none}',
    '.fil-gate.won .fil-gate-card::after{animation:fil-glint .9s ease-out .1s}@keyframes fil-glint{0%{left:-60%;opacity:1}100%{left:130%;opacity:1}}',
    '.fil-gate.won .fil-gate-acts,.fil-gate.won .fil-gate-small,.fil-gate.won .fil-gate-out,.fil-gate.won .fil-gate-msg{display:none}',
    '@media (max-width:420px){.fil-gate{padding:12px}.fil-gate-card{padding:26px 20px 14px}.fil-gate-card h2{font-size:26px}}',
    '@media (prefers-reduced-motion:reduce){.fil-gate,.fil-gate-card,.fil-gate-card>*,.fil-gate.won .fil-seal{animation:none}.fil-gate.won .fil-gate-card::after{animation:none}}',
    '.lms-dark .fil-me{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.16)}',
    '.lms-dark .fil-tag{box-shadow:0 0 0 1.5px #000036}',
    '.lms-dark .fil-card{background:#0b0d3a;color:#fff;border-color:rgba(255,255,255,.12);box-shadow:0 22px 60px rgba(0,0,0,.55)}',
    '.lms-dark .fil-head{border-color:rgba(255,255,255,.1)}.lms-dark .fil-head small{color:rgba(235,235,245,.6)}',
    '.lms-dark .fil-card fil-ways{--fil-ink:#fff;--fil-muted:rgba(235,235,245,.6);--fil-line:rgba(255,255,255,.1);--fil-accent:#0A84FF;--fil-chip:rgba(10,132,255,.18);--fil-bad:#FF6961}'
  ].join('\n');

  var me = null, card = null, ways = null, user = null, via = '', level = null;
  var keep = null, note = null, later = null, nci = false, kept = null, asking = false, topLevel = null;
  /* required after 3 lessons (5 Nov 2026, Victor: "add nudges from the very start, and maybe require it after say 3 lessons
     completed ... for all nci students"; 7 of 138 NCI accounts had linked anything). Students only; either Google or
     LinkedIn lifts the gate, since either opens the account after the NCI email closes. Unknown link state never blocks. */
  var student = false, keptAny = null, done = null, gate = null, NEED = 3;
  var ASKED = 'fil-keep-asked', WEEK = 864e5;   // the card asks once a day now (was weekly)
  var TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>';

  function photo(u) {
    if (u && u.photoURL && /^https:\/\//.test(u.photoURL)) {
      var im = document.createElement('img'); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.src = u.photoURL;
      im.addEventListener('error', function () { im.replaceWith(initial(u)); });
      return im;
    }
    return initial(u);
  }
  function initial(u) {
    var d = document.createElement('span'); d.className = 'fil-ini';
    d.textContent = ((u && (u.displayName || u.email)) || '?').trim().charAt(0).toUpperCase();
    return d;
  }
  function tag(p) {
    if (!TAG[p]) return null;
    var t = document.createElement('span'); t.className = 'fil-tag ' + p; t.innerHTML = TAG[p];
    return t;
  }
  function paint() {
    if (!me) return;
    me.hidden = !user;
    if (topLevel) topLevel.hidden = !user;
    if (!user) { close(); return; }
    me.replaceChildren.apply(me, [photo(user), tag(via)].filter(Boolean));
    var said = 'Your account' + (via ? ', signed in with ' + NAME[via] : '');
    me.title = said; me.setAttribute('aria-label', said);
    paintKeep();
  }
  /* NCI only (3 Oct 2026, Victor: "nudge them to link linkedin to their nci student acct"): the pill shows until
     LinkedIn is linked; the note says why, or that it is done. Google alone no longer ends the nudge. */
  function paintKeep() {
    keep.hidden = !(user && nci && kept === false);
    note.hidden = !(user && nci && kept !== null);
    if (note.hidden) return;
    note.className = 'fil-note' + (kept ? ' kept' : '');
    note.innerHTML = kept
      ? TICK + '<span>LinkedIn linked. Your AI Badge, level and XP stay yours after you leave NCI, and LinkedIn opens the same account on aireckon.ing.</span>'
      : '<b>Link your LinkedIn</b>One tap. When your NCI email is gone, LinkedIn will still open this account, with your level and XP, here and on aireckon.ing.' +
        (student && keptAny === false && done !== null && done < NEED
          ? '<span class="fil-due"><span class="fil-dots" aria-hidden="true">' + [0, 1, 2].map(function (i) { return '<i' + (i < done ? ' class="on"' : '') + '></i>'; }).join('') +
            '</span>Needed after ' + NEED + ' lessons: ' + (NEED - done) + ' to go</span>' : '') +
        '<button type="button" class="fil-golink">' + TAG.linkedin + '<span>Link LinkedIn</span></button>';
    var go = note.querySelector('.fil-golink'); if (go) go.addEventListener('click', function (e) { e.stopPropagation(); linkNow(go); });
    later.textContent = kept ? 'Done' : 'Not now';
  }
  /* one tap (9 Oct 2026, Victor: "make it easy for people to link their nci student account with linkedin"): the pill and
     the note's button go straight to LinkedIn through the card's own <fil-ways> (the broker's one link flow) and come back
     linked. If the page is still here a moment later something stopped it, so the card opens to show why. */
  function linkNow(el) {
    if (!user || !ways || typeof ways.connect !== 'function') { open(); return; }
    if (el) { el.setAttribute('aria-busy', 'true'); var sp = el.querySelector('span:last-child'); if (sp) sp.textContent = 'Opening LinkedIn\u2026'; }
    ways.connect('linkedin');
    setTimeout(function () { if (el) { el.removeAttribute('aria-busy'); var sp2 = el.querySelector('span:last-child'); if (sp2) sp2.textContent = 'Link LinkedIn'; } if (card.hidden) open(); }, 4000);
  }
  function linkedNow(d) {
    var m = (d && d.methods) || {};
    return !!(m.linkedin || (d && d.current === 'linkedin'));
  }
  function linkedAny(d) {
    var m = (d && d.methods) || {};
    return !!(m.google || linkedNow(d));
  }
  function countDone(uid) {
    if (typeof getTutorialCompletions !== 'function') return;
    getTutorialCompletions(uid).then(function (c) {
      if (!user || user.uid !== uid) return;
      done = Object.keys(c || {}).filter(function (k) { return c[k] && c[k].completed; }).length;
      paintKeep(); paintGate();
    });
  }
  /* the gate: a full-page sheet over every view, with no "Not now". Sign out is the only other way off it. */
  function paintGate() {
    var show = !!(user && student && keptAny === false && done !== null && done >= NEED);
    if (gate && gate.classList.contains('won')) return;   // the success moment finishes by itself
    if (!show) { if (gate) { gate.hidden = true; document.documentElement.classList.remove('fil-gated'); } return; }
    if (!gate) {
      gate = document.createElement('div'); gate.className = 'fil-gate'; gate.hidden = true;
      gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true'); gate.setAttribute('aria-labelledby', 'fil-gate-h');
      gate.innerHTML = '<div class="fil-gate-card" tabindex="-1">' +
        '<span class="fil-gate-k">Before your NCI email closes</span>' +
        '<span class="fil-seal" aria-hidden="true"><b class="fil-seal-n"></b>' + TICK + '</span>' +
        '<span class="fil-seal-cap"></span>' +
        '<h2 id="fil-gate-h">Keep your badge <em>for life</em></h2>' +
        '<p class="fil-gate-p">Link LinkedIn or Google. When your NCI email is gone, either one opens this account, with your lessons, XP and certificate.</p>' +
        '<div class="fil-gate-acts">' +
          '<button type="button" class="fil-gate-btn li"><i class="fil-chip-li">' + TAG.linkedin + '</i><span>Link LinkedIn</span></button>' +
          '<button type="button" class="fil-gate-btn g"><i class="fil-chip-g">' + TAG.google + '</i><span>Link Google</span></button>' +
        '</div>' +
        '<p class="fil-gate-msg" aria-live="polite"></p>' +
        '<p class="fil-gate-small">One tap. Nothing is ever posted to your LinkedIn.</p>' +
        '<button type="button" class="fil-gate-out">Sign out</button></div>';
      gate.querySelector('.li').addEventListener('click', function (e) { gate.querySelector('.fil-gate-msg').textContent = ''; linkNow(e.currentTarget); });
      gate.querySelector('.g').addEventListener('click', function (e) {
        var b = e.currentTarget, msg = gate.querySelector('.fil-gate-msg'), lab = b.querySelector('span');
        if (b.hasAttribute('aria-busy')) return;
        b.setAttribute('aria-busy', 'true'); lab.textContent = 'Opening Google\u2026'; msg.textContent = '';
        user.linkWithPopup(new firebase.auth.GoogleAuthProvider()).then(function () {
          keptAny = true; celebrate();
          return user.reload().then(function () { if (ways) ways.refresh(); });
        }).catch(function (err) {
          msg.textContent = (window.FIL_WAYS_ERR || {})[(err && err.code) || ''] || 'Google was not linked. Try again, or link LinkedIn.';
        }).then(function () { b.removeAttribute('aria-busy'); lab.textContent = 'Link Google'; });
      });
      gate.querySelector('.fil-gate-out').addEventListener('click', function () { firebase.auth().signOut().then(function () { location.hash = ''; }); });
      document.body.appendChild(gate);
    }
    gate.querySelector('.fil-seal-n').textContent = done;
    gate.querySelector('.fil-seal-cap').textContent = done === 1 ? 'lesson in your account' : 'lessons in your account';
    if (gate.hidden) {
      gate.hidden = false; document.documentElement.classList.add('fil-gated'); close();
      setTimeout(function () { var f = gate.querySelector('.fil-gate-card'); if (f) f.focus({ preventScroll: true }); }, 60);
    }
  }
  /* the one moment of joy: the seal turns into a gold tick with a glint, then the gate settles away */
  function celebrate() {
    if (!gate || gate.hidden) return;
    gate.classList.add('won');
    gate.querySelector('#fil-gate-h').innerHTML = 'Yours <em>for life</em>';
    gate.querySelector('.fil-seal-cap').textContent = 'Linked';
    gate.querySelector('.fil-gate-p').textContent = 'Google now opens this account too, long after your NCI email is gone.';
    setTimeout(function () { gate.classList.add('leaving'); }, 1500);
    setTimeout(function () { gate.classList.remove('won', 'leaving'); paintGate(); }, 1800);
  }
  /* once a week at most, after sign-in, when the top bar is on screen and no sheet is open */
  function maybeAsk() {
    if (!nci || kept !== false || asking || (gate && !gate.hidden)) return;
    try { if (Date.now() - (+localStorage.getItem(ASKED) || 0) < WEEK) return; } catch (e) { return; }
    asking = true;
    var tries = 0, t = setInterval(function () {
      var ui = window.Alpine && Alpine.store && Alpine.store('ui');
      var free = (me.offsetParent !== null || keep.offsetParent !== null) && !(ui && ui.activeModal);
      if (!user || kept !== false || (gate && !gate.hidden) || ++tries > 60) { clearInterval(t); asking = false; return; }
      if (!free) return;
      clearInterval(t); asking = false;
      try { localStorage.setItem(ASKED, String(Date.now())); } catch (e) {}
      open(); later.hidden = false;
    }, 500);
  }
  function open() {
    if (!user) return;
    var head = card.querySelector('.fil-head'), pav = document.createElement('span'), txt = document.createElement('div');
    pav.className = 'fil-pav'; pav.append.apply(pav, [photo(user), tag(via)].filter(Boolean));
    var b = document.createElement('b'); b.textContent = user.displayName || 'Your account';
    var s = document.createElement('small'); s.textContent = user.email || '';
    var nm = document.createElement('span'); nm.className = 'fil-nm'; nm.append(b);
    var lv = document.createElement('fil-level'); lv.setAttribute('level', level || 0); nm.append(lv);   // AI Badge level, or the invitation to earn L1
    lv.setAttribute('mine', ''); if (window.filXp && filXp.total != null) lv.setAttribute('xp', filXp.total);   // and their XP beside it
    txt.append(nm, s); head.replaceChildren(pav, txt);
    later.hidden = true; paintKeep();
    card.hidden = false; me.setAttribute('aria-expanded', 'true');
    if (ways.isConnected) ways.refresh();
  }
  function close(back) {
    if (!card || card.hidden || (ways && ways.busy)) return;
    card.hidden = true; me.setAttribute('aria-expanded', 'false');
    if (back) me.focus();
  }

  function mount() {
    var bar = document.querySelector('#view-dashboard .lms-topbar') || document.querySelector('.lms-topbar');
    var out = bar && bar.querySelector('.lms-signout-btn');
    if (!bar || !out || bar.querySelector('.fil-me')) return false;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    me = document.createElement('button'); me.type = 'button'; me.className = 'fil-me'; me.hidden = true;
    me.setAttribute('aria-haspopup', 'dialog'); me.setAttribute('aria-expanded', 'false');
    out.parentNode.insertBefore(me, out);
    card = document.createElement('div'); card.className = 'fil-card'; card.hidden = true;
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Your account');
    card.innerHTML = '<div class="fil-head"></div>';
    note = document.createElement('p'); note.hidden = true; card.appendChild(note);
    keep = document.createElement('button'); keep.type = 'button'; keep.className = 'fil-keep'; keep.hidden = true;
    keep.title = 'Link your LinkedIn to keep your AI Badge after NCI';
    keep.innerHTML = '<span class="fil-pair" aria-hidden="true"><i class="li">' + TAG.linkedin + '</i></span><span>Link LinkedIn</span>';
    me.parentNode.insertBefore(keep, me);
    /* the AI Badge level gem and XP in the top bar, beside the photo, as on aireckon.ing (3 Oct 2026, Victor:
       "these students MUST GET the XP ... must show in AI badge navbar"). <fil-level mine> fills itself from filXp. */
    topLevel = document.createElement('fil-level'); topLevel.setAttribute('mine', ''); topLevel.className = 'fil-top-level'; topLevel.hidden = true;
    me.parentNode.insertBefore(topLevel, keep);
    keep.addEventListener('click', function (e) { e.stopPropagation(); linkNow(keep); });
    ways = document.createElement('fil-ways'); ways.setAttribute('auth', 'firebase');
    ways.idToken = function () { return user ? user.getIdToken() : Promise.resolve(null); };
    ways.connectGoogle = function () {
      return user.linkWithPopup(new firebase.auth.GoogleAuthProvider()).then(function () { return user.reload(); });
    };
    card.appendChild(ways);
    later = document.createElement('button'); later.type = 'button'; later.className = 'fil-later'; later.hidden = true;
    later.addEventListener('click', function () { close(true); });
    card.appendChild(later);
    /* the level comes with the ways-in list; it sits beside the name */
    ways.addEventListener('fil-ways', function (e) {
      if (e.detail && nci) {
        var was = kept; kept = linkedNow(e.detail); keptAny = linkedAny(e.detail);
        if (was !== kept) { paintKeep(); maybeAsk(); }
        paintGate();
      }
      var l = e.detail && e.detail.level; if (l === level) return; level = l || null;
      var nm = card.querySelector('.fil-nm'); if (!nm) return;
      var lv = nm.querySelector('fil-level');
      if (!lv) { lv = document.createElement('fil-level'); lv.setAttribute('mine', ''); nm.append(lv); }
      lv.setAttribute('level', level || 0);
    });
    bar.appendChild(card);
    me.addEventListener('click', function (e) { e.stopPropagation(); card.hidden ? open() : close(true); });
    card.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
    return true;
  }

  function boot() {
    if (!window.firebase || !firebase.auth) return setTimeout(boot, 200);
    if (typeof initFirebase === 'function') initFirebase();
    if (!mount()) return setTimeout(boot, 400);
    /* XP on the one account (2 Oct 2026, fiveinnolabs-identity/xp/XP.md): the broker decides, the photo takes the "+N XP" */
    if (window.filXp) filXp.use({ idToken: function () { return user ? user.getIdToken() : null; }, anchor: function () { return me; } });
    if (window.filXp && typeof window.saveTutorialCompletion === 'function' && !saveTutorialCompletion.xp) {
      var save = window.saveTutorialCompletion;
      window.saveTutorialCompletion = function (uid, id, done) {
        var r = save.apply(this, arguments);
        if (done && id) filXp.report('lesson_done', String(id));
        return r;
      };
      window.saveTutorialCompletion.xp = true;
    }
    /* each finished lesson recounts: below the bar the card asks again at once (the countdown), at the bar the gate goes up */
    if (typeof window.saveTutorialCompletion === 'function' && !saveTutorialCompletion.keep) {
      var save2 = window.saveTutorialCompletion, keepFlag = !!save2.xp;
      window.saveTutorialCompletion = function (uid, id, isDone) {
        var r = save2.apply(this, arguments);
        if (isDone && student && user && user.uid === uid) Promise.resolve(r).then(function () {
          if (keptAny === false) { try { localStorage.removeItem(ASKED); } catch (e) {} }
          countDone(uid); maybeAsk();
        });
        return r;
      };
      window.saveTutorialCompletion.xp = keepFlag; window.saveTutorialCompletion.keep = true;
    }
    firebase.auth().onAuthStateChanged(function (u) {
      var same = user && u && user.uid === u.uid;
      user = u; via = '';
      if (window.filXp) { if (u) filXp.hello(u.uid); else filXp.reset(); }
      if (!same) {
        kept = null; keptAny = null; done = null;
        nci = !!(u && typeof isNciEmail === 'function' && isNciEmail(u.email));
        student = nci && /@student\.ncirl\.ie$/i.test(u.email || '');
        paintGate();
        if (student) countDone(u.uid);
      }
      if (!u) return paint();
      /* NCI: learn now whether LinkedIn is linked (only the broker knows) */
      if (nci && !same) ways.refresh();
      u.getIdTokenResult().then(function (r) {
        var p = r.signInProvider;
        via = p === 'google.com' ? 'google' : (p === 'custom' && r.claims.li) ? 'linkedin' : (p === 'password' || p === 'emailLink') ? 'email' : '';
        paint();
      }).catch(paint);
      paint();
    });
    /* back from connecting a LinkedIn (linkedin-signin.js): open the card on the result */
    if (window.linkedInSignInResult) window.linkedInSignInResult.then(function (r) {
      if (!r || r.mode !== 'link') return;
      var wait = setInterval(function () {
        if (!user) return;
        clearInterval(wait); open();
        if (r.success) { ways.say('good', 'LinkedIn connected. Either one now opens this account.'); ways.flash('linkedin'); }
        else {
          ways.say('bad', (window.FIL_WAYS_ERR || {})[r.code] || r.error);
          var gm = gate && gate.querySelector('.fil-gate-msg'); if (gm) gm.textContent = (window.FIL_WAYS_ERR || {})[r.code] || r.error;
        }
      }, 150);
      setTimeout(function () { clearInterval(wait); }, 8000);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
