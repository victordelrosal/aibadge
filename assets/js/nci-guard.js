/* NCI price guard (2 Nov 2026, Victor: "hide all pricing to nci students").
   Loaded synchronously in <head> so the class lands before the first paint. Any element tagged
   class="aib-price" is hidden on an NCI device; class="aib-nci-only" (a neutral stand-in) shows only there. A device counts as NCI once any of these is true:
   it arrived from a class hub (?code= / ?nci=), it holds the hub's class code this tab, an NCI address
   has ever signed in on it, or the signed-in profile carries an NCI roster marker. The mark is sticky
   (localStorage), so signing out does not bring prices back. */
(function () {
  var KEY = 'aibadge.nci.device';
  var MARKERS = ['cohort', 'classCode', 'onRoster', 'enrolmentSource', 'studentId', 'programme', 'className', 'nciRequest', 'nci'];
  var root = document.documentElement;

  function nciEmail(e) {
    e = String(e || '').trim().toLowerCase();
    return e.endsWith('.ncirl.ie') || e.endsWith('@ncirl.ie');
  }
  function mark() {
    root.classList.add('aib-nci');
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }
  function known() {
    try {
      var sp = new URLSearchParams(location.search);
      if (sp.get('code') || sp.get('nci')) return true;
      if (localStorage.getItem(KEY)) return true;
      if (sessionStorage.getItem('nci-class-code')) return true;
      for (var i = 0; i < localStorage.length; i++) { if ((localStorage.key(i) || '').indexOf('aibadge.nci.seen.') === 0) return true; }
    } catch (e) {}
    return false;
  }

  var css = document.createElement('style');
  css.textContent = 'html.aib-nci .aib-price{display:none!important}html:not(.aib-nci) .aib-nci-only{display:none!important}';
  (document.head || root).appendChild(css);
  if (known()) mark();

  window.aibNciDevice = function () { return root.classList.contains('aib-nci'); };
  window.aibMarkNci = mark;
  window.aibIsNciEmail = nciEmail;

  // Watch the signed-in account: an NCI address or any roster marker on the profile marks the device.
  setInterval(function () {
    if (root.classList.contains('aib-nci')) return;
    try {
      if (window.firebase && firebase.auth) {
        var u = firebase.auth().currentUser;
        if (u && (nciEmail(u.email) || (u.providerData || []).some(function (p) { return nciEmail(p && p.email); }))) mark();
      }
      var a = window.Alpine && Alpine.store && Alpine.store('auth');
      var p = a && a.profile;
      if (p) {
        if (nciEmail(p.email)) mark();
        for (var i = 0; i < MARKERS.length; i++) { var v = p[MARKERS[i]]; if (v !== undefined && v !== null && v !== '' && v !== false) { mark(); break; } }
      }
    } catch (e) {}
  }, 1000);
})();
