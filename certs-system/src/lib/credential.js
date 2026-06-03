// credential.js — builds an Open Badges 3.0 AchievementCredential (a W3C VC).
// Spec: https://www.imsglobal.org/spec/ob/v3p0/ (OB 3.0 is a VC 2.0 profile).

export const ISSUER_ID = "https://certs.fiveinnolabs.com/issuer";
export const VERIFICATION_METHOD = ISSUER_ID + "#key-1";

export const ISSUER_PROFILE = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
  ],
  id: ISSUER_ID,
  type: ["Profile"],
  name: "fiveinnolabs",
  url: "https://aibadge.fiveinnolabs.com",
  email: "victor@fiveinnolabs.com",
  description:
    "fiveinnolabs issues the AI Badge: a verifiable credential certifying applied, human-centred AI capability. Founded and issued by Victor del Rosal.",
};

// The achievement definition shared by every AI Badge.
export const ACHIEVEMENT = {
  id: "https://certs.fiveinnolabs.com/achievements/ai-badge",
  type: ["Achievement"],
  name: "The AI Badge",
  description:
    "Awarded for demonstrated, applied mastery of human-centred artificial intelligence: using frontier AI tools to do real work with judgement, fluency and an evaluator's mindset.",
  criteria: {
    narrative:
      "Recipients complete the AI Badge programme by fluently applying frontier AI tools to real-world work, demonstrating sound judgement, an evaluator's mindset, and responsible, human-centred practice.",
  },
  image: {
    id: "https://certs.fiveinnolabs.com/assets/emblem.png",
    type: "Image",
  },
  // OB 3.0 native alignment — the frameworks this achievement is mapped to.
  // No targetCode/level: the AI Badge is not a graded assessment, so it does not
  // certify a per-holder level within any framework.
  alignment: [
    { type: ["Alignment"], targetName: "UNESCO AI competency frameworks", targetFramework: "UNESCO", targetUrl: "https://www.unesco.org/en/digital-education/ai-future-learning" },
    { type: ["Alignment"], targetName: "The Alan Turing Institute — AI skills", targetFramework: "Turing Institute", targetUrl: "https://www.turing.ac.uk/" },
    { type: ["Alignment"], targetName: "DigComp 3.0", targetFramework: "DigComp 3.0", targetUrl: "https://joinup.ec.europa.eu/collection/digcomp" },
    { type: ["Alignment"], targetName: "SFIA 9", targetFramework: "SFIA 9", targetUrl: "https://sfia-online.org/en/sfia-9" },
    { type: ["Alignment"], targetName: "EU AI Act — AI literacy (Art. 4)", targetFramework: "EU AI Act", targetUrl: "https://artificialintelligenceact.eu/" },
    { type: ["Alignment"], targetName: "OECD/EC AILit Framework", targetFramework: "OECD/EC AILit", targetUrl: "https://ailiteracyframework.org/" },
  ],
};

// The competency frameworks the AI Badge PROGRAMME is mapped to (mirrors the
// public mapping at aibadge.fiveinnolabs.com/explore.html). This is a property
// of the credential, NOT a tested or self-assessed per-holder level — the AI
// Badge has no exam, so no level is claimed for any individual.
export const FRAMEWORK_NAMES = [
  "UNESCO",
  "Turing Institute",
  "DigComp 3.0",
  "SFIA 9",
  "EU AI Act",
  "OECD/EC AILit",
];

// Short one-line form for badges, social images and email.
export const ALIGNED_WITH_LINE = "Aligned with UNESCO · DigComp · EU AI Act · SFIA · OECD · Turing";

export const ALIGNMENT_SUBLINE = "The AI Badge programme is mapped to these international AI-competency frameworks.";

export const ALIGNMENT_DISCLAIMER =
  "Independent mapping by fiveinnolabs indicating the frameworks this credential relates to. It is not a graded assessment and does not certify a level within any framework. The AI Badge is not endorsed by, accredited by, or affiliated with these organisations.";

// Build the unsigned credential. `data` = { ucid, name, email, issuedDate (YYYY-MM-DD),
// cohort?, legacy?, source? }. `issuedDate` is rendered to an ISO instant at noon UTC
// so the displayed calendar date is stable across timezones.
export function buildCredential(data) {
  const issuanceInstant = data.issuedDate + "T12:00:00Z";
  const subjectId = "urn:ucid:" + data.ucid;
  const cred = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: "https://certs.fiveinnolabs.com/" + data.ucid,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    name: "The AI Badge",
    issuer: ISSUER_ID,
    validFrom: issuanceInstant,
    credentialSubject: {
      id: subjectId,
      type: ["AchievementSubject"],
      name: data.name,
      achievement: ACHIEVEMENT,
    },
    credentialStatus: {
      id: "https://certs.fiveinnolabs.com/api/verify/" + data.ucid,
      type: "1EdTechRevocationList",
    },
  };
  if (data.cohort) cred.credentialSubject.cohort = data.cohort;
  return cred;
}

// Legacy HELIOS credential: a verifiable RECORD of an already-issued HELIOS
// certificate. Not a re-issue (no new certificate is sent), but it is signed so
// the holder gets the same trustworthy verification page. Distinct achievement.
export const LEGACY_ACHIEVEMENT = {
  id: "https://certs.fiveinnolabs.com/achievements/helios",
  type: ["Achievement"],
  name: "HELIOS — Certificate of Completion",
  description:
    "Successfully completed the HELIOS programme by fiveinnolabs, covering advanced prompting, no-code builds, workflow automation, and AI ethics. This is a verifiable record of a credential issued prior to the AI Badge; it is not re-issued.",
  image: { id: "https://certs.fiveinnolabs.com/assets/emblem.png", type: "Image" },
};

export function buildLegacyCredential(data) {
  const instant = data.issuedDate + "T12:00:00Z";
  const cred = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: "https://certs.fiveinnolabs.com/" + data.ucid,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    name: "HELIOS — AI Foundations Programme",
    issuer: ISSUER_ID,
    validFrom: instant,
    credentialSubject: {
      id: "urn:ucid:" + data.ucid,
      type: ["AchievementSubject"],
      name: data.name,
      achievement: LEGACY_ACHIEVEMENT,
    },
    credentialStatus: {
      id: "https://certs.fiveinnolabs.com/api/verify/" + data.ucid,
      type: "1EdTechRevocationList",
    },
  };
  if (data.cohort) cred.credentialSubject.cohort = data.cohort;
  return cred;
}
