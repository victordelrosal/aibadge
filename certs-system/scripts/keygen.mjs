// keygen.mjs — generate the issuer Ed25519 keypair. Run once.
// Stores the private key in the macOS Keychain (never on disk) and prints the
// public material (Multikey + JWK) to publish at /.well-known/.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { publicKeyToMultikey } from "../src/lib/crypto-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const keysDir = join(here, "..", "keys");

const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
const pubJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
const multikey = publicKeyToMultikey(pubRaw);

// 1 Oct 2026: the private key goes straight into the macOS Keychain, never to disk (Dropbox).
{ const { spawnSync } = await import("node:child_process");
  const r = spawnSync("security", ["-i"], { input: `add-generic-password -U -a aibadge -s aibadge-issuer-private-jwk -l "AI Badge issuer private JWK (Ed25519)" -w ${JSON.stringify(JSON.stringify(privJwk))}\n` });
  if (r.status !== 0) throw new Error("could not store the private key in the Keychain"); }
writeFileSync(
  join(keysDir, "issuer-public.json"),
  JSON.stringify({ multikey, jwk: { ...pubJwk, key_ops: ["verify"] } }, null, 2)
);

console.log("Issuer keypair generated.");
console.log("  multikey:", multikey);
console.log("  public jwk x:", pubJwk.x);
console.log("Private JWK stored in the macOS Keychain (service aibadge-issuer-private-jwk). Remember: wrangler secret put ISSUER_PRIVATE_JWK.");
