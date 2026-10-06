import type { Category, Product } from "@/lib/queries";

/**
 * Motor de recomendaciones de Florencio.
 *
 * Reglas (en este orden de importancia):
 *  1. La COLECCIÓN (categoría) es un filtro duro: si el cliente pide "amor",
 *     jamás se mezclan productos de condolencias o bodas.
 *  2. El PRESUPUESTO es un techo duro.
 *  3. El COLOR es una preferencia: los productos cuya descripción/nombre/etiquetas
 *     coinciden salen primero. Si ninguno coincide, igual se recomienda y se marca
 *     `colorMatch: false` para que la interfaz ofrezca consultar el color por WhatsApp.
 */

export type FlorencioFilters = {
  recipient?: string | undefined;
  occasion?: string | undefined;
  style?: string | undefined;
  color?: string | undefined;
  /** slug de la categoría real del catálogo (ej. "amor", "bodas") */
  collection?: string | undefined;
  budgetMax?: number | undefined;
  keywords: string[];
};

export type FlorencioRecommendation = Product & {
  matchScore: number;
  matchReasons: string[];
  /** true si hay color pedido y el producto lo menciona; false si lo pidieron y no coincide; undefined si no pidieron color */
  colorMatch?: boolean | undefined;
  requestedColor?: string | undefined;
};

export const RECOMMENDATION_MARKER = "__florencio_recommendation__";

export const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9$.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Igual que normalize pero quitando también . , $ y - (útil para comparar por palabras). */
const words = (value: string) =>
  normalize(value).replace(/[$.,-]/g, " ").replace(/\s+/g, " ").trim();

const STOPWORDS = new Set([
  "para", "una", "uno", "con", "que", "quiero", "busco", "algo", "como", "del", "por",
  "los", "las", "un", "y", "de", "el", "en", "me", "mi", "mis", "es", "tengo", "hasta",
  "maximo", "pesos", "cop", "dame", "necesito", "regalo", "favor", "the", "for",
  "with", "that", "want", "need", "looking", "something", "my", "a", "an", "and", "of", "to",
  "have", "under", "maximum", "give", "please", "gift", "is", "it", "this",
  "hola", "buenas", "buenos", "dias", "tardes", "noches", "arreglo", "arreglos", "flores",
  "ramo", "ramos", "presupuesto", "coleccion", "categoria", "millon", "millones",
]);

/* ───────────────────────── Colecciones (categorías) ───────────────────────── */

export type CollectionKey = "condolencias" | "bodas" | "cumpleanos" | "amor";

const COLLECTION_RULES: Record<CollectionKey, { terms: RegExp; catalog: RegExp }> = {
  condolencias: {
    terms:
      /\b(condolencias?|pesame|pesames|funeral(es)?|funebres?|velorio|velatorio|sepelio|exequias|duelo|luto|fallec\w*|difunt\w*|muerte|murio|murieron|falleci\w*|descanse|q\.?e\.?p\.?d|sympathy|condolence|funeral|mourning|passed away|deceased)\b/,
    catalog: /condol|fune|pesame|homenaje|luto/,
  },
  bodas: {
    terms:
      /\b(bodas?|matrimonio|casamiento|casarme|casarnos|nupcial(es)?|evento|eventos|quince|quinceanera|15 anos|bautizo|primera comunion|comunion|recepcion|ceremonia|corporativ\w*|inauguracion|decoracion|centro de mesa|centros de mesa|arco floral|wedding|weddings|event|events|bride|bridal|ramo de novia|bouquet de novia|escenografia)\b/,
    catalog: /bod|evento|matrimon|wedding|event/,
  },
  cumpleanos: {
    terms: /\b(cumple|cumpleanos|birthday|bday|feliz cumple)\b/,
    catalog: /cumple|birthday/,
  },
  amor: {
    terms:
      /\b(amor|amo|te amo|te quiero|romantic[oa]s?|romance|enamorad[oa]s?|enamorar|conquistar|pareja|novia|novio|esposa|esposo|aniversario|mesiversario|san valentin|valentine|love|romantic|girlfriend|boyfriend|wife|husband|partner|anniversary|perdon|disculpa)\b/,
    catalog: /amor|romant|love|pareja/,
  },
};

/**
 * Detecta, por orden de prioridad, a qué colecciones se refiere el texto.
 * Prioridad: condolencias > bodas/eventos > cumpleaños > amor.
 * (Una palabra de duelo o de boda es mucho más específica que "amor".)
 */
