import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

type KnowledgeRow = {
  key: string;
  value: string;
};

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
Debes clasificar cada mensaje en una de estas cuatro intenciones:

1. "conversation"
   Saludos, despedidas, agradecimientos, preguntas sobre ti o conversación casual.
   NO actives recomendaciones.

2. "information"
   Preguntas sobre Deluxury, la floristería, la página, compras, domicilios,
   cuenta, pedidos, categorías, servicios u otra información de negocio.
   Responde usando únicamente la INFORMACIÓN OFICIAL proporcionada por el sistema.
   Si la información no está disponible, dilo claramente. NO inventes.

3. "discovery"
   El cliente quiere comprar o regalar algo, pero todavía faltan datos importantes
   para recomendar con criterio.
   Haz UNA pregunta corta que ayude a completar la información.
   No muestres productos todavía.

4. "recommendation"
   Usa esta intención solamente cuando ya haya suficiente información para buscar:
   al menos una necesidad clara y, cuando corresponda, el presupuesto/preferencia
   suficiente para que una búsqueda tenga sentido.
   La aplicación buscará los productos reales.

REGLAS DE SINCERIDAD
- Nunca inventes productos, precios, stock, disponibilidad, descuentos, políticas,
  horarios, direcciones, tiempos de entrega ni servicios.
- Nunca presentes un producto fuera del presupuesto como si estuviera dentro.
- Si el cliente establece un presupuesto máximo, respétalo estrictamente.
- No sugieras automáticamente algo más caro cuando no existe una coincidencia.
- Si no hay productos dentro del presupuesto, la aplicación informará ese resultado.
- No cambies silenciosamente el presupuesto del cliente.
- Solo menciona una opción más cara si el cliente pregunta explícitamente por alternativas
  fuera de presupuesto o pregunta cuánto necesita gastar.
- Si una respuesta no está respaldada por información oficial, dilo.
- Nunca inventes una respuesta para parecer útil.

REGLAS DE CONVERSACIÓN
- "Hola", "buenas", "¿quién eres?" y similares NO son solicitudes de productos.
- No preguntes presupuesto cuando el cliente solamente está saludando.
- En discovery haz una sola pregunta por turno.
- No hagas un interrogatorio.
- Conserva información útil que el cliente ya haya dado.
- Si el cliente ya dio ocasión, destinatario y presupuesto, no vuelvas a preguntarlos.

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

budgetMax siempre es un número en COP.
Convierte 200 mil, 200k o doscientos mil en 200000.
Usa null cuando no conozcas un dato.
No generes listas de productos.
La aplicación se encarga de buscar productos reales.`;

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\\s\\S]*?)\s*```/i);
  return fenced?.[1]?.trim() ?? text.trim();
}

function normalizeFilters(raw: unknown, previous: Filters): Filters {
  const f =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const num = Number(f.budgetMax);

  return {
    recipient:
      typeof f.recipient === "string" && f.recipient
        ? f.recipient
        : previous.recipient,
    occasion:
      typeof f.occasion === "string" && f.occasion
        ? f.occasion
        : previous.occasion,
    style:
      typeof f.style === "string" && f.style ? f.style : previous.style,
    color:
      typeof f.color === "string" && f.color ? f.color : previous.color,
    budgetMax:
      Number.isFinite(num) && num > 0 ? num : previous.budgetMax,
    keywords: Array.from(
      new Set([
        ...(previous.keywords ?? []),
        ...(Array.isArray(f.keywords) ? f.keywords : []),
      ])
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean),
    ).slice(0, 20),
  };
}

async function loadKnowledge(): Promise<KnowledgeRow[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) return [];

  const response = await fetch(
    `${url}/rest/v1/florencio_knowledge?select=key,value&order=key.asc`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data)
    ? data.filter(
        (row): row is KnowledgeRow =>
          !!row &&
          typeof row.key === "string" &&
          typeof row.value === "string",
      )
    : [];
}

function knowledgeText(rows: KnowledgeRow[]) {
  if (!rows.length) {
    return "No hay información oficial adicional disponible. Si el cliente pregunta algo que no conoces, dilo claramente.";
  }

  return rows
    .map((row) => `${row.key}: ${row.value}`)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("FLORENCIO_MODEL") || "gpt-5-mini";

    if (!apiKey) throw new Error("Falta configurar OPENAI_API_KEY");

    const body = await req.json();
    const message = String(body?.message ?? "").trim();

    const previous: Filters =
      body?.currentFilters ?? { keywords: [] };

    const history = Array.isArray(body?.history)
      ? body.history.slice(-8)
      : [];

    if (!message) throw new Error("Mensaje vacío");

    const conversation = history
      .map(
        (m: Record<string, unknown>) =>
          `${m.role === "user" ? "Cliente" : "Florencio"}: ${String(
            m.text ?? "",
          ).slice(0, 500)}`,
      )
      .join("\n");

    const knowledge = await loadKnowledge();

    const userPrompt = `INFORMACIÓN OFICIAL DE DELUXURY:
${knowledgeText(knowledge)}

FILTROS ACTUALES:
${JSON.stringify(previous)}

CONVERSACIÓN RECIENTE:
${conversation || "(sin conversación previa)"}

NUEVO MENSAJE DEL CLIENTE:
${message}

Clasifica correctamente la intención.
Recuerda: un saludo es conversation, una pregunta sobre Deluxury es information,
una necesidad incompleta es discovery y solamente una solicitud suficientemente definida
debe ser recommendation.`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content: [{ type: "input_text", text: SYSTEM }],
            },
            {
              role: "user",
              content: [{ type: "input_text", text: userPrompt }],
            },
          ],
          text: { format: { type: "json_object" } },
          max_output_tokens: 350,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `OpenAI ${response.status}: ${detail.slice(0, 400)}`,
      );
    }

    const data = await response.json();
    const parsed = JSON.parse(
      cleanJson(String(data.output_text ?? "")),
    ) as Record<string, unknown>;

    const validIntents = new Set<Intent>([
      "conversation",
      "information",
      "discovery",
      "recommendation",
    ]);

    const intent: Intent = validIntents.has(parsed.intent as Intent)
      ? (parsed.intent as Intent)
      : "conversation";

    const filters = normalizeFilters(parsed.filters, previous);

    const rawKeywords = Array.from(
      new Set([
        ...(filters.keywords ?? []),
        ...(Array.isArray(parsed.keywords) ? parsed.keywords : []),
      ]),
    )
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .filter((x) => x !== RECOMMENDATION_MARKER);

    const keywords = Array.from(
      new Set([
        ...rawKeywords,
        ...(intent === "recommendation" ? [RECOMMENDATION_MARKER] : []),
      ]),
    ).slice(0, 21);

    return new Response(
      JSON.stringify({
        intent,
        reply: String(
          parsed.reply ??
            "Cuéntame un poco más y te ayudo.",
        ).slice(0, 500),
        filters: { ...filters, keywords },
        keywords,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Error inesperado",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
