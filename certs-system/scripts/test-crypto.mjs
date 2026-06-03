// test-crypto.mjs — Phase 1 quality gate: sign a credential, verify it (must pass),
// tamper it (must fail), tamper the proof (must fail), wrong key (must fail).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  signCredential,
  verifyCredential,
  importPrivateKeyJwk,
  multikeyToPublicKey,
  generateUcid,
  UCID_RE,
} from "../src/lib/crypto-core.js";
import { buildCredential } from "../src/lib/credential.js";

const here = dirname(fileURLToPath(import.meta.url));
const keysDir = join(here, "..", "keys");
const privJwk = JSON.parse(readFileSync(join(keysDir, "issuer-private.jwk.json"), "utf8"));
const pub = JSON.parse(readFileSync(join(keysDir, "issuer-public.json"), "utf8"));
const pubRaw = multikeyToPublicKey(pub.multikey);
const priv = await importPrivateKeyJwk(privJwk);

let pass = 0,
  fail = 0;
const check = (name, cond) => {
  if (cond) {
    pass++;
    console.log("  PASS  " + name);
  } else {
    fail++;
    console.log("  FAIL  " + name);
  }
};

// UCID format
const ids = Array.from({ length: 1000 }, generateUcid);
check("UCID format (1000 samples)", ids.every((i) => UCID_RE.test(i)));

const cred = buildCredential({ ucid: "a1b23", name: "Test User", email: "t@example.com", issuedDate: "2026-06-03" });
const signed = await signCredential(cred, priv, {
  created: "2026-06-03T12:00:00Z",
  verificationMethod: "https://certs.fiveinnolabs.com/issuer#key-1",
});

const v1 = await verifyCredential(signed, pubRaw);
check("valid credential verifies", v1.valid === true);

// Tamper the subject name
const t1 = JSON.parse(JSON.stringify(signed));
t1.credentialSubject.name = "Hacker McEvil";
check("tampered name fails", (await verifyCredential(t1, pubRaw)).valid === false);

// Tamper the date
const t2 = JSON.parse(JSON.stringify(signed));
t2.validFrom = "2030-01-01T12:00:00Z";
check("tampered date fails", (await verifyCredential(t2, pubRaw)).valid === false);

// Tamper the proof value
const t3 = JSON.parse(JSON.stringify(signed));
t3.proof.proofValue = t3.proof.proofValue.slice(0, -2) + "11";
check("tampered proof fails", (await verifyCredential(t3, pubRaw)).valid === false);

// Wrong public key
const wrong = crypto.getRandomValues(new Uint8Array(32));
check("wrong key fails", (await verifyCredential(signed, wrong)).valid === false);

// Determinism: re-sign and verify again
const signed2 = await signCredential(cred, priv, {
  created: "2026-06-03T12:00:00Z",
  verificationMethod: "https://certs.fiveinnolabs.com/issuer#key-1",
});
check("re-sign verifies", (await verifyCredential(signed2, pubRaw)).valid === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
