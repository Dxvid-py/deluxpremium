import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Intent =
  | "conversation"
  | "information"
  | "discovery"
  | "recommendation";

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

const SYSTEM = `
Eres Florencio, el asistente virtual de Deluxury Floristería.

IDENTIDAD
- Hablas siempre en español.
- Eres cálido, elegante, breve y natural.
- No eres un vendedor agresivo.
- Recomiendas productos reales del catálogo de Deluxury.
- Tu función es ayudar a comprar flores, arreglos, regalos y servicios de Deluxury.

LÍMITE ABSOLUTO
SOLO puedes responder asuntos relacionados directamente con Deluxury Floristería.

NO respondas:
- matemáticas
- ecuaciones
- programación
- código
- política
- noticias
- deportes
- videojuegos
- Minecraft
- tareas
- química
- física
- historia
- recetas
- entretenimiento
- preguntas generales
- cualquier otro tema que no sea de Deluxury

Si el usuario pregunta algo fuera de Deluxury responde ÚNICAMENTE:

"Puedo ayudarte con flores, arreglos, regalos, compras y servicios de Deluxury."

No expliques el tema externo.
No resuelvas el problema.
No des ejemplos del tema externo.

RECOMENDACIONES

Para recomendar un producto SOLO necesitas dos datos:

1. COLECCIÓN
   - amor
   - bodas
   - condolencias

2. PRESUPUESTO MÁXIMO EN COP

NO necesitas:
- destinatario
- color
- estilo
- tipo de flor
- género
- edad
- relación
- palabras clave

Si ya tienes colección + presupuesto:
usa intent = recommendation.

Si falta colección o presupuesto:
usa intent = discovery.

Si falta alguno de esos dos datos, pide solamente el dato que falta.

Nunca hagas preguntas innecesarias.

COLECCIONES

"amor", "romance", "novia", "novio", "pareja", "te amo"
=> collection = amor

"boda", "bodas", "matrimonio", "evento", "eventos", "wedding"
=> collection = bodas

"condolencias", "pésame", "duelo", "funeral", "fallecimiento"
=> collection = condolencias

PRESUPUESTO

Convierte:
200 mil => 200000
800 mil => 800000
1 millón => 1000000
1.2 millones => 1200000
$800.000 => 800000

REGLA DE CATÁLOGO

La aplicación buscará los productos reales.

Si existen productos de la colección dentro del presupuesto:
recomiéndalos.

Si NO existen productos dentro del presupuesto:
la aplicación buscará los productos más cercanos de ESA MISMA colección.

En ese caso, explica brevemente que ajustaste el presupuesto porque no había una coincidencia exacta.

Nunca inventes productos.
Nunca inventes precios.
Nunca inventes stock.

TONO

Sé corto.

Normalmente responde en 1 o 2 frases.

Cuando recomiendes:
- explica brevemente por qué encajan
- no enumeres productos
- no inventes nombres de productos
- deja que la interfaz muestre las recomendaciones

SALIDA

Devuelve JSON válido y nada más:

{
  "intent": "conversation|information|discovery|recommendation",
  "reply": "respuesta breve",
  "filters": {
    "recipient": null,
    "occasion": "amor|bodas|condolencias|null",
    "style": null,
    "color": null,
    "budgetMax": number o null,
    "keywords": []
  },
  "keywords": []
}

IMPORTANTE:
occasion representa la COLECCIÓN.
Solo puede ser:
amor
bodas
condolencias

Si no conoces la colección, usa null.
`;

function cleanJson(text: string) {
  const fenced = text.match(
    /```(?:json)?\s*([\s\S]*?)\s*```/i,
  );

  return fenced?.[1]?.trim() ?? text.trim();
}