export function detectCollectionIntents(input: string): CollectionKey[] {
  const text = words(input);
  const found: CollectionKey[] = [];
  const hit = (key: CollectionKey) => COLLECTION_RULES[key].terms.test(text);

  const condolencias = hit("condolencias");
  let bodas = hit("bodas");
  const cumple = hit("cumpleanos");
  const amor = hit("amor");

  // "aniversario de bodas" es un regalo de pareja, no un evento.
  if (bodas && /\baniversario\b/.test(text) && !/\b(evento|eventos|decoracion|recepcion|ceremonia)\b/.test(text)) {
    bodas = false;
  }

  if (condolencias) found.push("condolencias");
  if (bodas) found.push("bodas");
  if (cumple) found.push("cumpleanos");
  if (amor) found.push("amor");
  return found;
}

const GENERIC_CATEGORY_WORDS = new Set(["flores", "arreglos", "ramos", "especial", "especiales", "premium", "colección", "coleccion"]);

/** Busca una categoría real del catálogo mencionada por su nombre/slug en el texto. */
function findCategoryByMention(text: string, categories: Category[]): Category | undefined {
  const haystack = ` ${words(text)} `;
  return categories.find((category) => {
    const name = words(category.name);
    const slug = words(category.slug);
    if (name.length >= 3 && haystack.includes(` ${name} `)) return true;
    if (slug.length >= 3 && haystack.includes(` ${slug} `)) return true;
    return name
      .split(" ")
      .filter((word) => word.length >= 4 && !GENERIC_CATEGORY_WORDS.has(word) && !STOPWORDS.has(word))
      .some((word) => haystack.includes(` ${word} `));
  });
}

function categoryForIntent(key: CollectionKey, categories: Category[]): Category | undefined {
  const rule = COLLECTION_RULES[key].catalog;
  return categories.find((category) => rule.test(normalize(`${category.slug} ${category.name}`)));
}

/**
 * Convierte lo que escribió el cliente en una categoría REAL del catálogo.
 * Si pidió algo de lo que no hay categoría (p. ej. cumpleaños sin esa colección)
 * se prueba con la siguiente intención; si ninguna existe devuelve undefined
 * y Florencio vuelve a preguntar la colección en lugar de adivinar.
 */
export function resolveCollection(text: string, categories: Category[]): Category | undefined {
  const active = categories.filter((c) => c.is_active !== false);
  if (!active.length) return undefined;
  const intents = detectCollectionIntents(text);
  // Una intención específica gana a una mención suelta del nombre.
  for (const key of intents) {
    const found = categoryForIntent(key, active);
    if (found) return found;
  }
  return findCategoryByMention(text, active);
}

export function categoryBySlug(slug: string | undefined, categories: Category[]) {
  if (!slug) return undefined;
  return categories.find((c) => c.slug === slug || c.id === slug);
}

/* ───────────────────────────── Colores ───────────────────────────── */

type ColorDef = { key: string; label: string; labelEn: string; terms: RegExp };

export const COLORS: ColorDef[] = [
  { key: "rojo", label: "rojo", labelEn: "red", terms: /\b(rojo|roja|rojos|rojas|red|carmesi|escarlata|burdeos|burgundy)\b/ },
  // "rosa" a secas son las flores; solo cuenta como color si dicen "color/tono/en rosa".
  { key: "rosado", label: "rosado", labelEn: "pink", terms: /\b(rosado|rosada|rosados|rosadas|pink|blush|fucsia|(color|tono|tonos|en|de) rosa)\b/ },
  { key: "blanco", label: "blanco", labelEn: "white", terms: /\b(blanco|blanca|blancos|blancas|white|marfil|ivory)\b/ },
  { key: "amarillo", label: "amarillo", labelEn: "yellow", terms: /\b(amarillo|amarilla|amarillos|amarillas|yellow)\b/ },
  { key: "azul", label: "azul", labelEn: "blue", terms: /\b(azul|azules|blue)\b/ },
  { key: "morado", label: "morado", labelEn: "purple", terms: /\b(morado|morada|morados|moradas|purple|violeta|violet|lila|lavanda|purpura)\b/ },
  { key: "naranja", label: "naranja", labelEn: "orange", terms: /\b(naranja|naranjas|anaranjado|anaranjada|orange)\b/ },
  { key: "verde", label: "verde", labelEn: "green", terms: /\b(verde|verdes|green)\b/ },
  { key: "negro", label: "negro", labelEn: "black", terms: /\b(negro|negra|negros|negras|black)\b/ },
];

