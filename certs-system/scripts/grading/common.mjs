// Shared helpers for the AI Badge grading pipeline (1 Oct 2026, Forge grading-safety).
// Design: pull (no AI) -> grade (AI with NO tools) -> validate (no AI) -> Victor approves -> resolve (server).
// Learner data never enters Dropbox: everything lives under GRADING_HOME.
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

export const GRADING_HOME = process.env.AIBADGE_GRADING_HOME || join(homedir(), "Library", "Caches", "aibadge-grading");
export const KV_NAMESPACE = "e11a3cbfa9df4a52b4b41091db6e4250";      // aibadge worker SLOTS
export const PROJECT = "ai-badge-2026";
export const WORKER = "https://aibadge-report-mailer.victordelrosal.workers.dev";
export const RUBRIC = new URL("../../../docs/CERT-RUBRIC.md", import.meta.url).pathname;
export const REAL_CLAUDE = join(homedir(), ".local", "bin", "claude"); // never the shell alias (it adds bypass)
export const VICTOR_EMAILS = ["victor@fiveinnolabs.com", "victordelrosal@gmail.com", "v@vdr.me"];

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const ensureDir = (p) => { mkdirSync(p, { recursive: true, mode: 0o700 }); return p; };

export function keychain(service) {
  return execFileSync("security", ["find-generic-password", "-a", "aibadge", "-s", service, "-w"]).toString().replace(/\n$/, "");
}

const wranglerEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "CLOUDFLARE_API_TOKEN"));
export function kvList(prefix) {
  const out = execFileSync("npx", ["wrangler", "kv", "key", "list", "--namespace-id", KV_NAMESPACE, "--remote", "--prefix", prefix], { env: wranglerEnv() }).toString();
  return JSON.parse(out.slice(out.indexOf("[")));
}
export function kvGet(key) {
  return execFileSync("npx", ["wrangler", "kv", "key", "get", "--namespace-id", KV_NAMESPACE, "--remote", key], { env: wranglerEnv() }).toString();
}

// Firestore read access through the Firebase CLI's existing Google login (owner, read-only use here).
export async function googleAccessToken() {
  const store = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  // The OAuth client is the one the installed Firebase CLI itself uses; read it from the CLI at runtime
  // rather than committing it here.
  const cliRoot = realpathSync(execFileSync("which", ["firebase"]).toString().trim()).replace(/\/lib\/bin\/firebase\.js$|\/bin\/firebase$|\/lib\/bin\/firebase$/, "");
  const api = createRequire(import.meta.url)(join(cliRoot, "lib", "api.js"));
  const body = new URLSearchParams({
    grant_type: "refresh_token", refresh_token: store.tokens.refresh_token,
    client_id: api.clientId(), client_secret: api.clientSecret(),
  });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  if (!r.ok) throw new Error("token exchange failed: " + r.status + " (run `firebase login`)");
  return (await r.json()).access_token;
}
