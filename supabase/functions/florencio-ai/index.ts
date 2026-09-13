import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const SYSTEM = `Eres Florencio, el asistente virtual de Deluxury, una floristería premium colombiana.
Hablas en español, con tono cálido, elegante, breve y natural. Tu trabajo es entender qué regalo busca el cliente.
NO inventes productos, precios, stock, envíos ni políticas. El catálogo real se consulta después de tu respuesta.
Tu salida DEBE ser JSON válido y nada más, con esta forma:
{
  "reply": "respuesta breve para el cliente",
  "filters": {
    "recipient": "pareja|mama|papa|amiga|amigo|familia|cumpleanos|otro o null",
    "occasion": "cumpleanos|aniversario|amor|dia_de_la_madre|dia_del_padre|graduacion|boda|condolencias|otro o null",
    "style": "romantico|elegante|minimalista|lujoso|alegre|clasico|otro o null",
    "color": "rojo|rosado|blanco|amarillo|azul|morado|mixto|otro o null",
    "budgetMax": number o null,
    "keywords": ["palabras", "clave"]
  },
  "keywords": ["palabras", "clave"]
}
Usa null si el dato no se conoce. budgetMax debe ser un número en COP.
Si el usuario dice cantidades como 200 mil, 200k, doscientos mil, conviértelas a 200000.
No fuerces categorías si el mensaje no lo permite. Conserva filtros anteriores cuando el usuario no los contradiga.
Las keywords deben ser términos útiles para buscar coincidencias en nombre, descripción, tags o categoría.`;

function cleanJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1]?.trim() ?? text.trim();
}

function normalizeFilters(raw: any, previous: Filters): Filters {
  const f = raw && typeof raw === "object" ? raw : {};
  const num = Number(f.budgetMax);
  return {
    recipient: f.recipient || previous.recipient,
    occasion: f.occasion || previous.occasion,
    style: f.style || previous.style,
    color: f.color || previous.color,
    budgetMax: Number.isFinite(num) && num > 0 ? num : previous.budgetMax,
    keywords: Array.from(new Set([
      ...(previous.keywords ?? []),
      ...(Array.isArray(f.keywords) ? f.keywords : []),
    ].filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().toLowerCase()))).slice(0, 16),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("FLORENCIO_MODEL") || "gpt-5-mini";
    if (!apiKey) throw new Error("Falta configurar OPENAI_API_KEY en Supabase Secrets");

    const body = await req.json();
    const message = String(body?.message ?? "").trim();
    const previous: Filters = body?.currentFilters ?? { keywords: [] };
    const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
    if (!message) throw new Error("Mensaje vacío");

    const conversation = history.map((m: any) => `${m.role === "user" ? "Cliente" : "Florencio"}: ${String(m.text).slice(0, 700)}`).join("\n");
    const userPrompt = `Filtros actuales: ${JSON.stringify(previous)}\nConversación reciente:\n${conversation}\n\nNuevo mensaje del cliente: ${message}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: SYSTEM }] },
          { role: "user", content: [{ type: "input_text", text: userPrompt }] },
        ],
        text: { format: { type: "json_object" } },
        max_output_tokens: 500,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json();
    const outputText = String(data.output_text ?? "").trim();
    const parsed = JSON.parse(cleanJson(outputText));
    const filters = normalizeFilters(parsed.filters, previous);
    const keywords = Array.from(new Set([...(filters.keywords ?? []), ...(Array.isArray(parsed.keywords) ? parsed.keywords : [])].filter((x) => typeof x === "string"))).slice(0, 16);

    return new Response(JSON.stringify({
      reply: String(parsed.reply ?? "Claro. Déjame ayudarte a encontrar algo especial. ✨"),
      filters: { ...filters, keywords },
      keywords,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
