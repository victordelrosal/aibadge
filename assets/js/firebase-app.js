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

  // Keep users signed in across visits. LOCAL persistence survives a full
  // browser restart, so a returning NCI student only re-enters email + code
  // if they explicitly signed out. (Default is already LOCAL; set explicitly
  // so a future SDK default change can't silently log everyone out.)
  try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) { /* ignore */ }

  // Firestore offline persistence stays disabled: it was causing IndexedDB
  // hangs that blocked both sign-in and assessment saves for multi-tab users.
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
   NCI class-code free access (simpler gate, 2026-05-12)
   NCI students/staff enter their @ncirl.ie email plus a class code Victor
   shares verbally in lectures. If the code matches, we sign them into
   Firebase Auth using a fixed shared password so the same email resolves
   to the same UID across devices. No email verification loop required.

   Rotate the code by editing NCI_CLASS_CODES below and redeploying.
   Case-insensitive match.
   -------------------------------------------------------------------------- */

const NCI_FREE_ACCESS_PASSWORD = "nci-domain-claim-2026-fiveinnolabs";
const NCI_CLASS_CODES = ["NCI2026", "H9CEAI"]; // case-insensitive

function isValidNciClassCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return false;
  return NCI_CLASS_CODES.some(v => v.toUpperCase() === c);
}

/* --------------------------------------------------------------------------
   NCI cohort allow-list (the official class roster).
   Only emails on this list get instant access via the class-code path.
   Everyone else with a valid @ncirl.ie / @student.ncirl.ie address must
   self-register through the request-access flow (registerNciAccessRequest).
   To add/remove a student, edit this object and redeploy (git push).
   -------------------------------------------------------------------------- */
