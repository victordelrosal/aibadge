// email.js — send the graduation email from victor@fiveinnolabs.com via Resend,
// with the credential PDF + LinkedIn-ready PNG attached.
import { ALIGNED_WITH_LINE, LEVELS, DEFAULT_LEVEL } from "./credential.js";

function bytesToBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function sendBadgeEmail(env, opts) {
  const { to, name, ucid, verifyUrl, badgeUrl, badgeBytes, pdfBytes, issuedDisplay, level, host } = opts;
  const lvl = LEVELS[level || DEFAULT_LEVEL] || LEVELS[DEFAULT_LEVEL];
  // Tracked surfaces. The badge image doubles as the open beacon: it records the
  // open and then serves the real badge bytes, so nothing about the email changes.
  const h = host || "certs.fiveinnolabs.com";
  const beaconUrl = `https://${h}/e/o/${ucid}.png`;
  const trackedVerify = `https://${h}/e/c/${ucid}/verify`;
  const trackedLinkedin = `https://${h}/e/c/${ucid}/linkedin`;
  const html = emailHtml({
    name, ucid, issuedDisplay,
    verifyUrl,                      // shown as text, untracked, so the printed URL stays clean
    verifyHref: trackedVerify,      // what the button actually points at
    badgeUrl: beaconUrl,
    linkedinShare: trackedLinkedin,
    designation: lvl.designation, levelName: lvl.name,
  });

  const payload = {
    from: env.FROM_EMAIL || "AI Badge <victor@fiveinnolabs.com>",
    to,
    reply_to: "victor@fiveinnolabs.com",
    subject: `🎓 Your AI Badge certificate is ready, ${firstName(name)} · ${lvl.designation}`,
    html,
    attachments: [
      { filename: `AI-Badge-${ucid}.pdf`, content: bytesToBase64(pdfBytes) },
      { filename: `AI-Badge-${ucid}.png`, content: bytesToBase64(badgeBytes) },
    ],
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Resend error: " + JSON.stringify(result));
  return result;
}

function firstName(n) {
  return String(n || "").trim().split(/\s+/)[0] || "there";
}

function emailHtml({ name, ucid, verifyUrl, verifyHref, badgeUrl, linkedinShare, issuedDisplay, designation, levelName }) {
  const gold = "#a88742",
    navy = "#173f73";
  return `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2235">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7e9ef">
        <tr><td style="background:linear-gradient(135deg,#0a1230,#07133a);padding:26px 32px;color:#fff">
          <div style="font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:#c9d4f0">fiveinnolabs</div>
          <div style="font-size:25px;font-weight:700;margin-top:6px;color:#fff">Congratulations, ${escapeHtml(firstName(name))}. 🎉</div>
        </td></tr>
        <tr><td style="padding:30px 32px 8px">
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px">Your <b>AI Badge certificate has been generated</b>, and it is yours to keep. You have earned <b>${escapeHtml(designation)}</b>, a verifiable credential recognising your applied mastery of human-centred AI. It is official, it is cryptographically signed, and it is yours to show off.</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px">Your certificate and badge image are attached to this email, and both are also available any time from your credential page below, where you can download them again, add the badge to LinkedIn, or share the link with an employer.</p>
          <div style="text-align:center;margin:4px 0 10px"><span style="display:inline-block;background:#f3ecda;color:#8a6c2f;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">${escapeHtml(designation)}</span></div>
          <div style="text-align:center;margin:14px 0 6px">
            <img src="${badgeUrl}" alt="The AI Badge — ${escapeHtml(name)}" width="380" style="width:380px;max-width:100%;border-radius:14px">
          </div>
        </td></tr>
        <tr><td style="padding:6px 32px 4px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ececf2;border-radius:12px;background:#fbfcfe">
            <tr>
              <td style="padding:14px 18px;font-size:13px;color:#5a6273">CREDENTIAL ID<br><span style="font-size:20px;font-weight:700;color:${navy};font-family:SFMono-Regular,Consolas,monospace;letter-spacing:.06em">${escapeHtml(ucid)}</span></td>
              <td style="padding:14px 18px;font-size:13px;color:#5a6273;text-align:right">ISSUED<br><span style="font-size:16px;font-weight:600;color:#1a2235">${escapeHtml(issuedDisplay)}</span></td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:14px 32px 0;font-size:12px;color:#8a91a3;letter-spacing:.01em">${ALIGNED_WITH_LINE}</td></tr>
        <tr><td align="center" style="padding:18px 32px 6px">
          <a href="${verifyHref}" style="display:inline-block;background:${navy};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:999px">View &amp; verify your badge →</a>
          <div style="margin-top:14px">
            <a href="${linkedinShare}" style="display:inline-block;color:${navy};text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border:1px solid #d8dbe6;border-radius:999px">Share on LinkedIn</a>
          </div>
        </td></tr>
        <tr><td style="padding:18px 32px 6px">
          <p style="font-size:14px;line-height:1.6;color:#5a6273;margin:0">Attached you'll find your <b>certificate (PDF)</b> and a <b>LinkedIn-ready image</b>. Anyone can confirm your badge is genuine at <a href="${verifyHref}" style="color:${navy}">${escapeHtml(verifyUrl.replace("https://", ""))}</a> — the signature is checked live in their browser.</p>
        </td></tr>
        <tr><td style="padding:18px 32px 30px">
          <p style="font-size:15px;line-height:1.6;margin:0">With pride,<br><b>Victor del Rosal</b><br><span style="color:#5a6273;font-size:13px">Founder, fiveinnolabs</span></p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#0a1230;color:#9aa6c8;font-size:11px;line-height:1.6">
          The AI Badge is issued as an Open Badges 3.0 Verifiable Credential, signed with an Ed25519 digital signature. Credential ${escapeHtml(ucid)} · ${escapeHtml(verifyUrl)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
