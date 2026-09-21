import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Lang = "es" | "en";
type Intent = "conversation" | "information" | "discovery" | "recommendation";
type Filters = { recipient?: string | null; occasion?: string | null; style?: string | null; color?: string | null; budgetMax?: number | null; keywords: string[] };
type KnowledgeRow = { key: string; value: string; is_active?: boolean };

const OPENAI_MODEL = "gpt-5-mini";
const RECOMMENDATION_MARKER = "__florencio_recommendation__";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function extractResponseText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;
  if (typeof root.output_text === "string" && root.output_text.trim()) return root.output_text.trim();
  const output = Array.isArray(root.output) ? root.output : [];
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n").trim();
}

function cleanJson(raw: string) {
  return raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

async function fetchTable(path: string): Promise<Record<string, unknown>[]> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return [];
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data as Record<string, unknown>[] : [];
}

async function loadKnowledge() {
  const [knowledge, settings] = await Promise.all([
    fetchTable("florencio_knowledge?select=key,value,is_active&is_active=eq.true"),
    fetchTable("settings?select=key,value"),
  ]);
  const lines = [
    ...knowledge.map((row) => `${String(row.key)}: ${String(row.value)}`),
    ...settings.map((row) => `${String(row.key)}: ${String(row.value)}`),
  ];
  return Array.from(new Set(lines)).slice(0, 80).join("\n");
}

function promptFor(language: Lang, knowledge: string) {
  const languageName = language === "en" ? "English" : "Spanish";
  return `You are Florencio, the virtual floral assistant of Deluxury Floristería in Barranquilla, Colombia.

LANGUAGE
- Reply only in ${languageName}.
- Keep replies natural, warm, elegant and concise.

CORE BEHAVIOR
- Your job is to understand the customer before recommending products.
- Never behave like an aggressive salesperson.
- Ask at most one useful question per turn during discovery.
- Preserve facts the customer already supplied.

INTENTS
- conversation: greetings, thanks, who you are, casual chat. Do not recommend products.
- information: questions about Deluxury, services, website, delivery, account, orders or policies. Use official context only.
- discovery: the customer wants a gift or flowers but important details are missing. Ask one short question. Do not recommend products yet.
- recommendation: enough intent exists to search the real catalog. The app will perform the catalog ranking.

RECOMMENDATION GATE
Use recommendation only when there is a clear need and enough context to make a meaningful search. A greeting alone is never enough.

BUDGET
- budgetMax is a hard ceiling.
- Never reinterpret a customer's maximum upward.
- Never claim an over-budget product fits.
- Never automatically upsell when nothing fits.
- If no product fits, the client-facing app will say so honestly.

FACTUALITY
- Do not invent products, prices, stock, delivery times, address, phone, hours, discounts or policies.
- For business facts, use only OFFICIAL CONTEXT below.

OFFICIAL CONTEXT
${knowledge || "No additional official context is currently available. If a fact is missing, say you do not have it."}

OUTPUT
Return only the structured JSON requested by the response schema.\n`;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY is not configured" }, 500);

  try {
    const body = await request.json().catch(() => ({}));
    const language: Lang = body?.language === "en" ? "en" : "es";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const currentFilters = (body?.currentFilters && typeof body.currentFilters === "object") ? body.currentFilters : { keywords: [] };
    if (!message) return json({ error: "message is required" }, 400);

    const knowledge = await loadKnowledge();
    const payload = {
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: promptFor(language, knowledge) }] },
        ...history.map((item: Record<string, unknown>) => ({
          role: item.role === "florencio" ? "assistant" : "user",
          content: [{ type: "input_text", text: String(item.text ?? "") }],
        })),
        { role: "user", content: [{ type: "input_text", text: `CURRENT FILTERS: ${JSON.stringify(currentFilters)}\nCUSTOMER MESSAGE: ${message}` }] },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "florencio_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: { type: "string", enum: ["conversation", "information", "discovery", "recommendation"] },
              reply: { type: "string" },
              filters: {
                type: "object",
                properties: {
                  recipient: { type: ["string", "null"] },
                  occasion: { type: ["string", "null"] },
                  style: { type: ["string", "null"] },
                  color: { type: ["string", "null"] },
                  budgetMax: { type: ["number", "null"] },
                  keywords: { type: "array", items: { type: "string" } },
                },
                required: ["recipient", "occasion", "style", "color", "budgetMax", "keywords"],
                additionalProperties: false,
              },
              keywords: { type: "array", items: { type: "string" } },
            },
            required: ["intent", "reply", "filters", "keywords"],
            additionalProperties: false,
          },
        },
      },
      max_output_tokens: 500,
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Florencio: OpenAI error", { status: response.status, body: data });
      return json({ error: "OpenAI request failed", status: response.status }, 502);
    }

    const responseText = extractResponseText(data);
    if (!responseText) {
      console.error("Florencio: OpenAI returned no text", { responseId: (data as Record<string, unknown>)?.id ?? null, status: (data as Record<string, unknown>)?.status ?? null });
      throw new Error("OpenAI no devolvió contenido de texto");
    }

    const parsed = JSON.parse(cleanJson(responseText)) as Record<string, unknown>;
    const filters = (parsed.filters && typeof parsed.filters === "object" ? parsed.filters : {}) as Record<string, unknown>;
    const intent = parsed.intent;
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    if (!reply || !["conversation", "information", "discovery", "recommendation"].includes(String(intent))) {
      throw new Error("Respuesta estructurada inválida");
    }

    const outputIntent = intent as Intent;
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.filter((x): x is string => typeof x === "string").slice(0, 16) : [];
    const filterKeywords = Array.isArray(filters.keywords) ? filters.keywords.filter((x): x is string => typeof x === "string").slice(0, 16) : [];

    return json({
      intent: outputIntent,
      reply,
      filters: {
        recipient: typeof filters.recipient === "string" ? filters.recipient : null,
        occasion: typeof filters.occasion === "string" ? filters.occasion : null,
        style: typeof filters.style === "string" ? filters.style : null,
        color: typeof filters.color === "string" ? filters.color : null,
        budgetMax: safeNumber(filters.budgetMax),
        keywords: filterKeywords,
      },
      keywords: Array.from(new Set([...keywords, ...(outputIntent === "recommendation" ? [RECOMMENDATION_MARKER] : [])])).slice(0, 17),
    });
  } catch (error) {
    console.error("Florencio edge function error:", error);
    return json({ error: "Florencio could not complete the request" }, 500);
  }
});
