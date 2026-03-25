// js/router.js
// Hash-based SPA router

export function initRouter(Alpine) {
  function parseHash() {
    const hash = window.location.hash || '#/';
    const parts = hash.slice(2).split('/');
    return { path: parts[0] || '', params: parts.slice(1) };
  }

  function route() {
    const auth = Alpine.store('auth');
    const ui = Alpine.store('ui');

    if (auth.loading) return;

    // Not logged in: always show landing
    if (!auth.isLoggedIn) {
      ui.view = 'landing';
      return;
    }

    const { path, params } = parseHash();

    switch (path) {
      case 'admin':
        ui.view = auth.isAdmin ? 'admin' : 'dashboard';
        break;

      case 'lesson':
        if (auth.isEnrolled && params[0] && params[1]) {
          ui.view = 'lesson';
          ui.activeModuleId = params[0];
          ui.activeLessonId = params[1];
        } else {
          ui.view = 'dashboard';
        }
        break;

      default:
        ui.view = 'dashboard';
        break;
    }
  }

  window.addEventListener('hashchange', route);

  return route;
}

export function navigate(hash) {
  window.location.hash = hash;
}
