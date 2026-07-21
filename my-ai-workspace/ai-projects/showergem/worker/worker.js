// ShowerGem: live chatbot backend.
//
// Claude (claude-sonnet-5) is the brain. It has ONE tool, look_up_order, which reads
// a live Google Sheet of orders (synthetic demo data standing in for ShowerGem's real
// order system). Everything else - product facts, install steps, returns policy, FAQ -
// is baked into the system prompt from data/knowledge_base.md, because it's small,
// static, and verified from ShowerGem's real site rather than invented.
//
// The Anthropic API key is held server-side as the secret ANTHROPIC_API_KEY and never
// ships to the browser. Reused from the meadow-vet-bot Worker (same provider, same model).

const SHEET_ID = "1wrmipoybJz2_IfKqd7psR3zepIkZQGCfM-ic3mGUtfo";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const MODEL = "claude-sonnet-5";
const BRAND = "ShowerGem";

const ALLOW = [
  "https://showergem.ie",
  "https://aibadge.fiveinnolabs.com",
  "null"
];
// Local dev origins vary by port, so these get a real anchored regex instead of a
// substring/prefix check (unanchored startsWith() would let "http://localhost.evil.com"
// or "http://127.0.0.1.evil.com" spoof through - flagged by security review 2026-07-21).
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// ---------------------------------------------------------------------------
// Live data: fetch + parse the orders sheet. Cached ~60s at the module level so a
// burst of messages doesn't hammer Google, but edits to the sheet still show within
// a minute - same pattern as meadow-vet-bot.
// ---------------------------------------------------------------------------
let CACHE = { rows: null, at: 0 };
const CACHE_MS = 60_000;

async function getOrders() {
  const now = Date.now();
  if (CACHE.rows && now - CACHE.at < CACHE_MS) return CACHE.rows;
  const r = await fetch(SHEET_CSV_URL, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!r.ok) throw new Error(`sheet fetch failed: ${r.status}`);
  const rows = parseOrders(await r.text());
  CACHE = { rows, at: now };
  return rows;
}

// RFC-4180-ish CSV parser: handles quoted fields, embedded commas, and "" escapes.
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", i = 0, inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseOrders(text) {
  const grid = parseCSV(text).filter(r => r.length > 1 && r.some(c => c.trim() !== ""));
  if (!grid.length) return [];
  const header = grid[0].map(h => h.trim());
  const idx = (name) => header.indexOf(name);
  const col = {
    order_id: idx("order_id"), order_date: idx("order_date"), customer_name: idx("customer_name"),
    email: idx("email"), phone: idx("phone"), product: idx("product"), quantity: idx("quantity"),
    total_eur: idx("total_eur"), ship_address: idx("ship_address"), county: idx("county"),
    eircode: idx("eircode"), status: idx("status"), carrier: idx("carrier"),
    tracking_number: idx("tracking_number"), dispatch_date: idx("dispatch_date"),
    est_delivery: idx("est_delivery"), delivered_date: idx("delivered_date"), notes: idx("notes")
  };
  return grid.slice(1).map(r => ({
    order_id: (r[col.order_id] || "").trim(),
    order_date: (r[col.order_date] || "").trim(),
    customer_name: (r[col.customer_name] || "").trim(),
    email: (r[col.email] || "").trim(),
    phone: (r[col.phone] || "").trim(),
    product: (r[col.product] || "").trim(),
    quantity: Number((r[col.quantity] || "").trim()) || null,
    total_eur: Number((r[col.total_eur] || "").trim()) || null,
    ship_address: (r[col.ship_address] || "").trim(),
    county: (r[col.county] || "").trim(),
    eircode: (r[col.eircode] || "").trim(),
    status: (r[col.status] || "").trim(),
    carrier: (r[col.carrier] || "").trim(),
    tracking_number: (r[col.tracking_number] || "").trim(),
    dispatch_date: (r[col.dispatch_date] || "").trim(),
    est_delivery: (r[col.est_delivery] || "").trim(),
    delivered_date: (r[col.delivered_date] || "").trim(),
    notes: (r[col.notes] || "").trim()
  })).filter(x => x.order_id);
}

