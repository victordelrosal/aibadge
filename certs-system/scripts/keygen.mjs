// keygen.mjs — generate the issuer Ed25519 keypair. Run once.
// Writes keys/issuer-private.jwk.json (SECRET, gitignored) and prints the
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

writeFileSync(join(keysDir, "issuer-private.jwk.json"), JSON.stringify(privJwk));
writeFileSync(
  join(keysDir, "issuer-public.json"),
  JSON.stringify({ multikey, jwk: { ...pubJwk, key_ops: ["verify"] } }, null, 2)
);

console.log("Issuer keypair generated.");
console.log("  multikey:", multikey);
console.log("  public jwk x:", pubJwk.x);
console.log("Private JWK written to keys/issuer-private.jwk.json (gitignored).");
