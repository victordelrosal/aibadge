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

let app = null;
let auth = null;
let db = null;

function initFirebase() {
  if (app) return; // already initialised
  app = firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();

  // Enable offline persistence (best-effort, fails silently in some browsers)
  db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Firestore persistence unavailable: multiple tabs open.");
    } else if (err.code === "unimplemented") {
      console.warn("Firestore persistence not supported in this browser.");
    }
  });
}

/* --------------------------------------------------------------------------
   Authentication
   -------------------------------------------------------------------------- */

async function signIn(email, password) {
  initFirebase();
  try {
    const credential = await auth.signInWithEmailAndPassword(email, password);
    await updateLastActive(credential.user.uid);
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
    "auth/invalid-credential": "Invalid email or password. Please try again."
  };
  return map[error.code] || error.message;
}
