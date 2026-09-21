import type { Category, Product } from "@/lib/queries";

export type FlorencioFilters = {
  recipient?: string;
  occasion?: string;
  style?: string;
  color?: string;
  budgetMax?: number;
  keywords: string[];
};

export type FlorencioRecommendation = Product & {
  matchScore: number;
  matchReasons: string[];
};

export const RECOMMENDATION_MARKER = "__florencio_recommendation__";

const STOPWORDS = new Set([
  "para", "una", "uno", "con", "que", "quiero", "busco", "algo", "como", "del", "por",
  "los", "las", "un", "y", "de", "el", "en", "me", "mi", "mis", "es", "tengo", "hasta",
  "maximo", "máximo", "pesos", "cop", "dame", "necesito", "regalo", "favor", "the", "for",
  "with", "that", "want", "need", "looking", "something", "my", "a", "an", "and", "of", "to",
  "have", "under", "maximum", "give", "please", "gift", "is", "it", "this", "that",
]);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9$.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const RECIPIENT_TERMS: Record<string, string[]> = {
  pareja: ["novia", "novio", "pareja", "esposa", "esposo", "girlfriend", "boyfriend", "partner", "wife", "husband"],
  mama: ["mama", "madre", "mami", "mom", "mother", "mum"],
  papa: ["papa", "padre", "papi", "dad", "father"],
  amiga: ["amiga", "amigo", "friend", "best friend"],
  familiar: ["familia", "familiar", "hermana", "hermano", "abuela", "abuelo", "sister", "brother", "family", "grandma", "grandmother", "grandpa", "grandfather"],
};

const OCCASION_TERMS: Record<string, string[]> = {
  aniversario: ["aniversario", "mesiversario", "anniversary", "monthsary"],
  cumpleanos: ["cumpleanos", "cumple", "birthday", "bday"],
  amor: ["amor", "romantico", "romantica", "te amo", "enamorado", "enamorada", "love", "romantic", "i love you"],
  agradecimiento: ["gracias", "agradecimiento", "agradecer", "thank you", "thanks", "gratitude"],
  condolencias: ["condolencia", "condolencias", "pesame", "duelo", "sympathy", "condolence", "mourning"],
  celebracion: ["celebracion", "celebrar", "felicitaciones", "felicitacion", "celebration", "congratulations", "congrats"],
  boda: ["boda", "boda", "wedding", "bride", "groom"],
  graduacion: ["graduacion", "graduado", "graduada", "graduation", "graduate"],
};

const STYLE_TERMS: Record<string, string[]> = {
  romantico: ["romantico", "romantica", "amor", "rosas rojas", "rojo", "pasional", "romantic", "passionate", "red roses"],
  elegante: ["elegante", "sofisticado", "lujo", "premium", "sobrio", "fino", "elegant", "sophisticated", "luxury", "refined"],
  delicado: ["delicado", "delicada", "suave", "pastel", "rosa", "rosado", "delicate", "soft", "pastel", "blush", "pink"],
  abundante: ["grande", "abundante", "impactante", "llamativo", "espectacular", "grand", "abundant", "statement", "spectacular"],
  minimalista: ["minimalista", "simple", "sencillo", "discreto", "minimalist", "simple", "subtle", "discreet"],
};

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function parseBudget(text: string): number | undefined {
  const normalized = normalize(text).replace(/\./g, "");
  const matches = normalized.match(/(?:\$\s*)?(\d{2,8})(?:\s*(?:mil|k))?/g);
  if (!matches) return undefined;
  const values = matches
    .map((raw) => {
      const mil = /mil|k/.test(raw);
      const digits = Number(raw.replace(/[^0-9]/g, ""));
      if (!Number.isFinite(digits)) return NaN;
      return mil && digits < 1000 ? digits * 1000 : digits;
    })
    .filter((value) => value >= 50000 && value <= 10000000);
  return values.length ? Math.max(...values) : undefined;
}

