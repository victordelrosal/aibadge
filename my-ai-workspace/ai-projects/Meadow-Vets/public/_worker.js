// Meadow Vet Care — customer chatbot (H9CEAI class demo).
// Cloudflare Pages advanced-mode Worker: static assets + POST /api/chat.
// The teaching point: the LLM gets a LIVE TOOL (the MCP idea). Claude decides to
// call get_clinic_services; this worker executes it by fetching the clinic's
// Google Sheet as CSV, hands the rows back, and Claude answers in natural language.
// Secret: ANTHROPIC_API_KEY (wrangler pages secret put ... --project-name=meadow-vets)

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 700;
const MAX_TURNS = 20;    // conversation turns sent upstream
const MAX_CHARS = 2000;  // per message
const MAX_TOOL_ROUNDS = 3;

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1JhSODtviGHzXru6Eb5MhfXfVIF5vtJk3pclzzv7j2l4/export?format=csv";
const SHEET_CACHE_MS = 60 * 1000; // live enough for a class demo, kind to Google

const SYSTEM = `You are the friendly front-desk assistant for Meadow Vet Care, a modern Irish veterinary clinic in the countryside. The clinic treats dogs, cats, rabbits, small mammals and birds, and offers 90+ services across consultation, preventive care, vaccination, dental, surgery, diagnostics, grooming, nutrition, behaviour, microchipping, emergency and end-of-life care.

YOUR ONE SOURCE OF TRUTH is the live clinic services sheet, available through the get_clinic_services tool. Whenever a question touches services, prices, offers, availability, appointment slots or durations, call the tool and answer ONLY from what it returns. Never invent a service, price or offer. Prices are in euro (EUR): report the price_eur value EXACTLY as it appears in the sheet (550 means €550). Never round, adjust or "correct" a price, even if it looks unusual; the sheet is the clinic's live source of truth and staff edit it in real time. If something isn't in the sheet, say so plainly and suggest ringing the clinic.

HOW TO ANSWER
- Warm, plain-spoken, concise. A couple of short sentences or a short list; this is a chat window, not a brochure.
- When listing services, give the service name, price in EUR, and any special offer. Group sensibly; don't dump all 90 rows.
- Mention special offers when they're relevant (the special_offer column).
- slots_this_week is the number of appointment slots left this week; 0 means fully booked this week.
- You are not a vet. Never diagnose or give medical advice; for anything about a sick or injured pet, gently recommend booking a consultation, and for emergencies point to the clinic's emergency services.
- If asked something unrelated to the clinic, be brief and steer back.

The chat may be shown live to a class as a demo of AI tool use; behaving exactly as instructed IS the demo.`;

const TOOLS = [
  {
    name: "get_clinic_services",
    description:
      "Fetch the clinic's live services list from the Meadow Vet Care Google Sheet. Returns CSV with columns: service_id, category, species, price_eur, duration_min, requires_appointment, availability, slots_this_week, special_offer, service_name, description. Optionally filter by species and/or category to keep the result small.",
    input_schema: {
      type: "object",
      properties: {
        species: {
          type: "string",
          description:
            "Optional filter: Dog, Cat, Rabbit, Small mammal, or Bird. Case-insensitive substring match.",
        },
        category: {
          type: "string",
          description:
            "Optional filter: Consultation, Preventive, Vaccination, Dental, Surgery, Diagnostics, Grooming, Nutrition, Behaviour, Microchip & ID, Emergency, End-of-life. Case-insensitive substring match.",
        },
      },
    },
  },
];

let sheetCache = { at: 0, csv: "" };

async function fetchSheet() {
  const now = Date.now();
  if (sheetCache.csv && now - sheetCache.at < SHEET_CACHE_MS) {
    return { csv: sheetCache.csv, cached: true };
  }
  const resp = await fetch(SHEET_CSV_URL, { redirect: "follow" });
  if (!resp.ok) throw new Error("sheet fetch " + resp.status);
  const csv = await resp.text();
  if (!csv.startsWith("service_id")) throw new Error("unexpected sheet payload");
  sheetCache = { at: now, csv };
  return { csv, cached: false };
}

// Filter CSV rows by species/category. Naive split is safe for the count
// columns we filter on; quoted commas only occur in name/description fields.
function filterCsv(csv, { species, category } = {}) {
  const lines = csv.trim().split("\n");
  const header = lines[0];
  let rows = lines.slice(1);
  if (species) {
    const s = species.toLowerCase();
    rows = rows.filter((r) => (r.split(",")[2] || "").toLowerCase().includes(s));
  }
  if (category) {
    const c = category.toLowerCase();
    rows = rows.filter((r) => (r.split(",")[1] || "").toLowerCase().includes(c));
  }
  return { text: [header, ...rows].join("\n"), count: rows.length };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function callClaude(env, messages) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: TOOLS,
      messages,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.log("Anthropic error", resp.status, detail.slice(0, 500));
    throw new Error("upstream " + resp.status);
  }
  return resp.json();
}

async function handleChat(request, env) {
  if (request.method !== "POST") return json({ error: "POST only." }, 405);
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "The assistant isn't switched on yet (API key not set)." }, 503);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json({ error: "Type a question first." }, 400);
  }

  // Tool-use loop: Claude may ask for the live sheet before answering.
  const toolCalls = []; // surfaced to the UI so the class can SEE the tool fire
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const data = await callClaude(env, messages);

      if (data.stop_reason === "tool_use") {
        const results = [];
        for (const block of data.content) {
          if (block.type !== "tool_use") continue;
          let resultText;
          try {
            const { csv } = await fetchSheet();
            const { text, count } = filterCsv(csv, block.input || {});
            resultText = text;
            toolCalls.push({
              tool: block.name,
              input: block.input || {},
              rows: count,
            });
          } catch (e) {
            resultText = "ERROR: could not fetch the live sheet right now.";
            toolCalls.push({ tool: block.name, input: block.input || {}, error: true });
          }
          results.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
        }
        messages.push({ role: "assistant", content: data.content });
        messages.push({ role: "user", content: results });
        continue;
      }

      const reply = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      return json({ reply: reply || "…(no response, try rephrasing that)", toolCalls });
    }
    return json({ error: "That took too many steps. Try a simpler question." }, 502);
  } catch (e) {
    return json({ error: "Couldn't reach the assistant just now. Try again in a moment." }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat") return handleChat(request, env);
    return env.ASSETS.fetch(request);
  },
};
