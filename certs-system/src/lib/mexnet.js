// mexnet.js — the eight RGMX Irlanda botones (MexNet, Capítulo Irlanda de la Red Global MX), issued by
// fiveinnolabs as Open Badges 3.0 credentials with the same Ed25519 key as the AI Badge.
// Victor, 26 Oct 2026: durable, usable, valuable, portable and non-transferable. So every botón is
// bound to its holder by a salted SHA-256 of their email (OB 3.0 IdentityObject, spec section 9.3),
// and stored apart from AI Badge records (KV prefix "mx:"), so it never touches the AI Badge
// duplicate guard, dashboard list or auto-issue eligibility.
// This repo is public: no meeting dates or places here. The date travels in validFrom only.

import { ISSUER_ID } from "./credential.js";

export const MX_KEY = (code) => "mx:" + code;
// One botón of each kind per holder: mxidx:<slug>:<emailHash> -> ucid.
export const MX_IDX = (slug, emailHash) => "mxidx:" + slug + ":" + emailHash;

const CREATOR = {
  id: "https://mexnet.pages.dev/ie/",
  type: ["Profile"],
  name: "RGMX Irlanda · Red Global MX Capítulo Irlanda",
};

// series: emb = en la Embajada (in person), onl = en línea. Metal order per series (Victor,
// 15 Oct): 1st plata, 2nd rosa, 3rd oro, 4th negro.
export const BOTONES = {
  "01-la-embajada":    { num: "01",  name: "La Embajada",    metal: "plata", series: "emb", meeting: "Reunión trimestral 01" },
  "02-el-nopal":       { num: "02",  name: "El Nopal",       metal: "rosa",  series: "emb", meeting: "Reunión trimestral 02" },
  "03-el-sol":         { num: "03",  name: "El Sol",         metal: "oro",   series: "emb", meeting: "Reunión trimestral 03" },
  "04-el-cempasuchil": { num: "04",  name: "El Cempasúchil", metal: "negro", series: "emb", meeting: "Reunión trimestral 04" },
  "i-la-escalera":     { num: "I",   name: "La Escalera",    metal: "plata", series: "onl", meeting: "Reunión general en línea I" },
  "ii-el-farol":       { num: "II",  name: "El Farol",       metal: "rosa",  series: "onl", meeting: "Reunión general en línea II" },
  "iii-el-puente":     { num: "III", name: "El Puente",      metal: "oro",   series: "onl", meeting: "Reunión general en línea III" },
  "iv-la-mariposa":    { num: "IV",  name: "La Mariposa",    metal: "negro", series: "onl", meeting: "Reunión general en línea IV" },
};

export function botonTitle(slug) {
  const b = BOTONES[slug];
  return `Botón ${b.num} · ${b.name}`;
}

export function botonAchievement(slug) {
  const b = BOTONES[slug];
  const how = b.series === "emb" ? "asistió en persona a la" : "asistió en línea a la";
  return {
    id: "https://certs.fiveinnolabs.com/achievements/mexnet/" + slug,
    type: ["Achievement"],
    achievementType: "Badge",
    name: botonTitle(slug),
    description:
      `Constancia digital de participación de RGMX Irlanda (Red Global MX Capítulo Irlanda). ` +
      `Botón ${b.num} · ${b.name}, en ${b.metal}.`,
    criteria: {
      narrative: `Se otorga a quien ${how} ${b.meeting} de RGMX Irlanda (Red Global MX Capítulo Irlanda).`,
    },
    image: { id: `https://certs.fiveinnolabs.com/assets/mexnet/${slug}.svg`, type: "Image" },
    creator: CREATOR,
    inLanguage: "es",
  };
}

const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");

export function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// OB 3.0 IdentityHash: "sha256$" + hex(SHA-256(identifier + salt)), both UTF-8.
export async function identityHash(email, salt) {
  const data = new TextEncoder().encode(normEmail(email) + salt);
  return "sha256$" + hex(await crypto.subtle.digest("SHA-256", data));
}

// Unsalted lookup key for the one-per-holder index. Never published.
export async function emailKey(email) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("mexnet:" + normEmail(email))));
}

export function newSalt() {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

// rec = { ucid, slug, name, issuedDate (YYYY-MM-DD), salt, identityHash }
export function buildBotonCredential(rec) {
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: "https://certs.fiveinnolabs.com/" + rec.ucid,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    name: botonTitle(rec.slug),
    issuer: ISSUER_ID,
    validFrom: rec.issuedDate + "T12:00:00Z",
    credentialSubject: {
      id: "urn:ucid:" + rec.ucid,
      type: ["AchievementSubject"],
      name: rec.name,
      // The holder binding. A verifier who knows the holder's email recomputes the hash with this
      // salt; the email itself is never published.
      identifier: [
        { type: "IdentityObject", identityHash: rec.identityHash, identityType: "emailAddress", hashed: true, salt: rec.salt },
      ],
      achievement: botonAchievement(rec.slug),
    },
    credentialStatus: {
      id: "https://certs.fiveinnolabs.com/api/verify/" + rec.ucid,
      type: "1EdTechRevocationList",
    },
  };
}
