// crypto-core.js — isomorphic (Node 18+ / Cloudflare Workers) credential signing.
//
// Implements an Open Badges 3.0 / W3C Verifiable Credentials credential with an
// Ed25519 Data Integrity proof in the `eddsa-jcs-2022` style: each of the proof
// configuration and the document is JCS-canonicalized (RFC 8785) and SHA-256
// hashed, the two hashes are concatenated, and the result is signed with Ed25519.
// The signature is multibase base58btc-encoded ('z' prefix). Verification is the
// exact inverse and is deterministic, so it runs identically in-browser, in the
// Worker, and in Node test scripts. Tamper a single byte of the credential and
// verification fails.

const enc = new TextEncoder();

/* ------------------------------------------------------------------ JCS ---- */
// RFC 8785 JSON Canonicalization Scheme. Our credential payloads are strings,
// small integers and booleans only, so we implement the structural rules
// (recursive key sorting, minimal separators) faithfully; numbers are emitted
// via the ES6 number-to-string algorithm which RFC 8785 adopts.
export function jcs(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("JCS: non-finite number");
    return JSON.stringify(value);
  }
  if (typeof value === "string") return jcsString(value);
  if (Array.isArray(value)) return "[" + value.map(jcs).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort(codePointCompare);
    return "{" + keys.map((k) => jcsString(k) + ":" + jcs(value[k])).join(",") + "}";
  }
  throw new Error("JCS: unsupported type " + typeof value);
}

// Sort by UTF-16 code units, which for our key set (ASCII) matches code points.
function codePointCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function jcsString(s) {
  // RFC 8785 string escaping mirrors JSON.stringify for the BMP characters we use.
  return JSON.stringify(s);
}

/* ------------------------------------------------------------- base58btc ---- */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58btcEncode(bytes) {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits = [0];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "1".repeat(zeros);
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}

export function base58btcDecode(str) {
  let zeros = 0;
  while (zeros < str.length && str[zeros] === "1") zeros++;
  const bytes = [0];
  for (let i = zeros; i < str.length; i++) {
    const val = B58.indexOf(str[i]);
    if (val < 0) throw new Error("base58: bad char");
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[zeros + bytes.length - 1 - i] = bytes[i];
  return out;
}

// Multikey: multicodec ed25519-pub header 0xed 0x01 + raw 32-byte key, base58btc, 'z' prefix.
export function publicKeyToMultikey(raw32) {
  const out = new Uint8Array(2 + raw32.length);
  out[0] = 0xed;
  out[1] = 0x01;
  out.set(raw32, 2);
  return "z" + base58btcEncode(out);
}

export function multikeyToPublicKey(mk) {
  if (mk[0] !== "z") throw new Error("multikey: expected base58btc 'z'");
  const bytes = base58btcDecode(mk.slice(1));
  if (bytes[0] !== 0xed || bytes[1] !== 0x01) throw new Error("multikey: not ed25519-pub");
  return bytes.slice(2);
}

/* --------------------------------------------------------------- hashing ---- */
async function sha256(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(d);
}

function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// The bytes that get signed/verified: sha256(canonical proof config) || sha256(canonical doc).
async function hashData(credentialNoProof, proofConfigNoValue) {
  const docHash = await sha256(enc.encode(jcs(credentialNoProof)));
  const proofHash = await sha256(enc.encode(jcs(proofConfigNoValue)));
  return concat(proofHash, docHash);
}

/* ----------------------------------------------------------------- keys ----- */
export async function importPrivateKeyJwk(jwk) {
  // Workers' Web Crypto rejects a JWK carrying alg:"Ed25519"; pass only the
  // core OKP fields so import succeeds identically in Node and on Workers.
  const min = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, d: jwk.d };
  return crypto.subtle.importKey("jwk", min, { name: "Ed25519" }, false, ["sign"]);
}

export async function importPublicKeyRaw(raw32) {
  return crypto.subtle.importKey("raw", raw32, { name: "Ed25519" }, false, ["verify"]);
}

/* ----------------------------------------------------------------- sign ----- */
// Attach a DataIntegrityProof to a credential. `opts.verificationMethod` is the
// full id of the issuer key (e.g. did:web:... #key-1 or an https URL).
export async function signCredential(credential, privateKey, opts) {
  const proofConfig = {
    type: "DataIntegrityProof",
    cryptosuite: "eddsa-jcs-2022",
    created: opts.created,
    verificationMethod: opts.verificationMethod,
    proofPurpose: "assertionMethod",
    "@context": credential["@context"],
  };
  const toSign = await hashData(credential, proofConfig);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, privateKey, toSign));
  const { ["@context"]: _ctx, ...proofOut } = proofConfig;
  proofOut.proofValue = "z" + base58btcEncode(sig);
  return { ...credential, proof: proofOut };
}

export async function verifyCredential(signed, expectedPublicKeyRaw) {
  try {
    const { proof, ...credential } = signed;
    if (!proof || proof.type !== "DataIntegrityProof" || proof.cryptosuite !== "eddsa-jcs-2022") {
      return { valid: false, reason: "missing or unsupported proof" };
    }
    const proofConfig = {
      type: proof.type,
      cryptosuite: proof.cryptosuite,
      created: proof.created,
      verificationMethod: proof.verificationMethod,
      proofPurpose: proof.proofPurpose,
      "@context": credential["@context"],
    };
    const signed2 = await hashData(credential, proofConfig);
    const sig = base58btcDecode(proof.proofValue.slice(1));
    const pub = await importPublicKeyRaw(expectedPublicKeyRaw);
    const ok = await crypto.subtle.verify({ name: "Ed25519" }, pub, sig, signed2);
    return { valid: ok, reason: ok ? "ok" : "signature mismatch" };
  } catch (e) {
    return { valid: false, reason: "error: " + (e && e.message) };
  }
}

/* ----------------------------------------------------------------- UCID ----- */
// 5-char Unique Credential ID in the historical HELIOS shape: letter digit letter digit digit.
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
export const UCID_RE = /^[a-z][0-9][a-z][0-9]{2}$/;

export function generateUcid() {
  const r = new Uint8Array(4);
  crypto.getRandomValues(r);
  return (
    LETTERS[r[0] % 26] + DIGITS[r[1] % 10] + LETTERS[r[2] % 26] + DIGITS[r[3] % 10] + DIGITS[(r[3] >> 4) % 10]
  );
}
