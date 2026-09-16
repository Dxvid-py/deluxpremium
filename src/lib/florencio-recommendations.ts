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

const RECOMMENDATION_MARKER = "__florencio_recommendation__";

const STOPWORDS = new Set([
  "para", "una", "uno", "con", "que", "quiero", "busco", "algo", "como", "del", "por",
  "los", "las", "un", "una", "y", "de", "el", "en", "me", "mi", "mis", "es", "tengo",
  "hasta", "máximo", "maximo", "pesos", "cop", "dame", "necesito", "regalo", "favor",
]);

const NORMALIZE = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9$.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const RECIPIENT_TERMS: Record<string, string[]> = {
  pareja: ["novia", "novio", "pareja", "esposa", "esposo", "amor", "mi amor"],
  mama: ["mama", "madre", "mami"],
  papa: ["papa", "padre", "papi"],
  amiga: ["amiga", "amigo", "amistad"],
  familiar: ["familia", "familiar", "hermana", "hermano", "abuela", "abuelo"],
};

const OCCASION_TERMS: Record<string, string[]> = {
  aniversario: ["aniversario", "aniversario de pareja", "cumplimos un ano", "mesiversario"],
  cumpleanos: ["cumpleanos", "cumple", "birthday"],
  amor: ["amor", "romantico", "romantica", "te amo", "enamorado", "enamorada"],
  agradecimiento: ["gracias", "agradecimiento", "agradecer"],
  condolencias: ["condolencia", "condolencias", "pesame", "duelo"],
  celebracion: ["celebracion", "celebrar", "felicitaciones", "felicitacion"],
};

const STYLE_TERMS: Record<string, string[]> = {
  romantico: ["romantico", "romantica", "amor", "rosas rojas", "rojo", "pasional"],
  elegante: ["elegante", "sofisticado", "lujo", "premium", "sobrio", "fino"],
  delicado: ["delicado", "delicada", "suave", "pastel", "rosa", "rosado"],
  abundante: ["grande", "abundante", "impactante", "llamativo", "espectacular"],
  minimalista: ["minimalista", "simple", "sencillo", "discreto"],
};

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(NORMALIZE(term)));
}

function parseBudget(text: string): number | undefined {
  const normalized = NORMALIZE(text).replace(/\./g, "");
  const matches = normalized.match(/(?:\$\s*)?(\d{2,7})(?:\s*(?:mil|k))?/g);
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
  const text = NORMALIZE(input);
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

  const colors = ["rojo", "roja", "rosa", "blanco", "blanca", "amarillo", "amarilla", "morado", "morado", "pastel"];
  filters.color = colors.find((color) => text.includes(color));
  filters.budgetMax = parseBudget(input);

  filters.keywords = text
    .split(" ")
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
    .slice(0, 10);

  return filters;
}

function productText(product: Product, category?: Category) {
  return NORMALIZE([
    product.name,
    product.description,
    ...(product.tags ?? []),
    category?.name ?? "",
    category?.description ?? "",
  ].join(" "));
}

export function rankFlorencioProducts(
  products: Product[],
  categories: Category[],
  filters: FlorencioFilters,
  limit = 3,
): FlorencioRecommendation[] {
  // Seguridad principal: si Florencio todavía está conversando o descubriendo
  // necesidades, NO se muestran productos.
  if (!filters.keywords.includes(RECOMMENDATION_MARKER)) return [];

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return products
    .filter((product) => product.is_active && Number(product.stock) !== 0)
    // El presupuesto es un límite duro, no una penalización.
    .filter((product) => {
      if (!filters.budgetMax) return true;
      return Number(product.price_cop) <= filters.budgetMax;
    })
    .map((product) => {
      const category = product.category_id
        ? categoryMap.get(product.category_id)
        : undefined;

      const text = productText(product, category);
      let score = Number(product.is_featured) * 4;
      const reasons: string[] = [];

      if (filters.budgetMax) {
        score += 25;
        reasons.push("entra en tu presupuesto");
      }

      const groups: Array<
        [string | undefined, Record<string, string[]> | undefined, number, string]
      > = [
        [filters.recipient, RECIPIENT_TERMS, 24, "encaja con el destinatario"],
        [filters.occasion, OCCASION_TERMS, 30, "encaja con la ocasión"],
        [filters.style, STYLE_TERMS, 22, "coincide con el estilo"],
      ];

      for (const [selected, dictionary, points, reason] of groups) {
        if (!selected || !dictionary) continue;
        const terms = dictionary[selected] ?? [];
        if (containsAny(text, terms)) {
          score += points;
          reasons.push(reason);
        }
      }

      if (filters.color && text.includes(NORMALIZE(filters.color))) {
        score += 14;
        reasons.push(`tiene tonos ${filters.color}`);
      }

      const keywordMatches = filters.keywords
        .filter((keyword) => keyword !== RECOMMENDATION_MARKER)
        .filter((keyword) => text.includes(keyword));

      score += Math.min(20, keywordMatches.length * 4);

      if (keywordMatches.length) {
        reasons.push("comparte detalles que mencionaste");
      }

      return {
        ...product,
        matchScore: Math.max(0, score),
        matchReasons: reasons.slice(0, 3),
      };
    })
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        Number(b.is_featured) - Number(a.is_featured),
    )
    .slice(0, limit);
}

export function describeFlorencioFilters(filters: FlorencioFilters) {
  const parts: string[] = [];
  if (filters.recipient) {
    parts.push(filters.recipient === "pareja" ? "pareja" : filters.recipient);
  }
  if (filters.occasion) parts.push(filters.occasion);
  if (filters.style) parts.push(filters.style);
  if (filters.color) parts.push(`tonos ${filters.color}`);
  if (filters.budgetMax) {
    parts.push(`hasta $${filters.budgetMax.toLocaleString("es-CO")}`);
  }
  return parts;
}

export function florencioCanRecommend(filters: FlorencioFilters) {
  return filters.keywords.includes(RECOMMENDATION_MARKER);
}

export function markFlorencioRecommendation(filters: FlorencioFilters): FlorencioFilters {
  return {
    ...filters,
    keywords: Array.from(
      new Set([...(filters.keywords ?? []), RECOMMENDATION_MARKER]),
    ),
  };
}
