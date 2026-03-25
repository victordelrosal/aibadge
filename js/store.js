// js/store.js
// Alpine.js shared state: auth, UI view

export function registerStores(Alpine) {
  Alpine.store('auth', {
    user: null,
    profile: null,
    loading: true,

    get isLoggedIn() {
      return !!this.user;
    },

    get isEnrolled() {
      return this.profile?.enrolled === true;
    },

    get isAdmin() {
      return this.user?.email === 'victor@fiveinnolabs.com';
    },

    setUser(user) {
      this.user = user;
    },

    setProfile(profile) {
      this.profile = profile;
    },

    setLoading(val) {
      this.loading = val;
    }
  });

  Alpine.store('ui', {
    view: 'landing',
    activeModal: null,
    activeModuleId: null,
    activeLessonId: null,

    showModal(name) {
      this.activeModal = name;
      document.body.style.overflow = 'hidden';
    },

    closeModal() {
      this.activeModal = null;
      document.body.style.overflow = '';
    }
  });
}
