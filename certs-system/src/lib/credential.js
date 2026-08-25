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
      "The AI Badge is earned by demonstrated, applied capability, at the level stated on the credential. " +
      "Level 1 (AI Builder) is earned by completing the AI Badge Foundations track: building and deploying working software from a plain-language brief, directing AI as a thinking partner, and applying AI responsibly under the EU AI Act's AI-literacy expectations. " +
      "Level 2 (Agent Operator) is earned by one of two routes. Either the holder additionally completes the AI Badge Terminal track, running, extending and directing multi-agent systems on their own machine. " +
      "Or the holder passes Customer Engagement and Artificial Intelligence (H9CEAI), a Level 9 postgraduate module at National College of Ireland, with a final module mark of 60% or above, having designed and deployed a five-agent organisation with live data connections, an unbroken handoff pipeline, and a regulatory analysis under the EU AI Act and GDPR. " +
      "Both Level 2 routes are assessed against the same competencies, which are listed on each credential.",
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

// The AI Badge is structured in levels. Level 1 ("AI Builder") is the
// non-terminal Foundations track; every AI Badge issued today is Level 1.
// Each level carries a designation and the competencies it certifies.
export const LEVELS = {
  1: {
    level: "Level 1",
    name: "AI Builder",
    designation: "Level 1 · AI Builder",
    competencies: [
      "Build and iterate a working web page from a plain-language brief, using AI as a coding partner",
      "Deploy a live project to the web via GitHub",
      "Explain in plain terms how frontier AI models work, and where they fail",
      "Direct AI as a thinking and interview partner to clarify and pressure-test ideas",
      "Choose among different AI systems for the right task",
      "Apply AI responsibly within the EU AI Act's AI-literacy expectations",
    ],
  },
  2: {
    level: "Level 2",
    name: "Agent Operator",
    designation: "Level 2 · Agent Operator",
    competencies: [
      "Design a team of specialised AI agents, each with its own system prompt, personality and domain expertise",
      "Orchestrate handoffs between agents so each builds on the last, producing work no single agent could produce alone",
      "Author a reusable skill that extends what an agent can do, triggered in plain language",
      "Structure a persistent workspace so context, files and project memory survive between sessions",
      "Operate frontier AI agents beyond a chat window, on their own machine or infrastructure",
      "Connect an agent to a live external data source, queried at the moment of use",
      "Build and deploy a working prototype to the public web from a plain-language brief",
      "Apply the EU AI Act and GDPR to a deployed AI system, and judge its trustworthiness",
    ],
  },
};

// Levels that may be issued. Level 2 (Agent Operator) builds on and includes
// Level 1 (AI Builder); it is earned either through the Terminal track or
// through an accredited Level 9 module assessed against the same competencies.
export const ISSUABLE_LEVELS = [1, 2];
export const DEFAULT_LEVEL = 1;

// Build the unsigned credential. `data` = { ucid, name, email, issuedDate (YYYY-MM-DD),
// cohort?, legacy?, source? }. `issuedDate` is rendered to an ISO instant at noon UTC
// so the displayed calendar date is stable across timezones.
export function buildCredential(data) {
  const issuanceInstant = data.issuedDate + "T12:00:00Z";
  const subjectId = "urn:ucid:" + data.ucid;
  const lvl = LEVELS[data.level || DEFAULT_LEVEL] || LEVELS[DEFAULT_LEVEL];
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
      // The level this credential certifies, and the competencies the holder
      // demonstrated. Signed as part of the VC (eddsa-jcs-2022 covers all fields).
      level: lvl.level,
      levelName: lvl.name,
      competencies: lvl.competencies,
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
