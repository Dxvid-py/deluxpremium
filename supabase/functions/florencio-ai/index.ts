import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Intent = "conversation" | "information" | "discovery" | "recommendation";
type Filters = {
  recipient?: string;
  occasion?: string;
  style?: string;
  color?: string;
  budgetMax?: number;
  keywords: string[];
};
type KnowledgeRow = { key: string; value: string };

const RECOMMENDATION_MARKER = "__florencio_recommendation__";

const SYSTEM = `Eres Florencio, el asistente virtual de Deluxury Floristería.

IDENTIDAD Y TONO
- Hablas siempre en español.
- Eres cálido, elegante, natural y sincero.
- No eres un vendedor agresivo.
- Respondes de forma breve, humana y útil.
- Puedes conversar, explicar Deluxury y ayudar a encontrar productos reales.

REGLA CENTRAL
Tu prioridad es ayudar al cliente, no forzar una venta.

INTENCIONES
1. conversation: saludos, despedidas, agradecimientos, preguntas sobre ti o conversación casual. NO actives recomendaciones.
2. information: preguntas sobre Deluxury, la floristería, la página, compras, domicilios, cuenta, pedidos, categorías, servicios u otra información de negocio. Usa únicamente la información oficial proporcionada.
3. discovery: el cliente quiere comprar o regalar algo, pero faltan datos importantes. Haz UNA pregunta corta. No muestres productos todavía.
4. recommendation: usa esta intención cuando ya haya suficiente información para buscar. La aplicación buscará los productos reales.

REGLAS DE SINCERIDAD
- Nunca inventes productos, precios, stock, disponibilidad, descuentos, políticas, horarios, direcciones, tiempos de entrega ni servicios.
- Si hay un presupuesto máximo, respétalo estrictamente.
- No sugieras automáticamente algo más caro cuando no existe una coincidencia.
- Conserva información útil que el cliente ya haya dado.
- No hagas un interrogatorio.

SALIDA
Devuelve JSON válido y nada más:
{
  "intent": "conversation|information|discovery|recommendation",
  "reply": "respuesta breve para el cliente",
  "filters": {
    "recipient": "pareja|mama|papa|amiga|amigo|familia|otro o null",
    "occasion": "cumpleanos|aniversario|amor|dia_de_la_madre|dia_del_padre|graduacion|boda|condolencias|otro o null",
    "style": "romantico|elegante|minimalista|lujoso|alegre|clasico|otro o null",
    "color": "rojo|rosado|blanco|amarillo|azul|morado|mixto|otro o null",
    "budgetMax": number o null,
    "keywords": ["palabras", "clave"]
  },
  "keywords": ["palabras", "clave"]
}
budgetMax siempre es un número en COP. Convierte 200 mil, 200k o doscientos mil en 200000. Usa null cuando no conozcas un dato. No generes listas de productos.`;

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1]?.trim() ?? text.trim();
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeFilters(raw: unknown, previous: Filters): Filters {
  const f = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = Number(f.budgetMax);
  const keywords = [
    ...(Array.isArray(previous.keywords) ? previous.keywords : []),
    ...(Array.isArray(f.keywords) ? f.keywords : []),
  ]
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  return {
    recipient: normalizeString(f.recipient) ?? previous.recipient,
    occasion: normalizeString(f.occasion) ?? previous.occasion,
    style: normalizeString(f.style) ?? previous.style,
    color: normalizeString(f.color) ?? previous.color,
    budgetMax: Number.isFinite(num) && num > 0 ? num : previous.budgetMax,
    keywords: Array.from(new Set(keywords)).slice(0, 20),
  };
}

function normalizePrevious(raw: unknown): Filters {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const budget = Number(value.budgetMax);
  return {
    recipient: normalizeString(value.recipient),
    occasion: normalizeString(value.occasion),
    style: normalizeString(value.style),
    color: normalizeString(value.color),
    budgetMax: Number.isFinite(budget) && budget > 0 ? budget : undefined,
    keywords: Array.isArray(value.keywords)
      ? value.keywords.filter((x): x is string => typeof x === "string").map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 20)
      : [],
  };
}

