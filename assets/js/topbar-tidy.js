/* Tidy dashboard top bar (14 Oct 2026, Victor: "this has gone waaay too busy tidy it up please").
   The bar keeps Invite, the bell, the certificate, XP and the account photo. Explorer, Your Tree, the Campus,
   the theme switch, Admin, Membership and Sign Out move into one "More" menu at the far right.
   The original controls stay in the page, hidden, and the menu clicks them, so every script that anchors on
   them (account-card.js on Sign Out, campus-bridge.js on the theme switch) keeps working unchanged. */
(function () {
  var CSS = [
    '#view-dashboard .lms-topbar a[href="explore.html"],#view-dashboard .lms-topbar a[href="#/admin"],',
    '#view-dashboard .lms-topbar button[title="Your Tree"],#view-dashboard .lms-topbar .cb-oct,',
    '#view-dashboard .lms-topbar .lms-theme-toggle,#view-dashboard .lms-topbar .lms-signout-btn,',
    '#view-dashboard .lms-topbar .lms-invite-input{display:none !important}',
    '#view-dashboard .lms-topbar .lms-invite-btn{border-radius:999px}',
    '.tb-more{position:relative;flex:0 0 auto}',
    '.tb-more-btn{width:40px;height:40px;border-radius:50%;border:1px solid rgba(60,60,67,.14);background:#fff;color:#3c3c43;display:grid;place-items:center;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.05);transition:border-color .2s,transform .12s}',
    '.tb-more-btn:hover{border-color:rgba(0,122,255,.45)}.tb-more-btn:active{transform:scale(.94)}.tb-more-btn:focus-visible{outline:2px solid #007AFF;outline-offset:2px}',
    '.tb-more-btn svg{width:18px;height:18px}',
    '.tb-menu{position:absolute;top:50px;right:0;z-index:300;min-width:230px;padding:6px;border-radius:16px;background:#fff;border:1px solid rgba(60,60,67,.12);box-shadow:0 22px 60px rgba(0,0,40,.18),0 2px 8px rgba(0,0,40,.06);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;animation:tb-in .14s ease-out}',
    '@keyframes tb-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.tb-menu{animation:none}}',
    '.tb-menu[hidden]{display:none}',
    '.tb-item{display:flex;align-items:center;gap:12px;width:100%;min-height:42px;padding:8px 12px;border:none;border-radius:10px;background:none;color:#000036;font:500 14.5px/1.2 -apple-system,sans-serif;text-align:left;text-decoration:none;cursor:pointer}',
    '.tb-item:hover,.tb-item:focus-visible{background:rgba(0,122,255,.08);outline:none}',
    '.tb-item .tb-ic{width:22px;text-align:center;font-size:16px;line-height:1}',
    '.tb-item.gold{color:#7a5600;font-weight:600}.tb-item.red{color:#d70015}',
    '.tb-sep{height:1px;margin:5px 8px;background:rgba(60,60,67,.12)}',
    '.lms-dark .tb-more-btn{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);color:#f5f5f5}',
    '.lms-dark .tb-menu{background:#1c1c24;border-color:rgba(255,255,255,.1)}.lms-dark .tb-item{color:#f5f5f5}.lms-dark .tb-item.gold{color:#F5E7A0}.lms-dark .tb-item.red{color:#ff6961}',
    '.lms-dark .tb-sep{background:rgba(255,255,255,.1)}'
  ].join('\n');

  var DOTS = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

  function bar() { return document.querySelector('#view-dashboard .lms-topbar'); }
  function q(sel) { var b = bar(); return b && b.querySelector(sel); }
  function isDark() { var v = document.getElementById('view-dashboard'); return !!(v && v.classList.contains('lms-dark')); }

  function items() {
    var list = [];
    var fair = window.__fairMenu && window.__fairMenu();
    if (fair) list.push({ ic: '✨', label: fair.label, cls: 'gold', run: fair.run }, 'sep');
    list.push({ ic: '🧭', label: 'Explorer', run: function () { window.open('explore.html', '_blank'); } });
    if (q('button[title="Your Tree"]')) list.push({ ic: '🌳', label: 'Your Tree', run: function () { q('button[title="Your Tree"]').click(); } });
    if (q('.cb-oct')) list.push({ ic: '🏛️', label: 'Campus on aireckon.ing', run: function () { q('.cb-oct').click(); } });
    if (q('.lms-theme-toggle')) list.push({ ic: isDark() ? '☀️' : '🌙', label: isDark() ? 'Light mode' : 'Dark mode', run: function () { q('.lms-theme-toggle').click(); } });
    if (q('a[href="#/admin"]')) list.push({ ic: '⚙️', label: 'Admin', run: function () { location.hash = '#/admin'; } });
    list.push('sep', { ic: '↪️', label: 'Sign out', cls: 'red', run: function () { q('.lms-signout-btn').click(); } });
    return list;
  }

  function mount() {
    var out = q('.lms-signout-btn');
    if (!out || q('.tb-more')) return !!q('.tb-more');
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var wrap = document.createElement('div'); wrap.className = 'tb-more';
    wrap.innerHTML = '<button type="button" class="tb-more-btn" aria-haspopup="menu" aria-expanded="false" aria-label="More" title="More">' + DOTS + '</button><div class="tb-menu" role="menu" hidden></div>';
    out.after(wrap);   // always last on the bar, after the photo
    var btn = wrap.querySelector('.tb-more-btn'), menu = wrap.querySelector('.tb-menu');
    function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    function open() {
      menu.innerHTML = '';
      items().forEach(function (it) {
        if (it === 'sep') { var s = document.createElement('div'); s.className = 'tb-sep'; menu.appendChild(s); return; }
        var b = document.createElement('button'); b.type = 'button'; b.className = 'tb-item' + (it.cls ? ' ' + it.cls : ''); b.setAttribute('role', 'menuitem');
        var ic = document.createElement('span'); ic.className = 'tb-ic'; ic.textContent = it.ic;
        var lb = document.createElement('span'); lb.textContent = it.label;
        b.append(ic, lb);
        b.onclick = function () { close(); it.run(); };
        menu.appendChild(b);
      });
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
      var first = menu.querySelector('.tb-item'); if (first) first.focus({ preventScroll: true });
    }
    btn.onclick = function (e) { e.stopPropagation(); menu.hidden ? open() : close(); };
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
    return true;
  }

  var tries = 0;
  (function wait() { if (mount() || ++tries > 60) return; setTimeout(wait, 250); })();
})();