function normalizeString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function normalizeFilters(
  raw: unknown,
  previous: Filters,
): Filters {
  const f =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const num = Number(f.budgetMax);

  const occasion = normalizeString(f.occasion);

  const validCollections = new Set([
    "amor",
    "bodas",
    "condolencias",
  ]);

  const normalizedOccasion =
    occasion && validCollections.has(occasion)
      ? occasion
      : previous.occasion;

  const keywords = [
    ...(Array.isArray(previous.keywords)
      ? previous.keywords
      : []),
    ...(Array.isArray(f.keywords) ? f.keywords : []),
  ]
    .filter(
      (x): x is string =>
        typeof x === "string",
    )
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .filter(
      (x) => x !== RECOMMENDATION_MARKER,
    );

  return {
    // Los dejamos por compatibilidad con sesiones antiguas,
    // pero Florencio ya NO los usa para recomendar.
    recipient: undefined,
    occasion: normalizedOccasion,
    style: undefined,
    color: undefined,
    budgetMax:
      Number.isFinite(num) && num > 0
        ? num
        : previous.budgetMax,
    keywords: Array.from(
      new Set(keywords),
    ).slice(0, 20),
  };
}

function normalizePrevious(
  raw: unknown,
): Filters {
  const value =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const budget = Number(
    value.budgetMax,
  );

  const occasion =
    typeof value.occasion === "string" &&
    ["amor", "bodas", "condolencias"].includes(
      value.occasion,
    )
      ? value.occasion
      : undefined;

  return {
    recipient: undefined,
    occasion,
    style: undefined,
    color: undefined,
    budgetMax:
      Number.isFinite(budget) && budget > 0
        ? budget
        : undefined,
    keywords: Array.isArray(value.keywords)
      ? value.keywords
          .filter(
            (x): x is string =>
              typeof x === "string",
          )
          .map((x) =>
            x.trim().toLowerCase(),
          )
          .filter(Boolean)
          .slice(0, 20)
      : [],
  };
}