const NCI_ROSTER = {
  "x25115880@student.ncirl.ie": { firstName: "Obafemi", fullName: "Obafemi Akin-Laguda", studentId: "25115880", cohort: "PGDAIBUS_SEP" },
  "x24137561@student.ncirl.ie": { firstName: "Luan", fullName: "Luan Carlos Amaral Sandes", studentId: "24137561", cohort: "PGDAIBUS_SEP" },
  "x25130757@student.ncirl.ie": { firstName: "Andres", fullName: "Andres Arguello Pitt", studentId: "25130757", cohort: "PGDAIBUS_SEP" },
  "x25123238@student.ncirl.ie": { firstName: "Fuat", fullName: "Fuat Aygin", studentId: "25123238", cohort: "PGDAIBUS_SEP" },
  "x25115774@student.ncirl.ie": { firstName: "Namir", fullName: "Namir Ben", studentId: "25115774", cohort: "PGDAIBUS_SEP" },
  "x25120085@student.ncirl.ie": { firstName: "Tom", fullName: "Tom Crotty", studentId: "25120085", cohort: "PGDAIBUS_SEP" },
  "x20216114@student.ncirl.ie": { firstName: "Frank", fullName: "Frank Devins", studentId: "20216114", cohort: "PGDAIBUS_SEP" },
  "x25134621@student.ncirl.ie": { firstName: "Ross", fullName: "Ross Doherty", studentId: "25134621", cohort: "PGDAIBUS_SEP" },
  "x25130749@student.ncirl.ie": { firstName: "Brendan", fullName: "Brendan Dolan", studentId: "25130749", cohort: "PGDAIBUS_SEP" },
  "x17166080@student.ncirl.ie": { firstName: "Paula", fullName: "Paula Dowling", studentId: "17166080", cohort: "PGDAIBUS_SEP" },
  "x25134680@student.ncirl.ie": { firstName: "Sara", fullName: "Sara Eltayeb", studentId: "25134680", cohort: "PGDAIBUS_SEP" },
  "x20180861@student.ncirl.ie": { firstName: "Laura", fullName: "Laura Ferreira Motta", studentId: "20180861", cohort: "PGDAIBUS_SEP" },
  "x24132292@student.ncirl.ie": { firstName: "Mark", fullName: "Mark Galvin", studentId: "24132292", cohort: "PGDAIBUS_SEP" },
  "x15001725@student.ncirl.ie": { firstName: "William", fullName: "William Ho", studentId: "15001725", cohort: "PGDAIBUS_SEP" },
  "x25125133@student.ncirl.ie": { firstName: "Jasson", fullName: "Jasson Ji", studentId: "25125133", cohort: "PGDAIBUS_SEP" },
  "x25123114@student.ncirl.ie": { firstName: "Ganesh", fullName: "Ganesh Karnambakkam Babu", studentId: "25123114", cohort: "PGDAIBUS_SEP" },
  "x25155237@student.ncirl.ie": { firstName: "Daniel", fullName: "Daniel Kelly", studentId: "25155237", cohort: "PGDAIBUS_SEP" },
  "x25132644@student.ncirl.ie": { firstName: "Ozgul", fullName: "Ozgul Kilinc", studentId: "25132644", cohort: "PGDAIBUS_SEP" },
  "x25118447@student.ncirl.ie": { firstName: "Amay", fullName: "Amay Kumar", studentId: "25118447", cohort: "PGDAIBUS_SEP" },
  "x25159704@student.ncirl.ie": { firstName: "Vinod", fullName: "Vinod Madan", studentId: "25159704", cohort: "PGDAIBUS_SEP" },
  "x17115949@student.ncirl.ie": { firstName: "Kevin", fullName: "Kevin Mccarthy", studentId: "17115949", cohort: "PGDAIBUS_SEP" },
  "x25146041@student.ncirl.ie": { firstName: "John", fullName: "John O Callaghan", studentId: "25146041", cohort: "PGDAIBUS_SEP" },
  "x25140094@student.ncirl.ie": { firstName: "Manus", fullName: "Manus Ó Dálaigh", studentId: "25140094", cohort: "PGDAIBUS_SEP" },
  "x25126466@student.ncirl.ie": { firstName: "Elizabeth", fullName: "Elizabeth Oladipo", studentId: "25126466", cohort: "PGDAIBUS_SEP" },
  "x25115839@student.ncirl.ie": { firstName: "Diana", fullName: "Diana Parau", studentId: "25115839", cohort: "PGDAIBUS_SEP" },
  "x25113160@student.ncirl.ie": { firstName: "Fabio", fullName: "Fabio Poli", studentId: "25113160", cohort: "PGDAIBUS_SEP" },
  "x25113046@student.ncirl.ie": { firstName: "Pedro", fullName: "Pedro Queiroga", studentId: "25113046", cohort: "PGDAIBUS_SEP" },
  "x25115871@student.ncirl.ie": { firstName: "Syamalarao", fullName: "Syamalarao Rakoti", studentId: "25115871", cohort: "PGDAIBUS_SEP" },
  "x25119371@student.ncirl.ie": { firstName: "Nagarajan", fullName: "Nagarajan Ramu", studentId: "25119371", cohort: "PGDAIBUS_SEP" },
  "x25134655@student.ncirl.ie": { firstName: "Rohith", fullName: "Rohith Ray", studentId: "25134655", cohort: "PGDAIBUS_SEP" },
  "x25111485@student.ncirl.ie": { firstName: "Naomi", fullName: "Naomi Del Carmen Santana Sosa", studentId: "25111485", cohort: "PGDAIBUS_SEP" },
  "x25128442@student.ncirl.ie": { firstName: "Nadiya", fullName: "Nadiya Sydorenko", studentId: "25128442", cohort: "PGDAIBUS_SEP" },
  "x25137972@student.ncirl.ie": { firstName: "Sebastian", fullName: "Sebastian Thim", studentId: "25137972", cohort: "PGDAIBUS_SEP" },
  "x24323870@student.ncirl.ie": { firstName: "Rashmi", fullName: "Rashmi Belimagga Shetty Manjunath", studentId: "24323870", cohort: "MSCAIBUSJAN26I" },
  "x25104403@student.ncirl.ie": { firstName: "Aleyna", fullName: "Aleyna Eski", studentId: "25104403", cohort: "MSCAIBUSJAN26I" },
  "x25155717@student.ncirl.ie": { firstName: "Chris", fullName: "Chris Crasto Gomes", studentId: "25155717", cohort: "MSCAIBUSJAN26I" },
  "x24160873@student.ncirl.ie": { firstName: "Axel", fullName: "Axel Adewale Ilenre", studentId: "24160873", cohort: "MSCAIBUSJAN26I" },
  "x25211013@student.ncirl.ie": { firstName: "Navera", fullName: "Navera Fatima Kurnool", studentId: "25211013", cohort: "MSCAIBUSJAN26I" },
  "x24266213@student.ncirl.ie": { firstName: "Dnyanesh", fullName: "Dnyanesh Kailas Mali", studentId: "24266213", cohort: "MSCAIBUSJAN26I" },
  "x25161474@student.ncirl.ie": { firstName: "Onyinyechi", fullName: "Onyinyechi Miracle Obodoeze", studentId: "25161474", cohort: "MSCAIBUSJAN26I" },
  "x25128558@student.ncirl.ie": { firstName: "Darshankumar", fullName: "Darshankumar Sureshbhai Savaj", studentId: "25128558", cohort: "MSCAIBUSJAN26I" },
  "x25236482@student.ncirl.ie": { firstName: "Giovanni", fullName: "Giovanni Sottana", studentId: "25236482", cohort: "MSCAIBUSJAN26I" },
  "x25145924@student.ncirl.ie": { firstName: "Cathal", fullName: "Cathal Wall", studentId: "25145924", cohort: "MSCAIBUSJAN26I" },
  "x25200992@student.ncirl.ie": { firstName: "Puneet", fullName: "Puneet Warathe", studentId: "25200992", cohort: "MSCAIBUSJAN26I" },
  "x25205048@student.ncirl.ie": { firstName: "Saw", fullName: "Saw Yamin Thwe", studentId: "25205048", cohort: "MSCAIBUSJAN26I" },
  "x00341506@student.ncirl.ie": { firstName: "Manuel", fullName: "Manuel Ahumada", studentId: "00341506", cohort: "MSCAIBUSJAN26I" }
};

