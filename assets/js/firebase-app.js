/* ==========================================================================
   AI Badge: Firebase Integration Layer
   Firebase v10+ compat SDK (CDN, no build step)
   ========================================================================== */

// Firebase config (placeholder values: Victor fills in real ones)
const firebaseConfig = {
  apiKey: "AIzaSyB2KopG32ymOjNXtk6G0zwtJikPcvt_0fU",
  authDomain: "ai-badge-2026.firebaseapp.com",
  projectId: "ai-badge-2026",
  storageBucket: "ai-badge-2026.firebasestorage.app",
  messagingSenderId: "835112059960",
  appId: "1:835112059960:web:1c30e27f6daff9f55292cd"
};

// Admin emails for elevated access
const ADMIN_EMAILS = ["victor@fiveinnolabs.com", "victordelrosal@gmail.com"];

/* --------------------------------------------------------------------------
   Initialisation
   -------------------------------------------------------------------------- */

var app = null;
var auth = null;
var db = null;

function initFirebase() {
  if (app) return; // already initialised
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();

  // Persistence disabled: was causing IndexedDB hangs that blocked
  // both sign-in and assessment saves for users with multiple tabs.
}

/* --------------------------------------------------------------------------
   Authentication
   -------------------------------------------------------------------------- */

async function signIn(email, password) {
  initFirebase();
  try {
    const credential = await auth.signInWithEmailAndPassword(email, password);
    await updateLastActive(credential.user.uid);
    logLogin(credential.user.uid);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

async function signInWithGoogle() {
  initFirebase();
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const credential = await auth.signInWithPopup(provider);
    await updateLastActive(credential.user.uid);
    logLogin(credential.user.uid);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

// NCI auto-enrol: any email ending in .ncirl.ie (staff, student, root tenant).
const NCI_DOMAIN_SUFFIX = ".ncirl.ie";
function isNciEmail(email) {
  if (!email) return false;
  const e = String(email).toLowerCase().trim();
  return e.endsWith(NCI_DOMAIN_SUFFIX) || e.endsWith("@ncirl.ie");
}

async function signInWithMicrosoft() {
  initFirebase();
  try {
    const provider = new firebase.auth.OAuthProvider("microsoft.com");
    // Prompt account picker so users on shared devices can choose.
    provider.setCustomParameters({ prompt: "select_account" });
    provider.addScope("openid");
    provider.addScope("email");
    provider.addScope("profile");
    const credential = await auth.signInWithPopup(provider);
    await updateLastActive(credential.user.uid);
    logLogin(credential.user.uid);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

async function createAccount(email, password) {
  initFirebase();
  try {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

async function sendVerificationEmail(user) {
  if (!user) return { success: false, error: "No user signed in" };
  try {
    await user.sendEmailVerification();
    return { success: true };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

async function reloadCurrentUser() {
  initFirebase();
  if (!auth.currentUser) return null;
  try {
    await auth.currentUser.reload();
    return auth.currentUser;
  } catch (error) {
    console.warn("reloadCurrentUser:", error);
    return auth.currentUser;
  }
}

async function signOut() {
  initFirebase();
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function onAuthChange(callback) {
  initFirebase();
  return auth.onAuthStateChanged(callback);
}

function getCurrentUser() {
  initFirebase();
  return auth.currentUser;
}

function isAuthenticated() {
  initFirebase();
  return !!auth.currentUser;
}

async function sendPasswordReset(email) {
  initFirebase();
  try {
    await auth.sendPasswordResetEmail(email);
    return { success: true };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

/* --------------------------------------------------------------------------
   Email-link (passwordless) sign-in for NCI
   Flow: user enters @ncirl.ie email → we send a one-time link → user clicks
   it in their NCI inbox → /verify.html completes sign-in and grants free
   access. No password ever required.
   -------------------------------------------------------------------------- */

const NCI_SIGNIN_RETURN_URL = "https://aibadge.fiveinnolabs.com/verify.html";
const NCI_EMAIL_STORAGE_KEY = "aibadge.nciSignInEmail";

async function sendNciSignInLink(email) {
  initFirebase();
  const target = String(email || "").trim().toLowerCase();
  if (!isNciEmail(target)) {
    return { success: false, error: "NCI email-link sign-in is only available for @ncirl.ie addresses." };
  }
  const actionCodeSettings = {
    url: NCI_SIGNIN_RETURN_URL,
    handleCodeInApp: true
  };
  try {
    await auth.sendSignInLinkToEmail(target, actionCodeSettings);
    try { window.localStorage.setItem(NCI_EMAIL_STORAGE_KEY, target); } catch (e) { /* private mode */ }
    return { success: true };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

function isNciSignInLink(url) {
  initFirebase();
  return auth.isSignInWithEmailLink(url || window.location.href);
}

async function completeEmailLinkSignIn(emailOverride) {
  initFirebase();
  const href = window.location.href;
  if (!auth.isSignInWithEmailLink(href)) {
    return { success: false, error: "This page was not opened from a valid sign-in link." };
  }
  let email = emailOverride && String(emailOverride).trim().toLowerCase();
  if (!email) {
    try { email = window.localStorage.getItem(NCI_EMAIL_STORAGE_KEY); } catch (e) { /* private mode */ }
  }
  if (!email) {
    return { success: false, error: "needEmail" };
  }
  try {
    const credential = await auth.signInWithEmailLink(email, href);
    try { window.localStorage.removeItem(NCI_EMAIL_STORAGE_KEY); } catch (e) { /* ignore */ }
    await updateLastActive(credential.user.uid);
    logLogin(credential.user.uid);
    if (isNciEmail(credential.user.email)) {
      try {
        await updateUserProfile(credential.user.uid, {
          email: credential.user.email,
          enrolled: true,
          enrolledAt: firebase.firestore.FieldValue.serverTimestamp(),
          enrolmentSource: "nci-magic-link"
        });
      } catch (e) { console.warn("NCI auto-enrol write failed:", e); }
    }
    return { success: true, user: credential.user };
  } catch (error) {
    return { success: false, error: _friendlyAuthError(error) };
  }
}

/* --------------------------------------------------------------------------
   User Profile (Firestore: users/{userId})
   -------------------------------------------------------------------------- */

async function getUserProfile(userId) {
  initFirebase();
  try {
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("getUserProfile:", error);
    return null;
  }
}

async function updateUserProfile(userId, data) {
  initFirebase();
  try {
    await db.collection("users").doc(userId).set(
      { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateLastActive(userId) {
  initFirebase();
  try {
    await db.collection("users").doc(userId).set(
      { lastActiveAt: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.warn("updateLastActive:", error);
  }
}

/* --------------------------------------------------------------------------
   Assessments (Firestore: users/{userId}/assessments/{type})
   type = "baseline" | "final"
   -------------------------------------------------------------------------- */

async function saveAssessment(userId, type, assessmentData) {
  initFirebase();
  try {
    const payload = {
      ...assessmentData,
      type: type,
      savedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db
      .collection("users")
      .doc(userId)
      .collection("assessments")
      .doc(type)
      .set(payload, { merge: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAssessment(userId, type) {
  initFirebase();
  try {
    const doc = await db
      .collection("users")
      .doc(userId)
      .collection("assessments")
      .doc(type)
      .get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("getAssessment:", error);
    return null;
  }
}

/* --------------------------------------------------------------------------
   Exercises (Firestore: users/{userId}/weeks/{weekNum}/exercises/{exerciseId})
   -------------------------------------------------------------------------- */

async function getExercises(userId, weekNum) {
  initFirebase();
  try {
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("weeks")
      .doc(String(weekNum))
      .collection("exercises")
      .orderBy("order", "asc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("getExercises:", error);
    return [];
  }
}

async function updateExercise(userId, weekNum, exerciseId, completed) {
  initFirebase();
  try {
    await db
      .collection("users")
      .doc(userId)
      .collection("weeks")
      .doc(String(weekNum))
      .collection("exercises")
      .doc(exerciseId)
      .set(
        {
          completed: completed,
          completedAt: completed
            ? firebase.firestore.FieldValue.serverTimestamp()
            : null
        },
        { merge: true }
      );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/* --------------------------------------------------------------------------
   Notes (Firestore: users/{userId} .noteForVictor)
   -------------------------------------------------------------------------- */

async function updateNote(userId, note) {
  initFirebase();
  try {
    await db.collection("users").doc(userId).set(
      {
        noteForVictor: note,
        noteUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/* --------------------------------------------------------------------------
   Programme Template (Firestore: programmes/default)
   -------------------------------------------------------------------------- */

async function getProgramme() {
  initFirebase();
  try {
    const doc = await db.collection("programmes").doc("default").get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("getProgramme:", error);
    return null;
  }
}

/* --------------------------------------------------------------------------
   Public / Lead Capture (Firestore: public_assessments)
   Layer 2: email-gated assessment for non-authenticated leads
   -------------------------------------------------------------------------- */

async function savePublicAssessment(email, assessmentData) {
  initFirebase();
  try {
    const payload = {
      email: email.toLowerCase().trim(),
      ...assessmentData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection("public_assessments").add(payload);
    return { success: true, id: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/* --------------------------------------------------------------------------
   Login Logging (Firestore: users/{userId}/logins/{autoId})
   -------------------------------------------------------------------------- */

async function logLogin(userId) {
  initFirebase();
  try {
    await db.collection("users").doc(userId).collection("logins").add({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      method: "web"
    });
  } catch (error) {
    console.warn("logLogin:", error);
  }
}

/* --------------------------------------------------------------------------
   Tutorial Completions (Firestore: users/{userId}/tutorial_completions/{tutorialId})
   -------------------------------------------------------------------------- */

async function saveTutorialCompletion(userId, tutorialId, completed) {
  initFirebase();
  try {
    var data = completed
      ? { completed: true, completedAt: firebase.firestore.FieldValue.serverTimestamp() }
      : { completed: false, completedAt: null };
    await db.collection("users").doc(userId).collection("tutorial_completions").doc(tutorialId).set(data, { merge: true });
    return { success: true };
  } catch (error) {
    console.warn("saveTutorialCompletion:", error);
    return { success: false, error: error.message };
  }
}

async function getTutorialCompletions(userId) {
  initFirebase();
  try {
    var snapshot = await db.collection("users").doc(userId).collection("tutorial_completions").get();
    var result = {};
    snapshot.docs.forEach(function(doc) {
      result[doc.id] = doc.data();
    });
    return result;
  } catch (error) {
    console.warn("getTutorialCompletions:", error);
    return {};
  }
}

/* --------------------------------------------------------------------------
   Exercise Submissions (Firestore: users/{userId}/submissions/{exerciseId})
   Generic schema reusable across exercises. Types: 'url' | 'text' | 'file'.
   -------------------------------------------------------------------------- */

async function saveSubmission(userId, exerciseId, data) {
  initFirebase();
  try {
    var payload = {
      exerciseId: exerciseId,
      type: data.type || 'url',
      value: data.value || '',
      status: data.status || 'submitted',
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (data.meta) payload.meta = data.meta;
    await db.collection("users").doc(userId).collection("submissions").doc(exerciseId).set(payload, { merge: true });
    return { success: true };
  } catch (error) {
    console.warn("saveSubmission:", error);
    return { success: false, error: error.message };
  }
}

async function getSubmission(userId, exerciseId) {
  initFirebase();
  try {
    var doc = await db.collection("users").doc(userId).collection("submissions").doc(exerciseId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.warn("getSubmission:", error);
    return null;
  }
}

async function deleteSubmission(userId, exerciseId) {
  initFirebase();
  try {
    var ref = db.collection("users").doc(userId).collection("submissions").doc(exerciseId);
    var snap = await ref.get();
    if (snap.exists) {
      var prior = snap.data() || {};
      var archive = {
        archivedAt: firebase.firestore.FieldValue.serverTimestamp(),
        prior: prior
      };
      await ref.collection("archive").add(archive);
    }
    await ref.delete();
    return { success: true };
  } catch (error) {
    console.warn("deleteSubmission:", error);
    return { success: false, error: error.message };
  }
}

async function getSubmissions(userId) {
  initFirebase();
  try {
    var snapshot = await db.collection("users").doc(userId).collection("submissions").get();
    var result = {};
    snapshot.docs.forEach(function(doc) { result[doc.id] = doc.data(); });
    return result;
  } catch (error) {
    console.warn("getSubmissions:", error);
    return {};
  }
}

/* --------------------------------------------------------------------------
   Admin Queries
   -------------------------------------------------------------------------- */

async function getAllActiveUsers() {
  initFirebase();
  const user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    console.warn("getAllActiveUsers: not authorised.");
    return [];
  }
  try {
    const snapshot = await db
      .collection("users")
      .where("status", "==", "active")
      .orderBy("lastActiveAt", "desc")
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("getAllActiveUsers:", error);
    return [];
  }
}

async function getAllUsers() {
  initFirebase();
  const user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    console.warn("getAllUsers: not authorised.");
    return [];
  }
  try {
    const snapshot = await db.collection("users").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("getAllUsers:", error);
    return [];
  }
}

async function setUserEnrolled(userId, enrolled) {
  initFirebase();
  const user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return { success: false, error: "Not authorised" };
  }
  return updateUserProfile(userId, { enrolled: enrolled });
}

async function getAdminUserHistory(userId) {
  initFirebase();
  var user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) return [];
  try {
    var snapshot = await db.collection("users").doc(userId)
      .collection("explorer_history").orderBy("completedAt", "desc").get();
    return snapshot.docs.map(function(doc) { return { id: doc.id, ...doc.data() }; });
  } catch (error) {
    console.warn("getAdminUserHistory:", error);
    return [];
  }
}

async function getAdminTutorialCompletions(userId) {
  initFirebase();
  var user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) return {};
  try {
    var snapshot = await db.collection("users").doc(userId)
      .collection("tutorial_completions").get();
    var result = {};
    snapshot.docs.forEach(function(doc) { result[doc.id] = doc.data(); });
    return result;
  } catch (error) {
    console.warn("getAdminTutorialCompletions:", error);
    return {};
  }
}

async function getAdminLoginHistory(userId) {
  initFirebase();
  var user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) return [];
  try {
    var snapshot = await db.collection("users").doc(userId)
      .collection("logins").orderBy("timestamp", "desc").limit(50).get();
    return snapshot.docs.map(function(doc) { return { id: doc.id, ...doc.data() }; });
  } catch (error) {
    console.warn("getAdminLoginHistory:", error);
    return [];
  }
}

async function getAdminAllSubmissions() {
  initFirebase();
  var user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) return [];
  try {
    var snapshot = await db.collectionGroup("submissions").get();
    return snapshot.docs.map(function(doc) {
      var parent = doc.ref.parent.parent;
      return Object.assign(
        { id: doc.id, userId: parent ? parent.id : null },
        doc.data()
      );
    });
  } catch (error) {
    console.error("getAdminAllSubmissions:", error);
    return [];
  }
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

function _friendlyAuthError(error) {
  const map = {
    "auth/user-not-found": "No account found with that email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Please contact support.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/invalid-credential": "Invalid email or password. Please try again.",
    "auth/invalid-action-code": "This sign-in link has already been used or has expired. Request a new one.",
    "auth/expired-action-code": "This sign-in link has expired. Request a new one.",
    "auth/missing-email": "Please enter your NCI email address.",
    "auth/unauthorized-continue-uri": "Sign-in link domain is not authorised. Contact victor@fiveinnolabs.com.",
    "auth/operation-not-allowed": "Email-link sign-in is not enabled yet. Contact victor@fiveinnolabs.com."
  };
  return map[error.code] || error.message;
}