// ---------------------------------------------------------------------------
// Order lookup tool. Verification is deliberately BOTH email AND order number:
// an order number alone is guessable/sequential (SG-1042, SG-1041, ...), so a
// single-field lookup would let anyone pull a stranger's name, address and phone
// number. Wrong match returns one generic "not found" message either way, so a
// bad actor can't use the response to learn which field was wrong (no oracle).
// ---------------------------------------------------------------------------
const ORDER_TOOL = {
  name: "look_up_order",
  description:
    `Look up a ${BRAND} order's live status, tracking and delivery details. Requires BOTH the order number and the email address used to place the order (case-insensitive) - this is a security check, not optional, because order numbers alone are guessable. ` +
    `Use for ANY question about "where is my order", order status, tracking, delivery date, or a return/refund/cancellation already in progress. Never guess or invent an order's status.`,
  input_schema: {
    type: "object",
    properties: {
      order_id: { type: "string", description: "The order number, e.g. 'SG-1042'. Ask the customer for it if not given." },
      email: { type: "string", description: "The email address used to place the order. ALWAYS required alongside order_id - ask for it if the customer only gave the order number." }
    },
    required: ["order_id", "email"]
  }
};

function runLookup(args) {
  return getOrders().then(all => {
    args = args || {};
    const wantId = String(args.order_id || "").trim().toUpperCase();
    const wantEmail = String(args.email || "").trim().toLowerCase();
    if (!wantId || !wantEmail) {
      return { error: "missing_fields", instruction_for_you: "You need BOTH the order number and the email address to look this up. Ask for whichever is missing." };
    }
    const hit = all.find(o => o.order_id.toUpperCase() === wantId && o.email.toLowerCase() === wantEmail);
    if (!hit) {
      // Deliberately generic: do not reveal whether the order_id or the email was the mismatch.
      return {
        found: false,
        message: "No order matches that order number and email together.",
        instruction_for_you: "Do NOT say which field was wrong (that would let someone probe for valid order numbers). Ask the customer to double-check both, or suggest they check their order confirmation email for the exact order number and the email address they used to buy."
      };
    }
    return {
      found: true,
      order_id: hit.order_id,
      order_date: hit.order_date,
      product: hit.product,
      quantity: hit.quantity,
      total_eur: hit.total_eur,
      status: hit.status,
      county: hit.county,
      carrier: hit.carrier || null,
      tracking_number: hit.tracking_number || null,
      dispatch_date: hit.dispatch_date || null,
      est_delivery: hit.est_delivery || null,
      delivered_date: hit.delivered_date || null,
      notes: hit.notes || null
    };
  });
}

const TOOLS = { look_up_order: runLookup };
const ALL_TOOLS = [ORDER_TOOL];

