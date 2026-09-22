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
const NCI_CLASS_CODES = ["NCI2026", "H9CEAI", "9BDAIB", "BDAIB"]; // case-insensitive

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
  /* Emptied 2026-09-20: this file is public, so the two older cohorts
     (PGDAIBUS_SEP, MSCAIBUSJAN26I) moved into NCI_ROSTER_HASHED below,
     same as CBAIPE_SEP26. Names come from Firebase profiles or are asked
     once at sign-up (needsName flow). */
};

/* --------------------------------------------------------------------------
   Hashed cohort list. This file is served publicly, so newer cohorts are kept
   as SHA-256 of the student email and nothing else: membership can be checked,
   but the list cannot be read. The student supplies their name once at sign-up
   and the student number comes out of their own email address.
   Added 2026-09-17 for CBAIPE_SEP26 (32 students).
   -------------------------------------------------------------------------- */
const NCI_ROSTER_HASHED = {
  "f927adaba958549939fb56a275bcd614477ac15e61e58d9650fbb6cd339122f3": { cohort: "CBAIPE_SEP26" },
  "e2f017a7388078c08ddb8b21ca2e28bcb621e2a774b0dbb5bd44759218e87186": { cohort: "CBAIPE_SEP26" },
  "efc74b814a873816490749876cd90c0d96966ef69fdb295b1951a9b3656e0b15": { cohort: "CBAIPE_SEP26" },
  "7f7d47bc3570b82e5353ec07d1cacf91262c782360a0b4420d7aafbde73bf28e": { cohort: "CBAIPE_SEP26" },
  "43aeb0a77351e7aef7cc9f1ebaa0a2d23c3359b1ff3fc8b03208d357c66f78dc": { cohort: "CBAIPE_SEP26" },
  "398bb936249cc0f8a0941773257678a14ed12a565e181730fe4c6ae180bae88e": { cohort: "CBAIPE_SEP26" },
  "54bf8b98a0ee2eb49ab4cd541b59ebb0f5ccb54454bb4bbc9e77cb9e07bbcbb0": { cohort: "CBAIPE_SEP26" },
  "453071efb8dc6165da24fd30739bbd72a22ce860d49e4a654aad74bb2d750c34": { cohort: "CBAIPE_SEP26" },
  "1b413d8c8eaa8dc2b04a7c6d265bd4e3af7b1f84757797d041ce24d9648f99ce": { cohort: "CBAIPE_SEP26" },
  "b37752d9b5f48d8f7ef0e9d4bf7cbdc6164586768f5881254388a080aee05139": { cohort: "CBAIPE_SEP26" },
  "3a806c099d49c9361b320fdb2e49ea5b63a6c2f425c70571e1205778ea7e141b": { cohort: "CBAIPE_SEP26" },
  "df2755f4a00b680273017b8b963d2557db384cc444292136c7bbedca62095df3": { cohort: "CBAIPE_SEP26" },
  "b76a1df4622aa7dea8202b28078889f9a1ef8b6a0b081dab5197e7fce7248627": { cohort: "CBAIPE_SEP26" },
  "4f511c5074fc91e3aac1ccbb4c47b6b4cd6b0da820815c1ced08e9f6b797284b": { cohort: "CBAIPE_SEP26" },
  "813ce83076b0442405bc6691b5507f9f0f2bb74b82d7140361f38c69fd92eba9": { cohort: "CBAIPE_SEP26" },
  "0fd9beb26ffffec530ee85a563c5ac9efbfca2ab088cf0e0ca65cda3fe089d60": { cohort: "CBAIPE_SEP26" },
  "7f0e650155761b2f940b0d19274cc689775495a5aea2c9110caf0e1467a0ba96": { cohort: "CBAIPE_SEP26" },
  "5ffd87a3a287b22436f8f53211021ed9f4c1364b57ac3051c94e042ded96f561": { cohort: "CBAIPE_SEP26" },
  "236a9c3870aabd4ddd11b2ce5773ace6d792139c53db937e620b21a653b12ac7": { cohort: "CBAIPE_SEP26" },
  "3b995bccc84fee801bf7c583675e6ec28ad2a2c779420e3bd5d0cc7b7867bf51": { cohort: "CBAIPE_SEP26" },
  "334394ef2d61667fa5b3454a165d75110bcea57b8a9629451d349a94512dfb85": { cohort: "CBAIPE_SEP26" },
  "1bdb1fdd4c102bde4c9e6230b70052947ba06a495302c474fefb566d9f37dd05": { cohort: "CBAIPE_SEP26" },
  "949111d7c7ff31048b25977f23cc6b7fafe6924f1812a7a7c71e3b919b44e9a4": { cohort: "CBAIPE_SEP26" },
  "ac2cdc045cfd50384fa392d42fa3f935b802235e68e0e805147127a85e0290db": { cohort: "CBAIPE_SEP26" },
  "7ee8b830b3bbb6c7f9f24bba9310252c05e3c765eba2ee909413b058cb12d1ae": { cohort: "CBAIPE_SEP26" },
  "9aeb03310b4551688f43ec867895feaff5f23fd918022472ededba81234763ff": { cohort: "CBAIPE_SEP26" },
  "448c003e5cf67f03051cfe7f0466df039b075b157221a03c4f29111144a2d72a": { cohort: "CBAIPE_SEP26" },
  "baad56642e68362f5878c3e1b3052deed165ec0b04f8fb9bc23b2d9f50c13591": { cohort: "CBAIPE_SEP26" },
  "bc8680fdb8ef330383c8475579c87e792e5a90f8f7649145fb46e57d19ef56cb": { cohort: "CBAIPE_SEP26" },
  "06f288e42b8d609d5a2f29e722bb36fcb02a34bf8f6d48b977f95325566264ae": { cohort: "CBAIPE_SEP26" },
  "5060b303c8761067cf6acc13bad489471a2dd297eef259619996aadf54f458ad": { cohort: "CBAIPE_SEP26" },
  "a4e67429116c6a48451cecba38e5dfaf5f5358f0f2d5c70dd46ee449a3df8456": { cohort: "CBAIPE_SEP26" },
  /* PGDAIBUS_SEP + MSCAIBUSJAN26I, hashed 2026-09-20 (46 entries) */
  "9f5b9ab1431c8d367f16f9fdea54a0ca0370de8829dd8ec148aee81570317e42": { cohort: "PGDAIBUS_SEP" },
  "5bd67878b4b4310edea48fb22d4a6b7d91e693efe42c63163a5c09e2078d513c": { cohort: "PGDAIBUS_SEP" },
  "f15dcd9066bc5599401f8ce69dd56c8a67600bce8f2eb3af90cda6b1454151e5": { cohort: "PGDAIBUS_SEP" },
  "1ff3701886b8751f94a23a760b713101a5015a2500ccf4f5480c72a4ca29546a": { cohort: "PGDAIBUS_SEP" },
  "8a330484a3d24741c891907d76e26e7a3d44be26bd10702e135f031f7a8f4be1": { cohort: "PGDAIBUS_SEP" },
  "4e509ed9bd5e39d5c251ddfc13d86ba00a5ddaffb783cc611bbe37fae8de5bdc": { cohort: "PGDAIBUS_SEP" },
  "84ec5b9707540663e09e9f81b2323fa889b23dd83ad91dc44d90989ad28b9a82": { cohort: "PGDAIBUS_SEP" },
  "e8ab84a4d3cc305e1c804d858ef09d79843c5a0817b48735b564232ec0c30a5a": { cohort: "PGDAIBUS_SEP" },
  "cf7c25528f088e9dfd57435aeedd4e61f1dabaaba59b80e46baf62b926729a0f": { cohort: "PGDAIBUS_SEP" },
  "6995bf1d9c4e5010bdac12c1534828f309628086394281a1ba45baf215c924e8": { cohort: "PGDAIBUS_SEP" },
  "3ed6a10ab90698b24f7383833ab51c90857dedd6b5352f87d9b76afacc4562a1": { cohort: "PGDAIBUS_SEP" },
  "25de6d23d079a15d97c4b0e4094139cb5cc54ca0a00af137aad04574629dedb4": { cohort: "PGDAIBUS_SEP" },
  "69e5db8d94127a02636d218a3fbfc720acf58fb041e561d95b4e3686dcfb11cb": { cohort: "PGDAIBUS_SEP" },
  "f1a5d1144e2205926d2ed744e14e1bcfef57fafda83ac2c1a6847ebaeaed22ad": { cohort: "PGDAIBUS_SEP" },
  "d6be9fd7906bac94818c5d78ff000b6b42b127ab4931e24783bf4c627329969b": { cohort: "PGDAIBUS_SEP" },
  "5f8f688baec92f3d3ad221d361463b4125a468d2d80d0b65e1bb6d7db5e233f0": { cohort: "PGDAIBUS_SEP" },
  "357c87c8f32bc432263a08f5993f94bdcc75067f2f2aa28cb6a0b18cd5c864b4": { cohort: "PGDAIBUS_SEP" },
  "77bcfa7a96c6fddc88cb33a0082f7b8b984c4869fe07ae2fbc2cdd074d0f8e37": { cohort: "PGDAIBUS_SEP" },
  "2d33c139923974a3d05c3d881b79823522d79298a4839fca79e489267e4aa1b5": { cohort: "PGDAIBUS_SEP" },
  "4b2feafd870e2499204bdf27f8edd2676a55b7a32f57936eba4e2e1eaf94bb23": { cohort: "PGDAIBUS_SEP" },
  "9aaa0c956a13ef41ad9e52e456161be6cb5d9c6cf7b85b900f4d1303cbfecaf8": { cohort: "PGDAIBUS_SEP" },
  "40d679b4c1ffb4e8b81572b5a66a08a7b43f030c53f1456c62a1e5124e9b4861": { cohort: "PGDAIBUS_SEP" },
  "81fa0e5920d119f07fac778e52e41553124b6c6fc376dee1e201c988d3be5df2": { cohort: "PGDAIBUS_SEP" },
  "1eee5f2001db718a0263d38ca14c6966af258590732b186b521c41e408fe6f47": { cohort: "PGDAIBUS_SEP" },
  "996a9a1dfbf64d78fda5339099eee882153967d178e3ca1b96fcb701226521d5": { cohort: "PGDAIBUS_SEP" },
  "44c81e7d08d6a3627e39ff234ae376a5e642aa09fb36c0292d290aca78381dcf": { cohort: "PGDAIBUS_SEP" },
  "945576e81657fbe225a025c966f4b7d41ad4b01a1bb68877fe827203495f9d20": { cohort: "PGDAIBUS_SEP" },
  "c7d271d0e6f54e2fff9b5db19aba53c6a881c332ca38c94054ade82dc96f31a9": { cohort: "PGDAIBUS_SEP" },
  "dda8ff41bdcdfd8bea60d305c0f51d13489ba012211d04ca9f43daae0babb454": { cohort: "PGDAIBUS_SEP" },
  "9b7cb2cd3fa727af85b75d057a398cfeff7e212398b37ad8dc155066e7c6302f": { cohort: "PGDAIBUS_SEP" },
  "7ff84284befa0607053286756a8690fd8e062ca1c1fc6f4f63e806ce72d79745": { cohort: "PGDAIBUS_SEP" },
  "b6f584e7163c8436e3760db52ff51db4cf19fd013f28172de9237b1085ecdf69": { cohort: "PGDAIBUS_SEP" },
  "6ba59f846d15e074a866323a1755d86690e138d62dbe0dad356bb5221af0de27": { cohort: "PGDAIBUS_SEP" },
  "9543dc29f39096788636c69dbf2f2aea6b916d8c83adbb4464cf904b17040dc0": { cohort: "MSCAIBUSJAN26I" },
  "2ed3238fa971d84129093428d457132c61870188ed5d2887eddcafc6b0d40c97": { cohort: "MSCAIBUSJAN26I" },
  "09f979bf687b25e315229bc790fd18b1f08e762f16ddb63e2f719408f0b49fd2": { cohort: "MSCAIBUSJAN26I" },
  "fb874021d882e0b54bd16e02c0a4cc9f2064718620343769f8a25ca26f7b1bc2": { cohort: "MSCAIBUSJAN26I" },
  "c62a18280135cfe9167a50a87baa3e730f3f8267229a553c27366f7f8cef0300": { cohort: "MSCAIBUSJAN26I" },
  "7f225f10e320efdd4ccb372e7ac923ea026345ef09eebb3837e36414166738b3": { cohort: "MSCAIBUSJAN26I" },
  "39b64c718c661dae155b7cc0b7e4fe1235a825bad5638db22e0cb75e1155552b": { cohort: "MSCAIBUSJAN26I" },
  "36ebca8d74a8dbf13d9fe0cd358e5ad00dde738b2c496f9f4d1c55d157cd70ad": { cohort: "MSCAIBUSJAN26I" },
  "587d0c207e0e0fe6f0517282506748e59b177f2ab5c6132f83a20668b39bf6f4": { cohort: "MSCAIBUSJAN26I" },
  "bfc48c0c1e7681f0da3adea0ced7a5107fe11d93a11064385c8b812a037cd931": { cohort: "MSCAIBUSJAN26I" },
  "1cc9039ccaad388e616045989ae82b188f4309e96f9cce17d9e4aef05baefdf1": { cohort: "MSCAIBUSJAN26I" },
  "f1fe99cea6de712eb71f58f809c5868ddf2c459bc24d6c52f3b9ccdaf60e99fd": { cohort: "MSCAIBUSJAN26I" },
  "f1406898fe6e8b66815d61959abbd0da93c7143bfb2e0f6d1195f3ab4401adf4": { cohort: "MSCAIBUSJAN26I" },
  /* H9LOCHFFT (MSCFTD), from the Moodle participants list 2026-09-22 (14 students) */
  "026d95306191dcd805165d651e241758a4bd7168bb357845c1b8707513774aeb": { cohort: "MSCFTD_SEP26" },
  "289ca2c62cdfeadec4f11683f4e36d2972031efa8d9d8dcd05b67d1c9a6eed8c": { cohort: "MSCFTD_SEP26" },
  "d317621af00ca326a125e7ea5640fc589ef0928dd2b102a93d84982226c35698": { cohort: "MSCFTD_SEP26" },
  "a9574d748e5ae654849334cf20c4b74896c0fe84dae4ab451af679d55fbd2557": { cohort: "MSCFTD_SEP26" },
  "8d9b20d07270113282f4dcc4e4ab3cbadd1d3fef7e29368281bf91e283e2c2b5": { cohort: "MSCFTD_SEP26" },
  "889bdedca6b6ccc9bd2cce9878dc6dcb0fbb283796f5f0c490681a04e447db02": { cohort: "MSCFTD_SEP26" },
  "7b6f887b63a45028e7ff8b9be053ee750415bbbec3b89a5b878dc5426a559457": { cohort: "MSCFTD_SEP26" },
  "35ec22a48608959b0361abe6a041d27cea413221d214c82d3e24f9836701c5d0": { cohort: "MSCFTD_SEP26" },
  "c1aa8acafaf84c2c1daca5906eadcd3be7e722a924f6a977260325b52db8e3ce": { cohort: "MSCFTD_SEP26" },
  "44a3b7e8487402ec770f05edb44d05bcc31707a7517617957abdd52d98b0ed91": { cohort: "MSCFTD_SEP26" },
  "7e21a9fcf696370b48765227518922c4a620ed5d799a1aeb699032f5c585de6a": { cohort: "MSCFTD_SEP26" },
  "ab4b87f034001a545e493bf31fa25b1ad0dfde992f34269d6df3bed1c13267d1": { cohort: "MSCFTD_SEP26" },
  "9f50a2533b089613c75062f583ba9caa6dd97b7ea3c58c18fbcaaaafa26367f3": { cohort: "MSCFTD_SEP26" },
  "8bbb19f34712d7e88854111991f423d69df9fa3082b3c181cab95f85ef4ec024": { cohort: "MSCFTD_SEP26" },
};