function extractResponseText(root: unknown): string {
  if (!root || typeof root !== "object") {
    return "";
  }

  const response =
    root as Record<string, unknown>;

  if (
    typeof response.output_text === "string" &&
    response.output_text.trim()
  ) {
    return response.output_text.trim();
  }

  const output = response.output;

  if (!Array.isArray(output)) {
    return "";
  }

  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record =
      item as Record<string, unknown>;

    const content = record.content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const partRecord =
        part as Record<string, unknown>;

      if (
        partRecord.type === "output_text" &&
        typeof partRecord.text === "string"
      ) {
        chunks.push(partRecord.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

async function loadKnowledge(): Promise<
  KnowledgeRow[]
> {
  const url =
    Deno.env.get("SUPABASE_URL");

  const serviceKey = Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  if (!url || !serviceKey) {
    return [];
  }

  const response = await fetch(
    `${url}/rest/v1/florencio_knowledge?select=key,value&order=key.asc`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data.filter(
        (
          row,
        ): row is KnowledgeRow =>
          !!row &&
          typeof row.key === "string" &&
          typeof row.value === "string",
      )
    : [];
}

function knowledgeText(
  rows: KnowledgeRow[],
) {
  if (!rows.length) {
    return "No hay información oficial adicional disponible.";
  }

  return rows
    .map(
      (row) =>
        `${row.key}: ${row.value}`,
    )
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );
  }

  try {
    const apiKey =
      Deno.env.get("OPENAI_API_KEY");

    const model =
      Deno.env.get("FLORENCIO_MODEL") ||
      "gpt-5-mini";

    if (!apiKey) {
      throw new Error(
        "Falta configurar OPENAI_API_KEY",
      );
    }

    const body = await req.json();

    const message = String(
      body?.message ?? "",
    ).trim();

    if (!message) {
      throw new Error(
        "Mensaje vacío",
      );
    }

    /*
     * BLOQUEO DURO ANTES DE LLAMAR A OPENAI.
     *
     * Esto significa que aunque el modelo
     * quisiera contestar matemáticas,
     * nunca llegará a recibir la pregunta.
     */
    const offTopicPatterns = [
      /\b(matem[aá]tica|matemáticas|suma|sumar|resta|restar|multiplic|divid|ecuaci[oó]n|c[aá]lcul|porcentaje|álgebra|algebra|geometr[ií]a)\b/i,

      /\b(program(ar|aci[oó]n)?|javascript|typescript|python|java|c[oó]digo|html|css|linux|react|sql)\b/i,

      /\b(presidente|elecci[oó]n|pol[ií]tica|partido pol[ií]tico)\b/i,

      /\b(f[uú]tbol|baloncesto|tenis|deporte|minecraft|videojuego)\b/i,

      /\b(tarea|examen|ensayo|qu[ií]mica|f[ií]sica|historia universal)\b/i,
    ];

    if (
      offTopicPatterns.some(
        (pattern) =>
          pattern.test(message),
      )
    ) {
      return new Response(
        JSON.stringify({
          intent: "information",
          reply:
            "Puedo ayudarte con flores, arreglos, regalos, compras y servicios de Deluxury.",
          filters: normalizePrevious(
            body?.currentFilters,
          ),
          keywords: [],
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        },
      );
    }

    const previous =
      normalizePrevious(
        body?.currentFilters,
      );

    const history =
      Array.isArray(body?.history)
        ? body.history.slice(-8)
        : [];

    const conversation = history
      .map(
        (
          m: Record<string, unknown>,
        ) =>
          `${
            m.role === "user"
              ? "Cliente"
              : "Florencio"
          }: ${String(
            m.text ?? "",
          ).slice(0, 500)}`,
      )
      .join("\n");

    const knowledge =
      await loadKnowledge();

    const userPrompt = `
INFORMACIÓN OFICIAL DE DELUXURY:

${knowledgeText(knowledge)}

FILTROS ACTUALES:

${JSON.stringify(previous)}

CONVERSACIÓN RECIENTE:

${conversation || "(sin conversación previa)"}

NUEVO MENSAJE:

${message}

REGLA DE RECOMENDACIÓN:

Para recomendar SOLO necesitas:
- colección
- presupuesto máximo

Si el cliente ya indicó ambos, usa recommendation.

Si falta colección o presupuesto, usa discovery y pide únicamente lo que falta.

No pidas destinatario.
No pidas estilo.
No pidas color.
No pidas tipo de flor.

Si el cliente menciona:
amor / romance / novia / novio / pareja
=> occasion = amor

boda / bodas / matrimonio / evento / eventos
=> occasion = bodas

condolencias / pésame / duelo / funeral
=> occasion = condolencias

Si el mensaje contiene presupuesto, conviértelo a COP.

La respuesta debe ser breve.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content: SYSTEM,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          text: {
            format: {
              type: "json_object",
            },
          },
          reasoning: {
            effort: "minimal",
          },
          max_output_tokens: 700,
        }),
      },
    );

    if (!response.ok) {
      const detail =
        await response.text();

      throw new Error(
        `OpenAI ${response.status}: ${detail.slice(
          0,
          600,
        )}`,
      );
    }

    const data =
      await response.json();

    const responseText =
      extractResponseText(data);

    if (!responseText) {
      throw new Error(
        "OpenAI no devolvió una respuesta utilizable.",
      );
    }

    let parsed:
      Record<string, unknown>;

    try {
      parsed = JSON.parse(
        cleanJson(responseText),
      ) as Record<
        string,
        unknown
      >;
    } catch {
      throw new Error(
        "OpenAI devolvió una respuesta que no pudo interpretarse como JSON.",
      );
    }

    const validIntents =
      new Set<Intent>([
        "conversation",
        "information",
        "discovery",
        "recommendation",
      ]);

    const intent: Intent =
      validIntents.has(
        parsed.intent as Intent,
      )
        ? (parsed.intent as Intent)
        : "conversation";

    const filters =
      normalizeFilters(
        parsed.filters,
        previous,
      );

    const rawKeywords = [
      ...filters.keywords,
      ...(Array.isArray(
        parsed.keywords,
      )
        ? parsed.keywords
        : []),
    ]
      .filter(
        (x): x is string =>
          typeof x === "string",
      )
      .map((x) =>
        x.trim().toLowerCase(),
      )
      .filter(Boolean)
      .filter(
        (x) =>
          x !==
          RECOMMENDATION_MARKER,
      );

    const keywords =
      Array.from(
        new Set([
          ...rawKeywords,
          ...(intent ===
          "recommendation"
            ? [
                RECOMMENDATION_MARKER,
              ]
            : []),
        ]),
      ).slice(0, 21);

    return new Response(
      JSON.stringify({
        intent,
        reply: String(
          parsed.reply ??
            "Cuéntame qué necesitas para tu compra en Deluxury.",
        ).slice(0, 500),

        filters: {
          ...filters,
          keywords,
        },

        keywords,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
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
          "Content-Type":
            "application/json",
        },
      },
    );
  }
});