const ANY_COLOR = /\b(cualquier color|no importa (el )?color|sin importar (el )?color|me da igual (el )?color|any colou?r|colou?r doesn t matter)\b/;

export function colorLabel(key: string | undefined, lang: "es" | "en" = "es") {
  const def = COLORS.find((c) => c.key === key);
  if (!def) return key ?? "";
  return lang === "en" ? def.labelEn : def.label;
}

export function isKnownColor(key: string | undefined): key is string {
  return !!key && COLORS.some((c) => c.key === key);
}

export function detectColor(input: string): string | undefined {
  const text = words(input);
  if (ANY_COLOR.test(text)) return undefined;
  let best: { key: string; index: number } | undefined;
  for (const color of COLORS) {
    const match = color.terms.exec(text);
    if (match && (!best || match.index < best.index)) best = { key: color.key, index: match.index };
  }
  return best?.key;
}

export function saidAnyColor(input: string) {
  return ANY_COLOR.test(words(input));
}

/** ¿El nombre, la descripción o las etiquetas del producto mencionan ese color? */
export function productMatchesColor(product: Product, colorKey: string): boolean {
  const def = COLORS.find((c) => c.key === colorKey);
  if (!def) return false;
  const text = words([product.name, product.description, ...(product.tags ?? [])].join(" "));
  return def.terms.test(text);
}

/* ───────────────────────────── Presupuesto ───────────────────────────── */

export function parseBudget(input: string): number | undefined {
  const text = normalize(input);
  const values: number[] = [];

  // "2 millones", "1,5 millones", "8 millones y medio"
  for (const match of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:millones|millon|mm|m)\b(\s*y\s*medio)?/g)) {
    const base = Number(match[1]!.replace(",", "."));
    if (Number.isFinite(base)) values.push(Math.round((base + (match[2] ? 0.5 : 0)) * 1_000_000));
  }

  // "200 mil", "200k", "$200.000", "200000"
  const plain = text.replace(/(\d)[.,](?=\d{3}\b)/g, "$1");
  for (const match of plain.matchAll(/(\d{1,9})(?:\s*(mil|k)\b)?/g)) {
    const digits = Number(match[1]);
    if (!Number.isFinite(digits)) continue;
    values.push(match[2] && digits < 1000 ? digits * 1000 : digits);
  }

  const valid = values.filter((value) => value >= 50_000 && value <= 200_000_000);
  return valid.length ? Math.max(...valid) : undefined;
}

/* ───────────────────────────── Otros filtros ───────────────────────────── */

const RECIPIENT_TERMS: Record<string, RegExp> = {
  pareja: /\b(novia|novio|pareja|esposa|esposo|girlfriend|boyfriend|partner|wife|husband)\b/,
  mama: /\b(mama|madre|mami|mom|mother|mum)\b/,
  papa: /\b(papa|padre|papi|dad|father)\b/,
  amiga: /\b(amiga|amigo|friend|best friend)\b/,
  familiar: /\b(familia|familiar|hermana|hermano|abuela|abuelo|sister|brother|family|grandma|grandmother|grandpa|grandfather)\b/,
};

const OCCASION_TERMS: Record<string, RegExp> = {
  aniversario: /\b(aniversario|mesiversario|anniversary|monthsary)\b/,
  cumpleanos: /\b(cumpleanos|cumple|birthday|bday)\b/,
  amor: /\b(amor|romantico|romantica|te amo|enamorado|enamorada|love|romantic|i love you)\b/,
  agradecimiento: /\b(gracias|agradecimiento|agradecer|thank you|thanks|gratitude)\b/,
  condolencias: /\b(condolencia|condolencias|pesame|duelo|sympathy|condolence|mourning)\b/,
  celebracion: /\b(celebracion|celebrar|felicitaciones|felicitacion|celebration|congratulations|congrats)\b/,
  boda: /\b(boda|bodas|wedding|bride|groom)\b/,
  graduacion: /\b(graduacion|graduado|graduada|graduation|graduate)\b/,
};

const STYLE_TERMS: Record<string, RegExp> = {
  romantico: /\b(romantico|romantica|pasional|romantic|passionate)\b/,
  elegante: /\b(elegante|sofisticado|lujo|premium|sobrio|fino|elegant|sophisticated|luxury|refined)\b/,
  delicado: /\b(delicado|delicada|suave|pastel|delicate|soft)\b/,
  abundante: /\b(grande|abundante|impactante|llamativo|espectacular|grand|abundant|statement|spectacular)\b/,
  minimalista: /\b(minimalista|simple|sencillo|discreto|minimalist|subtle|discreet)\b/,
};