function getNciRosterEntry(email) {
  const e = String(email || "").trim().toLowerCase();
  return NCI_ROSTER[e] || null;
}

// NCI student emails look like x25115880@student.ncirl.ie. Pull the digits so
// self-registered students (not on the roster) still get an ID in the navbar.
function deriveStudentIdFromEmail(email) {
  const local = String(email || "").trim().toLowerCase().split("@")[0];
  const m = local.match(/^x?(\d{5,})$/);
  return m ? m[1] : "";
}

// Per-device "have we greeted this email before" flag. Drives Welcome vs
// Welcome back without depending on a Firestore read race at sign-in.
function nciMarkSeenReturnFirstTime(email) {
  try {
    const k = "aibadge.nci.seen." + String(email || "").trim().toLowerCase();
    const seen = window.localStorage.getItem(k);
    window.localStorage.setItem(k, "1");
    return !seen;
  } catch (e) { return false; }
}

// Sign in (or create) the shared NCI account for an email. Throws on real errors.
async function _nciAuthenticate(target) {
  try {
    return await auth.signInWithEmailAndPassword(target, NCI_FREE_ACCESS_PASSWORD);
  } catch (signInErr) {
    if (signInErr.code === "auth/user-not-found"
        || signInErr.code === "auth/invalid-credential"
        || signInErr.code === "auth/wrong-password") {
      return await auth.createUserWithEmailAndPassword(target, NCI_FREE_ACCESS_PASSWORD);
    }
    throw signInErr;
  }
}

