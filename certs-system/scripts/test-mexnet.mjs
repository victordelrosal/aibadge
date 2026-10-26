// Offline checks for the MexNet botones: OB 3.0 identity hash (spec example), sign/verify round trip,
// tamper detection, and no email or meeting date leaking into the signed credential.
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { BOTONES, buildBotonCredential, identityHash, newSalt } from "../src/lib/mexnet.js";
import { signCredential, verifyCredential } from "../src/lib/crypto-core.js";

// OB 3.0 spec: sha256 of 'a@example.comKosher'
assert.equal(await identityHash("a@example.com", "Kosher"), "sha256$b5809d8a92f8858436d7e6b87c12ebc0ae1eac4baecc2c0b913aee2c922ef399");
assert.equal(await identityHash("  A@Example.com ", "Kosher"), "sha256$b5809d8a92f8858436d7e6b87c12ebc0ae1eac4baecc2c0b913aee2c922ef399");

const kp = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const pubRaw = new Uint8Array(await webcrypto.subtle.exportKey("raw", kp.publicKey));
let n = 0;
for (const slug of Object.keys(BOTONES)) {
  const salt = newSalt();
  const rec = { ucid: "t1e00", slug, name: "Zoë Ó Prueba", issuedDate: "2026-11-11", salt, identityHash: await identityHash("zoe@example.com", salt) };
  const signed = await signCredential(buildBotonCredential(rec), kp.privateKey, { created: "2026-11-11T18:00:00Z", verificationMethod: "https://certs.fiveinnolabs.com/issuer#key-1" });
  assert.equal((await verifyCredential(signed, pubRaw)).valid, true, slug);
  const t = structuredClone(signed); t.credentialSubject.name = "Otra Persona";
  assert.equal((await verifyCredential(t, pubRaw)).valid, false, slug + " tamper");
  const txt = JSON.stringify(signed);
  assert.ok(!txt.includes("zoe@example.com"), "email leaked");
  assert.ok(!/noviembre|Dublín/.test(JSON.stringify(signed.credentialSubject.achievement)), "meeting detail in achievement");
  n++;
}
console.log(`mexnet: ${n}/8 botones sign, verify and reject tampering; spec hash example matches`);
