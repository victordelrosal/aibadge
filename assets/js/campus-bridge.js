/* THE CAMPUS BRIDGE (9 Oct 2026, Victor: "in aibadge.fiveinnolabs place the octagon at navbar to bridge it with aireckon.ing").
   The same five-floor Octagon as aireckon.ing's Campus toggle (floor N is AI Badge level N, in the five innovators' colours),
   in the landing navbar and the dashboard bar. It opens aireckon.ing straight into the Campus (?campus) in a new tab, so a
   lesson in progress is never lost; there the badge earned here builds the floors. Self-contained: its own markup and CSS. */
(function () {
  var HREF = 'https://aireckon.ing/?campus=1';
  var TIP = 'The Campus on aireckon.ing: your AI Badge level builds its floors';
  var floors = [[3, 17.6, 18], [5, 14.4, 14], [7, 11.2, 10], [9, 8, 6], [10.5, 4.8, 3]].map(function (f, i) {
    var x = f[0], y = f[1], w = f[2];
    return '<path class="f' + (i + 1) + '" d="M' + (x + 1) + ' ' + y + 'h' + (w - 2) + 'l1 1v1.2l-1 1h' + (2 - w) + 'l-1 -1v-1.2z"/>';
  }).join('');
  var ICON = '<svg class="cb-tw" viewBox="0 0 24 24" aria-hidden="true">' + floors + '<circle class="bc" cx="12" cy="3.4" r="0.9"/></svg>';
  var CSS = [
    '.cb-oct{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;flex:0 0 auto;border-radius:12px;text-decoration:none;cursor:pointer;',
    '  border:1px solid rgba(255,255,255,.16);background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03));transition:border-color .25s,box-shadow .25s,transform .2s}',
    '.cb-oct .cb-tw{width:24px;height:24px;overflow:visible}',
    '.cb-oct path{transition:fill-opacity .25s,transform .35s cubic-bezier(.2,.8,.2,1);fill-opacity:.85}',
    '.cb-oct .f1{fill:rgb(245,206,52)}.cb-oct .f2{fill:rgb(255,92,34)}.cb-oct .f3{fill:rgb(47,120,255)}.cb-oct .f4{fill:rgb(46,200,110)}.cb-oct .f5{fill:rgb(150,80,225)}',
    '.cb-oct .bc{fill:#fff;opacity:.7}',
    '.cb-oct:hover{border-color:rgba(143,184,255,.65);box-shadow:0 0 16px rgba(143,184,255,.35)}',
    '.cb-oct:hover path{fill-opacity:1}.cb-oct:hover .f2{transform:translateY(-.4px)}.cb-oct:hover .f3{transform:translateY(-.8px)}.cb-oct:hover .f4{transform:translateY(-1.2px)}.cb-oct:hover .f5,.cb-oct:hover .bc{transform:translateY(-1.6px)}',
    '.cb-oct:active{transform:scale(.95)}.cb-oct:focus-visible{outline:2px solid #8FB8FF;outline-offset:2px}',
    /* the dashboard bar is light (dark when the dashboard theme is dark) */
    '.lms-topbar .cb-oct{border-radius:50%;border-color:rgba(60,60,67,.14);background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.05)}',   /* round, like its neighbours */
    '.lms-topbar .cb-oct .bc{fill:#000036;opacity:.55}',
    '.lms-topbar .cb-oct:hover{border-color:rgba(0,122,255,.45);box-shadow:0 0 0 3px rgba(0,122,255,.10)}',
    '.lms-dark .lms-topbar .cb-oct,.lms-dark.lms-topbar .cb-oct{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14)}',
    '.lms-dark .lms-topbar .cb-oct .bc{fill:#fff;opacity:.7}',
    '@media (max-width:600px){#navbar .cb-oct{display:none}}',   /* phones: the landing bar keeps its room for Start free; the dashboard keeps the Octagon */
    '@media (prefers-reduced-motion:reduce){.cb-oct path{transition:none}.cb-oct:hover path{transform:none}}'
  ].join('\n');

  function make() {
    var a = document.createElement('a'); a.className = 'cb-oct'; a.href = HREF; a.target = '_blank'; a.rel = 'noopener';
    a.title = TIP; a.setAttribute('aria-label', TIP); a.innerHTML = ICON;
    return a;
  }
  function mount() {
    if (!document.getElementById('cb-oct-css')) { var st = document.createElement('style'); st.id = 'cb-oct-css'; st.textContent = CSS; document.head.appendChild(st); }
    var nav = document.querySelector('#navbar .lx-nav-right');   // the landing navbar: first in its right group
    if (nav && !nav.querySelector('.cb-oct')) nav.insertBefore(make(), nav.firstChild);
    var bar = document.querySelector('.lms-topbar'), tt = bar && bar.querySelector('.lms-theme-toggle');   // the dashboard: beside the theme switch
    if (tt && !bar.querySelector('.cb-oct')) tt.parentNode.insertBefore(make(), tt);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
