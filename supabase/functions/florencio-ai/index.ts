import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Filters = {
  recipient?: string;
  occasion?: string;
  style?: string;
  color?: string;
  budgetMax?: number;
  keywords: string[];
};

const SYSTEM = `Eres Florencio, el asistente floral de Deluxury, una floristería premium colombiana.

Tu trabajo es interpretar la intención del cliente para que la aplicación pueda buscar productos reales en el catálogo.

Hablas en español, con tono cálido, elegante y natural.
Tu respuesta debe ser MUY BREVE: una sola respuesta de máximo 180 caracteres, sin listas, sin markdown y sin repetir la pregunta.

NO inventes productos, precios, stock, envíos ni políticas.
NO generes listas de productos.
La aplicación se encarga de recomendar los productos reales.

Tu salida DEBE ser JSON válido y nada más:
{
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

Usa null si el dato no se conoce.
budgetMax debe ser un número en COP.
Convierte 200 mil, 200k o doscientos mil en 200000.
Conserva filtros anteriores cuando el usuario no los contradiga.
Las keywords deben ser términos útiles para comparar nombre, descripción, tags o categoría.`;

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
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
      new Set(
        [
          ...(previous.keywords ?? []),
          ...(Array.isArray(f.keywords) ? f.keywords : []),
        ]
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      ),
    ).slice(0, 16),
  };
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

    if (!apiKey) {
      throw new Error("Falta configurar OPENAI_API_KEY");
    }

    const body = await req.json();
    const message = String(body?.message ?? "").trim();
    const previous: Filters =
      body?.currentFilters ?? { keywords: [] };

    const history = Array.isArray(body?.history)
      ? body.history.slice(-6)
      : [];

    if (!message) {
      throw new Error("Mensaje vacío");
    }

    const conversation = history
      .map(
        (m: Record<string, unknown>) =>
          `${m.role === "user" ? "Cliente" : "Florencio"}: ${String(
            m.text ?? "",
          ).slice(0, 450)}`,
      )
      .join("\n");

    const userPrompt = `Filtros actuales: ${JSON.stringify(
      previous,
    )}\nConversación reciente:\n${conversation}\n\nNuevo mensaje del cliente: ${message}`;

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
          max_output_tokens: 300,
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `OpenAI ${response.status}: ${detail.slice(0, 300)}`,
      );
    }

    const data = await response.json();
    const parsed = JSON.parse(
      cleanJson(String(data.output_text ?? "")),
    );

    const filters = normalizeFilters(parsed.filters, previous);
    const keywords = Array.from(
      new Set([
        ...(filters.keywords ?? []),
        ...(Array.isArray(parsed.keywords) ? parsed.keywords : []),
      ]),
    )
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 16);

    return new Response(
      JSON.stringify({
        reply: String(
          parsed.reply ??
            "Cuéntame un poco más y te ayudo a encontrar el detalle.",
        ).slice(0, 180),
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