// ---------------------------------------------------------------------------
// Knowledge base: verified 2026-07-21 from showergem.ie's live pages + live
// Shopify product JSON. See data/knowledge_base.md for the full sourcing notes
// and the correction log. Kept in the system prompt because it's small, static,
// and the whole point is that every fact here has already been checked - a bot
// should not need to "look up" things this well established.
// ---------------------------------------------------------------------------
const KNOWLEDGE_BASE = `
COMPANY: ShowerGem Limited, Clerhaun, Westport, Co. Mayo, F28EY27, Ireland. Designed and manufactured in Ireland.

PRODUCT - ShowerGem Shower Caddy (the only product you have verified facts for):
- Materials: engineering-grade plastic, 100% rustproof.
- Dimensions: 38cm tall x 17cm wide, protrudes 8cm from the wall.
- Weights: 2 Pack 0.76kg, 4 Pack 1.6kg, 6 Pack 2.3kg.
- REAL checkout prices (confirmed against ShowerGem's live Shopify product data, not the marketing banners which are stale/inconsistent): Set of 2 = EUR 56.99, Set of 4 = EUR 99.99, Set of 6 = EUR 149.99. Free delivery on all orders. If asked about "30% off" or other banner claims, say the current price is the number above; do not repeat a discount percentage you can't verify.
- Warranty: 2 Years Full Guarantee (separate from the returns window).
- Rating: quote as "over 250,000 units sold, 4.9+ out of 5 from thousands of verified reviews" - the exact review count varies across ShowerGem's own pages, so never state one precise number.
- Works on: all tile types (smooth, rough, textured), most bathroom surfaces. Does NOT work on / not recommended: soft plastic, laminate, vinyl - suggest checking with the surface manufacturer first if the customer's wall type is unusual. Never claim it works on "all surfaces" without this caveat, even though ShowerGem's own homepage banner says that - the FAQ is more careful and more correct.
- What's included: the caddy unit(s), specialised adhesive glue, a cleaning wipe.

INSTALLATION (verbatim from the real FAQ):
1. Clean the wall area with the provided wipe.
2. Apply the provided glue to the connector, place on the wall, wait 24 hours.
3. Hang the ShowerGem. Takes about 60 seconds hands-on. No tools, screws or drilling.
You CAN shower normally during the 24-hour cure time. To remove permanently: gently use a paint scraper or blunt knife. To relocate it: you need to buy a new tube of glue - the original bond isn't reusable. The glue is engineering-grade, the same type used in automotive and aeronautical industries.

NORMAL, NOT A DEFECT: every unit has small "weld line" scratch-like marks and two circular mold dots from manufacturing. These are normal, can't be removed, don't affect function, and become unnoticeable once mounted. If a customer asks about marks on their product, reassure them with this - don't treat it as a fault.

CLEANING: clips on/off the wall. Clean with a soft cloth and warm water. Drainage slots behind the shelves mean no water is retained.

RETURNS - GENUINELY UNRESOLVED ON SHOWERGEM'S OWN SITE, DO NOT STATE A SPECIFIC NUMBER AS FACT:
ShowerGem's homepage says "60-Day Money Back Guarantee" in two places. The product page's own FAQ says "30 Day Hassle-Free Returns" by name, twice, matching the separate return-policy page. These are both real, current, and contradictory. NEVER pick one and state it as fact. Instead say something like: "ShowerGem's return window is at least 30 days from your order date - to get the exact figure right for you, please check your order confirmation email or email returns@showergem.com before sending anything back, since the number isn't fully consistent across our own pages yet." Whichever the true window turns out to be: item must be unused, original condition, original packaging, proof of purchase required; the customer pays return shipping and it's deducted from the refund; replacements are only issued for defective/damaged items; return address is ShowerGem, Clerhaun, Westport, Mayo, F28EY27, Ireland.

CONTACT: for a return, use returns@showergem.com. For anything else, use info@showergem.com. No published phone number or stated hours - don't invent one.

EXTENDED WARRANTY: a registration form exists but ShowerGem's Ireland/EU page does not state duration, coverage, deadline or cost - do not invent terms. If asked, say registration is available on-site but the exact terms aren't published for Ireland yet, and to email info@showergem.com to confirm.

OUT OF SCOPE / DO NOT ANSWER WITH CONFIDENCE: the "No-Bristle Toilet Brush" product page is currently broken on ShowerGem's own site (duplicated content from the caddy page) - do not state its price or specs. Bundle SKUs (with brushes, mastercarton, standalone replacement glue) are not verified either. For any of these, say ShowerGem does carry it but you don't have confirmed details, and point to info@showergem.com or the site.
`.trim();

