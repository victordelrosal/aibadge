// Cloudflare Worker: AI Badge Report Mailer
// Receives assessment data, sends formatted email via Resend

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "POST required" }, 405);
    }

    try {
      const body = await request.json();
      const { email, scores, score, tier, archetype, flags, report } = body;

      if (!email || !email.includes("@")) {
        return jsonResponse({ error: "Valid email required" }, 400);
      }

      // Build HTML email
      const html = buildEmailHTML({ scores, score, tier, archetype, flags, report });

      // Send via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL,
          to: email,
          subject: `Your AI Competency Report: ${tier} (Score: ${score}/100)`,
          html: html,
          text: report || ""
        })
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Resend error:", result);
        return jsonResponse({ error: "Email send failed", detail: result }, 500);
      }

      return jsonResponse({ success: true, id: result.id });

    } catch (err) {
      console.error("Worker error:", err);
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function buildEmailHTML({ scores, score, tier, archetype, flags, report }) {
  const s = score || 0;
  const dims = [
    { name: "AI Foundations", val: scores?.aiFoundations || 1 },
    { name: "Critical Evaluation", val: scores?.criticalEvaluation || 1 },
    { name: "Productive Creation", val: scores?.productiveCreation || 1 },
    { name: "Technical Building", val: scores?.technicalBuilding || 1 },
    { name: "Ethics & Governance", val: scores?.ethicsGovernance || 1 },
    { name: "Tool Fluency", val: scores?.toolFluency || 1 }
  ];

  const dimRows = dims.map(d => `
    <tr>
      <td style="padding:10px 16px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">${d.name}</td>
      <td style="padding:10px 16px;text-align:center;border-bottom:1px solid #f0f0f0;">
        <span style="display:inline-block;min-width:28px;padding:3px 10px;border-radius:8px;background:linear-gradient(180deg,#E8C84A,#B8960E);color:#fff;font-size:13px;font-weight:700;">${d.val}/5</span>
      </td>
    </tr>`).join("");

  const flagRows = (flags || []).map(f => `
    <div style="padding:12px 16px;margin-bottom:8px;border-radius:10px;background:${f.type === "warning" ? "#FFF8E1" : f.type === "caution" ? "#FFFDE7" : "#E8F4FD"};border:1px solid ${f.type === "warning" ? "#FFE082" : f.type === "caution" ? "#FFF59D" : "#B3E5FC"};font-size:13px;color:#333;line-height:1.5;">
      ${f.type === "warning" ? "\u26A0\uFE0F" : f.type === "caution" ? "\u25D0" : "\u2139\uFE0F"} ${f.text}
    </div>`).join("");

  // Bar chart for each dimension (email-safe, table-based)
  const maxBar = 200;
  const dimBars = dims.map(d => {
    const pct = (d.val / 5) * 100;
    const barW = Math.round((d.val / 5) * maxBar);
    return `
    <tr>
      <td style="padding:8px 0;font-size:14px;font-weight:600;color:#333;white-space:nowrap;vertical-align:middle;">${d.name}</td>
      <td style="padding:8px 12px;vertical-align:middle;width:${maxBar + 20}px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:${maxBar}px;"><tr>
          <td style="width:${barW}px;height:8px;background:#D4AF37;border-radius:4px 0 0 4px;${barW >= maxBar ? 'border-radius:4px;' : ''}"></td>
          ${barW < maxBar ? `<td style="width:${maxBar - barW}px;height:8px;background:#f0f0f0;border-radius:0 4px 4px 0;"></td>` : ''}
        </tr></table>
      </td>
      <td style="padding:8px 0;text-align:center;vertical-align:middle;">
        <span style="display:inline-block;min-width:24px;padding:2px 8px;border-radius:6px;background:#D4AF37;color:#fff;font-size:12px;font-weight:700;">${d.val}</span>
      </td>
    </tr>`;
  }).join("");

  // Escape HTML in report text
  const safeReport = (report || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<!-- Wrapper table for email client compatibility -->
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f7;">
<tr><td align="center" style="padding:40px 16px;">
<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">

  <!-- Header -->
  <tr><td align="center" style="padding-bottom:32px;">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding:10px 24px;border-radius:12px;background:#000036;">
        <span style="font-size:20px;font-weight:800;color:#D4AF37;letter-spacing:0.02em;">AI Badge</span>
      </td>
    </tr></table>
    <p style="font-size:12px;color:#999;margin:8px 0 0;">AI Competency Profile Report</p>
  </td></tr>

  <!-- Score card -->
  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td align="center" style="padding:40px 32px;">

      <!-- Score circle using table + border trick -->
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" style="width:120px;height:120px;border-radius:60px;border:6px solid #D4AF37;background:#ffffff;text-align:center;vertical-align:middle;">
          <span style="font-size:48px;font-weight:800;color:#D4AF37;line-height:1;">${s}</span><br>
          <span style="font-size:10px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.1em;">out of 100</span>
        </td>
      </tr></table>

      <p style="font-size:28px;font-weight:700;color:#000036;margin:20px 0 0;line-height:1.2;">${tier || "Unknown"}</p>
      <p style="font-size:14px;color:#666;margin:6px 0 0;">Profile type: <strong style="color:#333;">${archetype || "Unknown"}</strong></p>

    </td></tr>
    </table>
  </td></tr>

  <!-- Dimensions -->
  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td style="padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Your Dimension Scores</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${dimBars}
      </table>
    </td></tr>
    </table>
  </td></tr>

  ${flagRows ? `
  <!-- Observations -->
  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td style="padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Key Observations</p>
      ${flagRows}
    </td></tr>
    </table>
  </td></tr>
  ` : ""}

  <!-- Full report -->
  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:16px;">
    <tr><td style="padding:28px;">
      <p style="font-size:11px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px;">Detailed Report</p>
      <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#444;line-height:1.65;white-space:pre-wrap;word-wrap:break-word;margin:0;">${safeReport}</p>
    </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding-bottom:20px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000036;border-radius:16px;">
    <tr><td align="center" style="padding:40px 32px;">
      <p style="font-size:22px;font-weight:700;color:#D4AF37;margin:0 0 10px;">Ready to level up?</p>
      <p style="font-size:14px;color:#9999bb;margin:0 0 24px;line-height:1.6;">AI Badge is a 6-week one-to-one coaching programme. Every session is personalised to your profile and goals. Start from &euro;90/week.</p>
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding:14px 36px;border-radius:12px;background:#D4AF37;">
          <a href="https://aibadge.com/#pricing" style="font-size:15px;font-weight:700;color:#1a1a00;text-decoration:none;">See Plans &amp; Enrol</a>
        </td>
      </tr></table>
    </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding:20px 0;">
    <p style="font-size:11px;color:#bbb;margin:0;">Victor del Rosal &middot; <a href="https://fiveinnolabs.com" style="color:#D4AF37;text-decoration:none;">fiveinnolabs</a> &middot; 2026</p>
    <p style="font-size:10px;color:#ccc;margin:4px 0 0;">You received this because you requested an AI competency report at aibadge.com</p>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}
