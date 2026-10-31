/* Level-up celebration in the navbar (31 Oct 2026, Victor: "anytime a student gets their Ln badge decorate their
   navbar for the next 2-3 logins ... subtle in the navbar area only"). Lives entirely inside the 52px bar.
   login 1: gold rim + glint on the gem + 3 foil balloons + sparkles + "earned" pill
   login 2: rim + 2 balloons + pill;  login 3: rim + 1 balloon;  then the normal bar.
   Counted per credential on users/{uid}.celebrated.<ucid>; a visit counts once per 30 minutes, and only
   credentials issued in the last 30 days celebrate. Only the pill takes the pointer. */
(function () {
  var WINDOW_DAYS = 30, VISIT_GAP_MS = 30 * 60 * 1000;
  // foil per level: L1 bronze (the gem's own colour), L2 silver, L3 gold; champagne and pearl beside it
  var FOILS = {
    1: [['#f6d3b4', '#c27c4a', '#6e3a18'], ['#fbf0cf', '#e3c878', '#8f6d1f'], ['#ffffff', '#d7dce4', '#7d8696']],
    2: [['#ffffff', '#c9d0da', '#5f6878'], ['#fbf0cf', '#e3c878', '#8f6d1f'], ['#e6efff', '#8fb3ff', '#1f4fb8']],
    3: [['#fff3c9', '#e3c878', '#8a6516'], ['#ffffff', '#d7dce4', '#7d8696'], ['#f6d3b4', '#c27c4a', '#6e3a18']]
  };
  var CSS = [
    '.lv-in{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}',
    '.lms-topbar.lv-on>*:not(.lv-in):not(.lv-pill){position:relative;z-index:1}',
    '.lv-rim{position:absolute;left:0;right:0;bottom:0;height:2px;overflow:hidden;opacity:0;animation:lvIn .6s .1s ease-out forwards}',
    '.lv-rim i{position:absolute;inset:0 -100% 0 0;background:linear-gradient(90deg,transparent,#c27c4a 22%,#e3c878 40%,#fff6dc 50%,#e3c878 60%,#c27c4a 78%,transparent);animation:lvSlide 7s linear infinite}',
    '@keyframes lvSlide{from{transform:translateX(-50%)}to{transform:translateX(0)}}',
    '@keyframes lvIn{to{opacity:1}}',
    '.lv-b{position:absolute;width:13px;transform-origin:50% 100%;opacity:0;animation:lvRise .9s cubic-bezier(.2,1.25,.4,1) forwards,lvBob 4.6s ease-in-out infinite}',
    '.lv-b svg{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 2px 2px rgba(0,0,54,.18))}',
    '@keyframes lvRise{from{opacity:0;translate:0 26px}to{opacity:1;translate:0 0}}',
    '@keyframes lvBob{0%,100%{rotate:-5deg}50%{rotate:5deg}}',
    '.lv-t{position:absolute;width:6px;height:6px;opacity:0;animation:lvTw 2.4s ease-in-out infinite}',
    '.lv-t::before,.lv-t::after{content:"";position:absolute;left:2.5px;top:0;width:1px;height:6px;background:#e3c878;border-radius:1px}',
    '.lv-t::after{transform:rotate(90deg)}',
    '@keyframes lvTw{0%,100%{opacity:0;transform:scale(.4)}45%{opacity:1;transform:scale(1)}}',
    '.lv-glint{position:absolute;inset:0;border-radius:999px;overflow:hidden;pointer-events:none}',
    '.lv-glint::after{content:"";position:absolute;top:-20%;bottom:-20%;width:40%;left:-60%;transform:skewX(-20deg);background:linear-gradient(90deg,transparent,rgba(255,250,230,.95),transparent);animation:lvGlint 1.1s .6s cubic-bezier(.4,0,.2,1) forwards}',
    '@keyframes lvGlint{to{left:130%}}',
    '.lv-pill{position:absolute;top:50%;z-index:2;pointer-events:auto;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 11px;border-radius:999px;',
    'background:rgba(169,118,31,.08);box-shadow:inset 0 0 0 1px rgba(169,118,31,.32);font:600 12px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;color:#000036;text-decoration:none;white-space:nowrap;',
    'opacity:0;transform:translate(8px,-50%);animation:lvPill .45s .95s cubic-bezier(.2,1.2,.4,1) forwards;transition:background .18s}',
    '.lv-pill:hover{background:rgba(169,118,31,.15)}',
    '.lv-pill b{color:#a9761f;font-weight:700}.lv-pill span{color:rgba(60,60,67,.55);font-weight:500;transition:transform .18s}.lv-pill:hover span{transform:translateX(2px)}',
    '@keyframes lvPill{to{opacity:1;transform:translate(0,-50%)}}',
    '.lms-dark .lv-pill{background:rgba(227,200,120,.1);box-shadow:inset 0 0 0 1px rgba(227,200,120,.4);color:#fff}.lms-dark .lv-pill b{color:#E3C878}.lms-dark .lv-pill span{color:rgba(255,255,255,.55)}',
    '@media (prefers-reduced-motion:reduce){.lv-rim,.lv-rim i,.lv-b,.lv-pill,.lv-t,.lv-glint::after{animation:none!important;opacity:1}.lv-pill{transform:translate(0,-50%)}.lv-t,.lv-glint{display:none}}'
  ].join('');

  function balloon(c, i) {
    var id = 'lvg' + i + Math.random().toString(36).slice(2, 6);
    return '<svg viewBox="0 0 13 34" aria-hidden="true"><defs><radialGradient id="' + id + '" cx=".35" cy=".3" r=".8">' +
      '<stop offset="0" stop-color="' + c[0] + '"/><stop offset=".5" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></radialGradient></defs>' +
      '<ellipse cx="6.5" cy="7.5" rx="6" ry="7.3" fill="url(#' + id + ')"/>' +
      '<ellipse cx="4.4" cy="4.6" rx="1.3" ry="2.3" fill="#fff" opacity=".75" transform="rotate(-20 4.4 4.6)"/>' +
      '<path d="M5.4 14.7h2.2L6.5 16.2z" fill="' + c[2] + '"/>' +
      '<path d="M6.5 16.2 C5 21 8 26 6.5 34" fill="none" stroke="' + c[2] + '" stroke-opacity=".45" stroke-width=".7"/></svg>';
  }

  function clear(bar) {
    bar.classList.remove('lv-on');
    bar.querySelectorAll('.lv-in,.lv-pill,.lv-glint').forEach(function (el) { el.remove(); });
  }

  // first: whether this is the first paint of this visit (glint, sparkles and entrance only then)
  function render(bar, n, level, url, first) {
    clear(bar);
    if (!document.getElementById('lv-style')) {
      var st = document.createElement('style'); st.id = 'lv-style'; st.textContent = CSS; document.head.append(st);
    }
    var foil = FOILS[level] || FOILS[1];
    bar.classList.add('lv-on');
    var layer = document.createElement('div'); layer.className = 'lv-in';
    layer.innerHTML = '<div class="lv-rim"><i></i></div>';
    bar.prepend(layer);

    // anchor: the level gem; on phones the bar hides it, so the rightmost visible control
    var gem = bar.querySelector('.fil-top-level');
    var anchor = gem && gem.offsetWidth ? gem : null, phone = !anchor;
    if (phone) bar.querySelectorAll('a,button').forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.width && (!anchor || r.right > anchor.getBoundingClientRect().right)) anchor = el; });
    if (!anchor) return;
    var br = bar.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
    var right = ar.left - br.left - 14;

    if (n === 1 && first && !phone) {
      var g = document.createElement('i'); g.className = 'lv-glint';
      var host = gem.firstElementChild || gem; if (!host.style.position) host.style.position = 'relative'; host.append(g);
    }
    var count = [0, 3, 2, 1][n], gap = 15, lifts = [4, 0, 8];
    for (var i = 0; i < count; i++) {
      var b = document.createElement('div'); b.className = 'lv-b';
      b.style.left = (right - 13 - (count - 1 - i) * gap) + 'px';
      b.style.bottom = (2 - lifts[i % 3]) + 'px';
      b.style.animationDelay = (first ? 0.15 + i * 0.12 : 0) + 's,' + (0.9 + i * 0.45) + 's';
      if (!first) b.style.animationDuration = '.01s,4.6s';
      b.innerHTML = balloon(foil[i % 3], i); layer.append(b);
    }
    var clusterLeft = right - 13 - (count - 1) * gap;
    if (n === 1 && first) [[-8, 9], [count * gap + 4, 34], [Math.round(count * gap / 2), 14]].forEach(function (p, k) {
      var t = document.createElement('i'); t.className = 'lv-t';
      t.style.left = (clusterLeft + p[0]) + 'px'; t.style.top = p[1] + 'px'; t.style.animationDelay = (1 + k * 0.7) + 's';
      layer.append(t);
    });
    if (n < 3 && !phone) {
      var pill = document.createElement('a'); pill.className = 'lv-pill';
      pill.href = url; pill.target = '_blank'; pill.rel = 'noopener';
      pill.innerHTML = '<b></b> earned <span>Certificate →</span>';
      pill.querySelector('b').textContent = 'Level ' + level;
      if (!first) pill.style.animationDelay = '0s';
      bar.append(pill);
      var left = clusterLeft - 14 - pill.offsetWidth;
      // never over the logo: if the bar is too narrow, drop the pill
      var logo = bar.querySelector('.lms-topbar-logo');
      if (logo && left < logo.getBoundingClientRect().right - br.left + 12) pill.remove();
      else pill.style.left = left + 'px';
    }
  }

  // Draw into whichever bar is on screen, and redraw when the view or the window size changes.
  function mount(n, level, url) {
    var current = null, first = true, tries = 0, t = null;
    function visibleBar() {
      var bars = document.querySelectorAll('.lms-topbar');
      for (var i = 0; i < bars.length; i++) if (bars[i].offsetParent !== null && bars[i].offsetWidth) return bars[i];
      return null;
    }
    function tick() {
      var bar = visibleBar();
      if (bar !== current) {
        if (current) clear(current);
        current = bar;
        if (bar) { render(bar, n, level, url, first); first = false; }
      }
    }
    // the level gem fills in a moment after sign-in, so give it a beat before the first draw
    var wait = setInterval(function () {
      var bar = visibleBar(), gem = bar && bar.querySelector('.fil-top-level');
      if ((bar && gem && gem.offsetWidth) || (bar && ++tries > 6)) { clearInterval(wait); tick(); setInterval(tick, 800); }
    }, 500);
    window.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(function () { if (current) render(current, n, level, url, false); }, 200);
    });
  }

  window.lvMaybeCelebrate = function (cert) {
    try {
      if (!cert || !cert.ucid || !window.firebase) return;
      var issued = Date.parse(cert.issuedDate || '');
      if (!issued || Date.now() - issued > WINDOW_DAYS * 864e5) return;
      var u = firebase.auth().currentUser; if (!u) return;
      var key = 'lv-celebrate-' + cert.ucid, level = +cert.level || 1;
      var local = null; try { local = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
      if (local && Date.now() - local.at < VISIT_GAP_MS) {   // same visit: same stage, no new count
        if (local.n <= 3) mount(local.n, level, cert.url);
        return;
      }
      var ref = firebase.firestore().collection('users').doc(u.uid);
      ref.get().then(function (snap) {
        var seen = ((snap.exists && snap.data().celebrated) || {})[cert.ucid] || 0;
        var n = seen + 1;
        try { localStorage.setItem(key, JSON.stringify({ n: n, at: Date.now() })); } catch (e) {}
        if (seen >= 3) return;
        var mark = {}; mark[cert.ucid] = n;
        ref.set({ celebrated: mark }, { merge: true }).catch(function () {});
        mount(n, level, cert.url);
      }).catch(function () {});
    } catch (e) { /* the bar works fine without it */ }
  };
})();