export function parseFlorencioFilters(input: string, categories: Category[] = []): FlorencioFilters {
  const text = words(input);
  const filters: FlorencioFilters = { keywords: [] };

  for (const [key, rule] of Object.entries(RECIPIENT_TERMS)) if (rule.test(text)) filters.recipient = key;
  for (const [key, rule] of Object.entries(OCCASION_TERMS)) if (rule.test(text)) filters.occasion = key;
  for (const [key, rule] of Object.entries(STYLE_TERMS)) if (rule.test(text)) filters.style = key;

  filters.color = detectColor(input);
  filters.budgetMax = parseBudget(input);
  filters.collection = resolveCollection(input, categories)?.slug;

  const colorWords = new Set(COLORS.flatMap((c) => c.terms.source.match(/[a-z]{4,}/g) ?? []));
  filters.keywords = text
    .split(" ")
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word) && !STOPWORDS.has(word) && !colorWords.has(word))
    .slice(0, 12);
  return filters;
}

/* ───────────────────────────── Ranking ───────────────────────────── */

function productText(product: Product, category?: Category) {
  return words([product.name, product.description, ...(product.tags ?? []), category?.name ?? ""].join(" "));
}

export function rankFlorencioProducts(
  products: Product[],
  categories: Category[],
  filters: FlorencioFilters,
  limit = 3,
): FlorencioRecommendation[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const collection = categoryBySlug(filters.collection, categories);
  const colorKey = isKnownColor(filters.color) ? filters.color : undefined;

  const eligible = products.filter((product) => {
    if (!product.is_active) return false;
    // Solo descartamos por stock si la columna existe y vale 0 o menos.
    const rawStock = (product as { stock_qty?: number | null }).stock_qty;
    if (typeof rawStock === "number" && rawStock <= 0) return false;
    // Presupuesto: techo duro.
    if (filters.budgetMax && Number(product.price_cop) > filters.budgetMax) return false;
    // Colección: filtro duro. Si pidieron una colección, nada de otras.
    if (filters.collection) {
      if (!collection) return false;
      if (product.category_id !== collection.id) return false;
    }
    return true;
  });

  const keywords = (filters.keywords ?? [])
    .map((k) => words(k))
    .filter((k) => k.length >= 4 && k !== words(RECOMMENDATION_MARKER) && !STOPWORDS.has(k));

  return eligible
    .map((product) => {
      const category = categoryById.get(product.category_id ?? "");
      const text = productText(product, category);
      const reasons: string[] = [];
      let score = 0;

      if (collection) reasons.push(`Colección ${collection.name}`);
      if (filters.budgetMax) reasons.push("Dentro de tu presupuesto");

      let colorMatch: boolean | undefined;
      if (colorKey) {
        colorMatch = productMatchesColor(product, colorKey);
        if (colorMatch) {
          score += 40;
          reasons.unshift(`Disponible en color ${colorLabel(colorKey)}`);
        }
      }

      const occasionRule = filters.occasion ? OCCASION_TERMS[filters.occasion] : undefined;
      if (occasionRule?.test(text)) score += 12;
      const styleRule = filters.style ? STYLE_TERMS[filters.style] : undefined;
      if (styleRule?.test(text)) score += 10;
      const recipientRule = filters.recipient ? RECIPIENT_TERMS[filters.recipient] : undefined;
      if (recipientRule?.test(text)) score += 8;

      const hits = keywords.filter((keyword) => text.includes(keyword));
      if (hits.length) score += Math.min(15, hits.length * 4);
      if (product.is_featured) score += 2;

      return {
        ...product,
        matchScore: score,
        matchReasons: reasons,
        colorMatch,
        requestedColor: colorKey,
      } satisfies FlorencioRecommendation;
    })
    .sort((a, b) => b.matchScore - a.matchScore || Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order)
    .slice(0, limit);
}

export function describeFlorencioFilters(filters: FlorencioFilters): string[] {
  const parts: string[] = [];
  if (filters.collection) parts.push(`colección: ${filters.collection}`);
  if (filters.recipient) parts.push(`destinatario: ${filters.recipient}`);
  if (filters.occasion) parts.push(`ocasión: ${filters.occasion}`);
  if (filters.style) parts.push(`estilo: ${filters.style}`);
  if (filters.color) parts.push(`color: ${filters.color}`);
  if (filters.budgetMax) parts.push(`presupuesto máximo: $${filters.budgetMax.toLocaleString("es-CO")}`);
  return parts;
}
