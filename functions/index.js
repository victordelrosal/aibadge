const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { Resend } = require("resend");

// Store your Resend API key as a Firebase secret:
//   firebase functions:secrets:set RESEND_API_KEY
const resendKey = defineSecret("RESEND_API_KEY");

// Trigger: fires when a new document is created in publicAssessments
exports.sendReport = onDocumentCreated(
  {
    document: "publicAssessments/{docId}",
    secrets: [resendKey],
    region: "europe-west1"
  },
  async (event) => {
    const data = event.data.data();
    if (!data || !data.email) {
      console.log("No email found, skipping.");
      return;
    }

    const resend = new Resend(resendKey.value());
    const email = data.email;
    const report = data.report || "No report generated.";
    const s = data.score || 0;
    const tierName = data.tier || "Unknown";

    // Build HTML email
    const html = buildEmailHTML(data, report);

    try {
      const result = await resend.emails.send({
        from: "AI Badge <reports@fiveinnolabs.com>",
        to: email,
        subject: `Your AI Competency Report: ${tierName} (Score: ${s}/100)`,
        html: html,
        text: report
      });
      console.log(`Email sent to ${email}:`, result);
    } catch (err) {
      console.error(`Failed to send email to ${email}:`, err);
    }
  }
);

function buildEmailHTML(data, plainReport) {
  const scores = data.scores || {};
  const s = data.score || 0;
  const tierName = data.tier || "Unknown";
  const archetypeName = data.archetype || "Unknown";

  // Dimension labels and values
  const dims = [
    { name: "AI Foundations", val: scores.aiFoundations || 1 },
    { name: "Critical Evaluation", val: scores.criticalEvaluation || 1 },
    { name: "Productive Creation", val: scores.productiveCreation || 1 },
    { name: "Technical Building", val: scores.technicalBuilding || 1 },
    { name: "Ethics & Governance", val: scores.ethicsGovernance || 1 },
    { name: "Tool Fluency", val: scores.toolFluency || 1 }
  ];

  const dimRows = dims
    .map(
      (d) => `
    <tr>
      <td style="padding:8px 12px;font-size:14px;color:#333;">${d.name}</td>
      <td style="padding:8px 12px;text-align:center;">
        <span style="display:inline-block;min-width:28px;padding:2px 8px;border-radius:6px;background:#D4AF37;color:#fff;font-size:13px;font-weight:700;">${d.val}</span>
      </td>
    </tr>`
    )
    .join("");

  const flagRows = (data.flags || [])
    .map(
      (f) => `
    <div style="padding:10px 14px;margin-bottom:6px;border-radius:8px;background:${f.type === "warning" ? "#FFF3E0" : f.type === "caution" ? "#FFFDE7" : "#E3F2FD"};font-size:13px;color:#333;line-height:1.45;">
      ${f.type === "warning" ? "⚠" : f.type === "caution" ? "◐" : "ℹ"} ${f.text}
    </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:24px;font-weight:800;color:#000036;letter-spacing:-0.02em;">AI Badge</div>
      <div style="font-size:12px;color:#888;margin-top:2px;">AI Competency Profile Report</div>
    </div>

    <!-- Score card -->
    <div style="background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px;">
      <div style="font-size:56px;font-weight:800;color:#D4AF37;line-height:1;">${s}</div>
      <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;">Score out of 100</div>
      <div style="font-size:24px;font-weight:700;color:#000036;margin-top:16px;">${tierName}</div>
      <div style="font-size:14px;color:#666;margin-top:8px;">Profile: <strong>${archetypeName}</strong></div>
    </div>

    <!-- Dimensions -->
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px;">
      <div style="font-size:11px;font-weight:600;color:#D4AF37;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Dimension Scores</div>
      <table style="width:100%;border-collapse:collapse;">
        ${dimRows}
      </table>
    </div>

    ${flagRows ? `
    <!-- Observations -->
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px;">
      <div style="font-size:11px;font-weight:600;color:#D4AF37;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Key Observations</div>
      ${flagRows}
    </div>
    ` : ""}

    <!-- Full report as preformatted text -->
    <div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);margin-bottom:20px;">
      <div style="font-size:11px;font-weight:600;color:#D4AF37;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Full Report</div>
      <pre style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#333;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;margin:0;">${plainReport}</pre>
    </div>

    <!-- CTA -->
    <div style="background:linear-gradient(135deg,#000036,#02066F);border-radius:16px;padding:32px;text-align:center;margin-bottom:20px;">
      <div style="font-size:20px;font-weight:700;color:#D4AF37;margin-bottom:8px;">Ready to level up?</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:20px;line-height:1.5;">AI Badge is a 6-week one-to-one coaching programme. Every session is personalised to your profile and goals. Start from &euro;90/week.</div>
      <a href="https://aibadge.fiveinnolabs.com/#pricing" style="display:inline-block;padding:14px 32px;border-radius:12px;background:#D4AF37;color:#000036;font-size:15px;font-weight:700;text-decoration:none;">See Plans &amp; Enrol</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#999;padding:16px 0;">
      Victor del Rosal · <a href="https://fiveinnolabs.com" style="color:#D4AF37;text-decoration:none;">fiveinnolabs</a> · 2026
    </div>

  </div>
</body>
</html>`;
}