export function parseFlorencioFilters(input: string): FlorencioFilters {
  const text = normalize(input);
  const filters: FlorencioFilters = { keywords: [] };

  for (const [key, terms] of Object.entries(RECIPIENT_TERMS)) {
    if (containsAny(text, terms)) filters.recipient = key;
  }
  for (const [key, terms] of Object.entries(OCCASION_TERMS)) {
    if (containsAny(text, terms)) filters.occasion = key;
  }
  for (const [key, terms] of Object.entries(STYLE_TERMS)) {
    if (containsAny(text, terms)) filters.style = key;
  }

  const colors = [
    ["rojo", ["rojo", "roja", "red"]],
    ["rosado", ["rosa", "rosado", "rosada", "pink", "blush"]],
    ["blanco", ["blanco", "blanca", "white"]],
    ["amarillo", ["amarillo", "amarilla", "yellow"]],
    ["azul", ["azul", "blue"]],
    ["morado", ["morado", "morada", "purple", "violet"]],
  ] as const;
  const foundColor = colors.find(([, terms]) => containsAny(text, terms));
  if (foundColor) filters.color = foundColor[0];

  filters.budgetMax = parseBudget(input);
  filters.keywords = text
    .split(" ")
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
    .slice(0, 12);
  return filters;
}

function productText(product: Product, category?: Category) {
  return normalize([
    product.name,
    product.description,
    ...(product.tags ?? []),
    category?.name ?? "",
    category?.description ?? "",
  ].join(" "));
}

function scoreProduct(product: Product, category: Category | undefined, filters: FlorencioFilters) {
  const text = productText(product, category);
  let score = 0;
  const reasons: string[] = [];
  if (filters.recipient) score += 1;
  if (filters.occasion) score += 1;

  if (filters.occasion && containsAny(text, OCCASION_TERMS[filters.occasion] ?? [])) {
    score += 30;
    reasons.push("encaja con la ocasión");
  }
  if (filters.recipient && containsAny(text, RECIPIENT_TERMS[filters.recipient] ?? [])) {
    score += 20;
    reasons.push("encaja con el destinatario");
  }
  if (filters.style && containsAny(text, STYLE_TERMS[filters.style] ?? [])) {
    score += 22;
    reasons.push("coincide con el estilo");
  }
  if (filters.color && text.includes(normalize(filters.color))) {
    score += 18;
    reasons.push("coincide con el color");
  }
  const keywordHits = filters.keywords.filter((keyword) => keyword.length >= 4 && text.includes(normalize(keyword)));
  if (keywordHits.length) {
    score += Math.min(25, keywordHits.length * 5);
    reasons.push("comparte detalles de tu búsqueda");
  }
  if (product.is_featured) score += 2;
  return { score, reasons };
}

export function rankFlorencioProducts(
  products: Product[],
  categories: Category[],
  filters: FlorencioFilters,
  limit = 3,
): FlorencioRecommendation[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  // Hard rule: a budget is a ceiling, never a soft ranking preference.
  const eligible = products.filter((product) => {
    if (!product.is_active) return false;
    const stock = Number(product.stock_qty ?? 0);
    if (Number.isFinite(stock) && stock <= 0) return false;
    if (filters.budgetMax && Number(product.price_cop) > filters.budgetMax) return false;
    return true;
  });

  return eligible
    .map((product) => {
      const category = categoryById.get(product.category_id ?? "");
      const result = scoreProduct(product, category, filters);
      return {
        ...product,
        matchScore: result.score,
        matchReasons: result.reasons,
      };
    })
    .filter((product) => {
      const hasIntentSignal = Boolean(filters.recipient || filters.occasion || filters.style || filters.color || filters.budgetMax || filters.keywords.length);
      return !hasIntentSignal || product.matchScore > 0;
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export function describeFlorencioFilters(filters: FlorencioFilters): string[] {
  const parts: string[] = [];
  if (filters.recipient) parts.push(`destinatario: ${filters.recipient}`);
  if (filters.occasion) parts.push(`ocasión: ${filters.occasion}`);
  if (filters.style) parts.push(`estilo: ${filters.style}`);
  if (filters.color) parts.push(`color: ${filters.color}`);
  if (filters.budgetMax) parts.push(`presupuesto máximo: $${filters.budgetMax.toLocaleString("es-CO")}`);
  return parts;
}