// Cohorts whose class code we fill in for the student as soon as their email
// matches the list, so a rostered student only types their email.
const NCI_COHORT_CLASS_CODES = {
  MSCFTD_SEP26: "NCI2026"
};

// Returns the class code to prefill for a rostered email, or "".
async function nciRosterClassCode(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!isNciEmail(e)) return "";
  const hit = NCI_ROSTER[e] || NCI_ROSTER_HASHED[await sha256Hex(e)];
  return (hit && NCI_COHORT_CLASS_CODES[hit.cohort]) || "";
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Roster lookup across both shapes. Plain entries carry their own name; hashed
// ones return { needsName: true } so the caller can ask for it.
async function findNciRosterEntry(email) {
  const e = String(email || "").trim().toLowerCase();
  const plain = NCI_ROSTER[e];
  if (plain) return plain;
  const hit = NCI_ROSTER_HASHED[await sha256Hex(e)];
  if (!hit) return null;
  return { cohort: hit.cohort, needsName: true, studentId: deriveStudentIdFromEmail(e) };
}

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
async function signInOrCreateNciFreeAccount(email, classCode, fullName) {
  initFirebase();
  const target = String(email || "").trim().toLowerCase();
  if (!isNciEmail(target)) {
    return { success: false, error: "Free access is only available for @ncirl.ie addresses." };
  }
  if (!isValidNciClassCode(classCode)) {
    return { success: false, error: "That class code isn't right. Ask Victor for the current code." };
  }
  let entry = await findNciRosterEntry(target);
  if (entry && entry.needsName) {
    const name = String(fullName || "").replace(/\s+/g, " ").trim();
    if (name.length < 3 || !/\s/.test(name)) {
      return { success: false, needName: true, error: "" };
    }
    entry = {
      firstName: name.split(" ")[0],
      fullName: name,
      studentId: entry.studentId || deriveStudentIdFromEmail(target),
      cohort: entry.cohort
    };
  }
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

// Record an invite the moment it is emailed, so the inviter can see who is
// still outstanding (invited but not yet signed up). Idempotent per email:
// re-inviting the same address just refreshes the timestamp, never duplicates.
// The edge that proves a join lives in `referrals`; this only tracks the ask.
async function recordInvite(inviterId, email, code) {
  initFirebase();
  if (!inviterId) return;
  var to = String(email || "").trim().toLowerCase();
  if (!to) return;
  try {
    var existing = await db.collection("invites")
      .where("inviterId", "==", inviterId)
      .where("email", "==", to).limit(1).get();
    var payload = {
      inviterId: inviterId,
      email: to,
      referralCode: code || "",
      status: "sent",
      sentAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!existing.empty) {
      await existing.docs[0].ref.set(payload, { merge: true });
    } else {
      await db.collection("invites").add(payload);
    }
  } catch (e) {
    console.warn("recordInvite:", e.message);
  }
}

// Every invite this user has sent (so the tree can show who has yet to join).
async function getMyInvites(userId) {
  initFirebase();
  if (!userId) return [];
  try {
    var snap = await db.collection("invites")
      .where("inviterId", "==", userId).get();
    var rows = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    rows.sort(function (a, b) {
      var ta = a.sentAt && a.sentAt.seconds ? a.sentAt.seconds : 0;
      var tb = b.sentAt && b.sentAt.seconds ? b.sentAt.seconds : 0;
      return tb - ta;
    });
    return rows;
  } catch (e) {
    console.warn("getMyInvites:", e.message);
    return [];
  }
}

// Tree level ladder (cosmetic status; no monetary meaning).
function referralTreeLevel(count) {
  count = count || 0;
  // Each tier carries its own header gradient: greens for the early ladder,
  // crescendoing into brand lapis/navy at the summit. White header text reads
  // on every one of these.
  var levels = [
    { min: 0,   name: "Seedling",   emoji: "🌱", grad: "linear-gradient(135deg,#7ec97e 0%,#4ba36a 100%)" },
    { min: 1,   name: "Sprout",     emoji: "🌿", grad: "linear-gradient(135deg,#6fc06f 0%,#2f9e5a 100%)" },
    { min: 3,   name: "Sapling",    emoji: "🪴", grad: "linear-gradient(135deg,#74c24a 0%,#359a4a 100%)" },
    { min: 6,   name: "Tree",       emoji: "🌳", grad: "linear-gradient(135deg,#4caf6a 0%,#2a7d4f 100%)" },
    { min: 12,  name: "Forest",     emoji: "🌲", grad: "linear-gradient(135deg,#2f9e6f 0%,#13633c 100%)" },
    { min: 25,  name: "Woodland",   emoji: "🏞️", grad: "linear-gradient(135deg,#7bbf6a 0%,#2f8f5a 60%,#1f6b4a 100%)" },
    { min: 50,  name: "Rainforest", emoji: "🌴", grad: "linear-gradient(135deg,#2fae6a 0%,#0f6b4a 100%)" },
    { min: 100, name: "Wilderness", emoji: "🏔️", grad: "linear-gradient(135deg,#6f8fc4 0%,#1d4d8c 100%)" },
    { min: 250, name: "Ecosystem",  emoji: "🌍", grad: "linear-gradient(135deg,#2f6fd0 0%,#000036 100%)" }
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