// ---------------------------------------------------------------------------
// Chat: Claude tool-use loop (same shape as meadow-vet-bot)
// ---------------------------------------------------------------------------
function cors(origin) {
  const ok = origin && (ALLOW.includes(origin) || LOCAL_ORIGIN.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOW[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}

function systemPrompt() {
  return `You are the friendly customer support and sales assistant for ${BRAND}, an Irish company that sells the ShowerGem shower caddy - a no-suction-cup, adhesive-mounted shower organiser.

Your knowledge of ${BRAND}'s products and policies (everything below has been directly verified against the real site - use it with confidence, and follow its exact caveats where noted):
${KNOWLEDGE_BASE}

Rules:
- For ANY question about "where is my order", order status, tracking, delivery date, or an in-progress return/refund/cancellation, call look_up_order. You need BOTH the order number and the email used to order - if the customer gives only one, ask for the other before calling the tool. Never guess or invent an order's status.
- If look_up_order returns found:false, do NOT say which field (order number or email) was wrong - just say they don't match together, and suggest checking the order confirmation email. This is a security measure: don't help anyone guess valid order numbers.
- When you report an order's status, translate it plainly: "Processing" means not yet dispatched, "Dispatched"/"In Transit"/"Out for Delivery" means on the way (mention the carrier and tracking number if present), "Delivered" means it has arrived, "Delayed" means there was a delivery exception (explain the note if there is one), "Return Requested" means a return is already in progress, "Refunded" means the refund has been issued, "Cancelled" means the order was cancelled before dispatch.
- Never state the returns window as a flat "30 days" or "60 days" - follow the exact guidance in the knowledge base above, which is honest about the conflict on ShowerGem's own site.
- Never claim the product "works on all surfaces" without the soft plastic/laminate/vinyl caveat, even though ShowerGem's marketing banner says that - the FAQ is the more careful, more correct source.
- For pricing, always quote the verified checkout prices in the knowledge base (EUR 56.99 / 99.99 / 149.99), not any "30% off" or other discount banner text you were not given verified numbers for.
- For anything outside the knowledge base (the toilet brush, bundle SKUs, extended warranty exact terms, anything you're not sure of), say so honestly and point to info@showergem.com rather than guessing.
- Keep replies short and warm: 1-3 sentences for most answers. No markdown headings, no long bulleted catalogues, no emoji spam.
- You are an AI assistant, not a human. If asked, say so plainly.
- Only discuss ${BRAND} and its shower caddy. If asked something unrelated, steer back to how you can help with their ShowerGem order or questions.`;
}

async function chat(messages, env, origin) {
  const clean = (Array.isArray(messages) ? messages : [])
    .slice(-12)
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (!clean.length) return json({ error: "need messages" }, 400, origin);

  const convo = clean.map(m => ({ role: m.role, content: m.content }));
  let order = null;
  let finalText = "";

  for (let round = 0; round < 4; round++) {
    let r;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system: systemPrompt(),
          tools: ALL_TOOLS,
          messages: convo
        })
      });
    } catch (e) {
      return json({ error: "network", detail: String(e).slice(0, 200) }, 502, origin);
    }
    if (!r.ok) {
      const tx = await r.text();
      return json({ error: "upstream", status: r.status, detail: tx.slice(0, 300) }, 502, origin);
    }
    const data = await r.json();
    const content = data.content || [];
    for (const block of content) if (block.type === "text") finalText += block.text;

    if (data.stop_reason === "tool_use") {
      convo.push({ role: "assistant", content });
      const toolResults = [];
      for (const block of content) {
        if (block.type !== "tool_use") continue;
        let result;
        const fn = TOOLS[block.name];
        try { result = fn ? await fn(block.input) : { error: `unknown tool: ${block.name}` }; }
        catch (e) { result = { error: String((e && e.message) || e).slice(0, 200) }; }
        if (block.name === "look_up_order" && result && result.found) order = result;
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
      }
      convo.push({ role: "user", content: toolResults });
      finalText = ""; // the answer we keep is the model's text AFTER it has the tool data
      continue;
    }
    break; // end_turn
  }

  finalText = finalText.trim();
  if (!finalText) return json({ error: "empty" }, 502, origin);

  return json({ reply: finalText, order }, 200, origin);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

    // Tiny health/inspection endpoint (no key needed): confirms live data flows.
    if (req.method === "GET") {
      try {
        const rows = await getOrders();
        return json({ ok: true, brand: BRAND, live_orders: rows.length }, 200, origin);
      } catch (e) {
        return json({ ok: false, error: String(e).slice(0, 200) }, 502, origin);
      }
    }

    if (req.method !== "POST") return json({ error: "POST only" }, 405, origin);

    let body;
    try { body = await req.json(); } catch (_) { return json({ error: "bad json" }, 400, origin); }
    return chat(body.messages, env, origin);
  }
};
