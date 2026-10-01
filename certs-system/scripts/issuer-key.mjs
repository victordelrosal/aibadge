// issuer-key.mjs: the issuer private key lives in the macOS Keychain, never on disk.
// Moved out of Dropbox on 1 Oct 2026 (Forge grading-safety). Production signing uses the
// Worker secret ISSUER_PRIVATE_JWK; this helper is only for local maintenance scripts.
import { execFileSync } from "node:child_process";
export const KEYCHAIN_ACCOUNT = "aibadge";
export const KEYCHAIN_SERVICE = "aibadge-issuer-private-jwk";
export function readIssuerPrivateJwk() {
  const raw = execFileSync("security", ["find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"]).toString().replace(/\n$/, "");
  return JSON.parse(raw);
}