// Class-code path: ONLY roster students get in here. Non-roster NCI emails
// are bounced back with { notOnRoster: true } so the UI can offer the
// request-access registration flow.
async function signInOrCreateNciFreeAccount(email, classCode) {
  initFirebase();
  const target = String(email || "").trim().toLowerCase();
  if (!isNciEmail(target)) {
    return { success: false, error: "Free access is only available for @ncirl.ie addresses." };
  }
  if (!isValidNciClassCode(classCode)) {
    return { success: false, error: "That class code isn't right. Ask Victor for the current code." };
  }
  const entry = getNciRosterEntry(target);
  if (!entry) {
    return {
      success: false,
      notOnRoster: true,
      error: "We couldn't find your student email on the class list."
    };
  }
  let credential;
  try {
    credential = await _nciAuthenticate(target);
  } catch (err) {
    return { success: false, error: _friendlyAuthError(err) };
  }
  await updateLastActive(credential.user.uid);
  logLogin(credential.user.uid);
  try {
    await updateUserProfile(credential.user.uid, {
      email: credential.user.email,
      enrolled: true,
      enrolledAt: firebase.firestore.FieldValue.serverTimestamp(),
      enrolmentSource: "nci-roster",
      classCode: String(classCode || "").trim().toUpperCase(),
      firstName: entry.firstName,
      fullName: entry.fullName,
      displayName: entry.fullName,
      studentId: entry.studentId,
      cohort: entry.cohort,
      onRoster: true
    });
  } catch (e) { console.warn("NCI roster enrol write failed:", e); }
  return { success: true, user: credential.user };
}