function extractResponseText(root: unknown): string {
  if (!root || typeof root !== "object") return "";
  const response = root as Record<string, unknown>;
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text.trim();

  const output = response.output;
  if (!Array.isArray(output)) return "";

  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const content = record.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const partRecord = part as Record<string, unknown>;
      if (partRecord.type === "output_text" && typeof partRecord.text === "string") chunks.push(partRecord.text);
    }
  }
  return chunks.join("\n").trim();
}

async function loadKnowledge(): Promise<KnowledgeRow[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return [];
  const response = await fetch(`${url}/rest/v1/florencio_knowledge?select=key,value&order=key.asc`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data)
    ? data.filter((row): row is KnowledgeRow => !!row && typeof row.key === "string" && typeof row.value === "string")
    : [];
}

function knowledgeText(rows: KnowledgeRow[]) {
  if (!rows.length) return "No hay información oficial adicional disponible. Si el cliente pregunta algo que no conoces, dilo claramente.";
  return rows.map((row) => `${row.key}: ${row.value}`).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("FLORENCIO_MODEL") || "gpt-5-mini";
    if (!apiKey) throw new Error("Falta configurar OPENAI_API_KEY");

    const body = await req.json();
    const message = String(body?.message ?? "").trim();
    if (!message) throw new Error("Mensaje vacío");

    const previous = normalizePrevious(body?.currentFilters);
    const history = Array.isArray(body?.history) ? body.history.slice(-8) : [];
    const conversation = history
      .map((m: Record<string, unknown>) => `${m.role === "user" ? "Cliente" : "Florencio"}: ${String(m.text ?? "").slice(0, 500)}`)
      .join("\n");
    const knowledge = await loadKnowledge();

    const userPrompt = `INFORMACIÓN OFICIAL DE DELUXURY:\n${knowledgeText(knowledge)}\n\nFILTROS ACTUALES:\n${JSON.stringify(previous)}\n\nCONVERSACIÓN RECIENTE:\n${conversation || "(sin conversación previa)"}\n\nNUEVO MENSAJE DEL CLIENTE:\n${message}\n\nClasifica correctamente la intención. Un saludo es conversation, una pregunta sobre Deluxury es information, una necesidad incompleta es discovery y solamente una solicitud suficientemente definida debe ser recommendation.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        text: { format: { type: "json_object" } },
        reasoning: { effort: "minimal" },
        max_output_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 600)}`);
    }

    const data = await response.json();
    const responseText = extractResponseText(data);
    if (!responseText) {
      const incompleteReason = typeof data?.incomplete_details?.reason === "string" ? data.incomplete_details.reason : "unknown";
      throw new Error(`OpenAI no devolvió texto utilizable (${incompleteReason}).`);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleanJson(responseText)) as Record<string, unknown>;
    } catch {
      throw new Error("OpenAI devolvió una respuesta que no pudo interpretarse como JSON.");
    }

    const validIntents = new Set<Intent>(["conversation", "information", "discovery", "recommendation"]);
    const intent: Intent = validIntents.has(parsed.intent as Intent) ? (parsed.intent as Intent) : "conversation";
    const filters = normalizeFilters(parsed.filters, previous);
    const rawKeywords = [
      ...filters.keywords,
      ...(Array.isArray(parsed.keywords) ? parsed.keywords : []),
    ]
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .filter((x) => x !== RECOMMENDATION_MARKER);

    const keywords = Array.from(new Set([
      ...rawKeywords,
      ...(intent === "recommendation" ? [RECOMMENDATION_MARKER] : []),
    ])).slice(0, 21);

    return new Response(JSON.stringify({
      intent,
      reply: String(parsed.reply ?? "Cuéntame un poco más y te ayudo.").slice(0, 500),
      filters: { ...filters, keywords },
      keywords,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