// Request-access path: a valid NCI email NOT on the roster self-registers
// (first name, surname, class, programme, email confirmation) with the class
// code in lieu of a password. Saved to the users database and granted access
// immediately. Flagged onRoster:false / accessRequested:true so Victor can see
// who self-enrolled in /#/admin.
async function registerNciAccessRequest(opts) {
  initFirebase();
  opts = opts || {};
  const target = String(opts.email || "").trim().toLowerCase();
  if (!isNciEmail(target)) {
    return { success: false, error: "Access requests are only for @ncirl.ie or @student.ncirl.ie addresses." };
  }
  if (!isValidNciClassCode(opts.classCode)) {
    return { success: false, error: "That class code isn't right. Ask Victor for the current code." };
  }
  const firstName = String(opts.firstName || "").trim();
  const surname = String(opts.surname || "").trim();
  if (!firstName || !surname) {
    return { success: false, error: "Please enter your first name and surname." };
  }
  const fullName = (firstName + " " + surname).replace(/\s+/g, " ").trim();
  let credential;
  try {
    credential = await _nciAuthenticate(target);
  } catch (err) {
    return { success: false, error: _friendlyAuthError(err) };
  }
  await updateLastActive(credential.user.uid);
  logLogin(credential.user.uid);
  try {
    await updateUserProfile(credential.user.uid, {
      email: credential.user.email,
      enrolled: true,
      enrolledAt: firebase.firestore.FieldValue.serverTimestamp(),
      enrolmentSource: "nci-access-request",
      classCode: String(opts.classCode || "").trim().toUpperCase(),
      firstName: firstName,
      surname: surname,
      fullName: fullName,
      displayName: fullName,
      studentId: deriveStudentIdFromEmail(target),
      className: String(opts.className || "").trim(),
      programme: String(opts.programme || "").trim(),
      onRoster: false,
      accessRequested: true,
      accessRequestedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) { console.warn("NCI access-request write failed:", e); }
  return { success: true, user: credential.user };
}

/* --------------------------------------------------------------------------
   Email-link (passwordless) sign-in for NCI (DEPRECATED 2026-05-12)
   Replaced by signInOrCreateNciFreeAccount above because NCI's M365 filter
   quarantined the verification emails. Kept in code in case we revive it.
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
  // Denormalised counters on the user doc for fast admin analytics.
  recordLoginMetrics(userId);
}

/* --------------------------------------------------------------------------
   Engagement tracking (login frequency + foreground engaged time)
   All written to the users/{uid} doc, so the existing owner/admin rules
   already cover it (no firestore.rules change). Accrues from deploy forward.
   -------------------------------------------------------------------------- */

async function recordLoginMetrics(userId) {
  initFirebase();
  if (!userId) return;
  try {
    await db.collection("users").doc(userId).set({
      loginCount: firebase.firestore.FieldValue.increment(1),
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeenAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) { console.warn("recordLoginMetrics:", error); }
}

var _aibHeartbeat = { interval: null, last: 0, uid: null, bound: false };

// Counts only foreground time, in ~60s ticks, capped 1s-5min per tick so an
// idle/asleep tab does not inflate engaged time. Approximate but honest.
function startEngagementHeartbeat(userId) {
  initFirebase();
  if (!userId) return;
  if (_aibHeartbeat.uid === userId && _aibHeartbeat.interval) return;
  stopEngagementHeartbeat();
  _aibHeartbeat.uid = userId;
  _aibHeartbeat.last = Date.now();
  try {
    db.collection("users").doc(userId).set(
      { lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } catch (e) { /* ignore */ }
  _aibHeartbeat.interval = setInterval(function () {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    var now = Date.now();
    var delta = now - _aibHeartbeat.last;
    _aibHeartbeat.last = now;
    var patch = { lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (delta > 1000 && delta < 5 * 60 * 1000) {
      patch.totalEngagedMs = firebase.firestore.FieldValue.increment(delta);
    }
    try { db.collection("users").doc(_aibHeartbeat.uid).set(patch, { merge: true }); } catch (e) { /* ignore */ }
  }, 60000);
  if (!_aibHeartbeat.bound && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () { _aibHeartbeat.last = Date.now(); });
    _aibHeartbeat.bound = true;
  }
}

function stopEngagementHeartbeat() {
  if (_aibHeartbeat.interval) { clearInterval(_aibHeartbeat.interval); _aibHeartbeat.interval = null; }
  _aibHeartbeat.uid = null;
}

// Admin: batch-load tutorial completions for many users (per-user reads, which
// the existing nested rule already permits for admins). Returns { uid: {tutId:{...}} }.
async function getAdminAllTutorialCompletions(userIds) {
  initFirebase();
  var user = getCurrentUser();
  if (!user || !ADMIN_EMAILS.includes(user.email)) return {};
  var out = {};
  await Promise.all((userIds || []).map(async function (uid) {
    try { out[uid] = await getAdminTutorialCompletions(uid); }
    catch (e) { out[uid] = {}; }
  }));
  return out;
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
   Viral Tree (referrals) - money-free for now.
   Each user gets a shareable code (referral_codes/{code} -> uid). When a new
   account is created through a ?ref=CODE link, we write a referrals edge
   owned by the referred user. The referrer's tree is just a query of edges
   where referrerId == them. A "token" today = one signed-up referral.
   Later: flip status signed_up -> paid (admin/server) and pay commission.
   -------------------------------------------------------------------------- */

var REFERRAL_PENDING_KEY = "aibadge.ref";
var REFERRAL_PENDING_TS_KEY = "aibadge.ref.ts";
var REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Read ?ref=CODE on page load and stash it so it survives the Google popup
// round-trip. Call once at startup. Never overwrites a fresher pending ref.
function captureReferralParam() {
  try {
    var params = new URLSearchParams(window.location.search || "");
    var code = (params.get("ref") || "").trim();
    if (!code) return;
    code = code.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    if (!code) return;
    window.localStorage.setItem(REFERRAL_PENDING_KEY, code);
    window.localStorage.setItem(REFERRAL_PENDING_TS_KEY, String(Date.now()));
  } catch (e) { /* private mode / no storage */ }
}

function _readPendingReferral() {
  try {
    var code = window.localStorage.getItem(REFERRAL_PENDING_KEY);
    var ts = parseInt(window.localStorage.getItem(REFERRAL_PENDING_TS_KEY) || "0", 10);
    if (!code) return null;
    if (ts && (Date.now() - ts) > REFERRAL_TTL_MS) { _clearPendingReferral(); return null; }
    return code;
  } catch (e) { return null; }
}

function _clearPendingReferral() {
  try {
    window.localStorage.removeItem(REFERRAL_PENDING_KEY);
    window.localStorage.removeItem(REFERRAL_PENDING_TS_KEY);
  } catch (e) { /* ignore */ }
}

function _slugForCode(profile, email) {
  var base = "";
  if (profile && profile.firstName) base = profile.firstName;
  else if (profile && profile.fullName) base = profile.fullName;
  else if (email) base = String(email).split("@")[0];
  base = String(base).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  if (!base) base = "ai";
  return base;
}

function _randSuffix() {
  // 4 chars, no Date/crypto dependency assumptions; Math.random is fine here.
  return Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 4).padEnd(4, "0");
}

// Resolve a referral code to its owner uid (public read).
async function resolveReferralCode(code) {
  initFirebase();
  if (!code) return null;
  try {
    var doc = await db.collection("referral_codes").doc(String(code).toLowerCase()).get();
    if (!doc.exists) return null;
    var data = doc.data();
    return data && data.uid ? data.uid : null;
  } catch (e) {
    console.warn("resolveReferralCode:", e.message);
    return null;
  }
}

// Make sure this user has a referral code; create one if missing.
// Returns the code. Safe to call repeatedly (idempotent once set).
async function ensureReferralCode(userId, profile, email) {
  initFirebase();
  if (!userId) return null;
  if (profile && profile.referralCode) return profile.referralCode;
  var attempt = 0;
  while (attempt < 5) {
    var code = _slugForCode(profile, email) + "-" + _randSuffix();
    try {
      var existing = await db.collection("referral_codes").doc(code).get();
      if (existing.exists) { attempt++; continue; }
      await db.collection("referral_codes").doc(code).set({
        uid: userId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await updateUserProfile(userId, { referralCode: code });
      if (profile) profile.referralCode = code;
      return code;
    } catch (e) {
      console.warn("ensureReferralCode:", e.message);
      attempt++;
    }
  }
  return null;
}

// On a brand-new account, consume any pending ?ref= and write the edge.
// referredId is always the new user (enforced by rules). No self-referral.
async function consumePendingReferral(newUserId, newUserEmail) {
  initFirebase();
  if (!newUserId) return;
  var code = _readPendingReferral();
  if (!code) return;
  try {
    var referrerId = await resolveReferralCode(code);
    if (!referrerId || referrerId === newUserId) { _clearPendingReferral(); return; }
    // Guard against duplicate edges for the same referred user.
    var dupe = await db.collection("referrals")
      .where("referredId", "==", newUserId).limit(1).get();
    if (!dupe.empty) { _clearPendingReferral(); return; }
    await db.collection("referrals").add({
      referrerId: referrerId,
      referredId: newUserId,
      referredEmail: (newUserEmail || "").toLowerCase(),
      referralCode: code,
      status: "signed_up",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn("consumePendingReferral:", e.message);
  }
  _clearPendingReferral();
}

// The referrer's tree: every signup that came through their link.
async function getMyReferrals(userId) {
  initFirebase();
  if (!userId) return [];
  try {
    var snap = await db.collection("referrals")
      .where("referrerId", "==", userId).get();
    var rows = snap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); });
    rows.sort(function(a, b) {
      var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
      var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
      return tb - ta;
    });
    return rows;
  } catch (e) {
    console.warn("getMyReferrals:", e.message);
    return [];
  }
}

// Tree level ladder (cosmetic status; no monetary meaning).
function referralTreeLevel(count) {
  count = count || 0;
  var levels = [
    { min: 0,  name: "Seedling", emoji: "🌱" },
    { min: 1,  name: "Sprout",   emoji: "🌿" },
    { min: 3,  name: "Sapling",  emoji: "🪴" },
    { min: 6,  name: "Tree",     emoji: "🌳" },
    { min: 12, name: "Forest",   emoji: "🌲" }
  ];
  var current = levels[0], next = null;
  for (var i = 0; i < levels.length; i++) {
    if (count >= levels[i].min) current = levels[i];
    else { next = levels[i]; break; }
  }
  return { level: current, next: next, count: count };
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
