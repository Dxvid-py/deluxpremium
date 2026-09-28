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
  "para",
  "una",
  "uno",
  "con",
  "que",
  "quiero",
  "busco",
  "algo",
  "como",
  "del",
  "por",
  "los",
  "las",
  "un",
  "y",
  "de",
  "el",
  "en",
  "me",
  "mi",
  "mis",
  "es",
  "tengo",
  "hasta",
  "maximo",
  "máximo",
  "presupuesto",
  "pesos",
  "cop",
  "dame",
  "necesito",
  "regalo",
  "favor",
  "the",
  "for",
  "with",
  "that",
  "want",
  "need",
  "looking",
  "something",
  "my",
  "a",
  "an",
  "and",
  "of",
  "to",
  "have",
  "under",
  "maximum",
  "give",
  "please",
  "gift",
  "is",
  "it",
  "this",
]);

const COLLECTION_TERMS: Record<string, string[]> = {
  amor: [
    "amor",
    "romance",
    "romantico",
    "romantica",
    "novia",
    "novio",
    "pareja",
    "esposa",
    "esposo",
    "enamorado",
    "enamorada",
    "te amo",
    "love",
    "romantic",
  ],

  bodas: [
    "boda",
    "bodas",
    "matrimonio",
    "matrimonios",
    "evento",
    "eventos",
    "wedding",
    "bride",
    "groom",
    "novia",
    "recepcion",
    "recepción",
  ],

  condolencias: [
    "condolencia",
    "condolencias",
    "pesame",
    "pésame",
    "duelo",
    "funeral",
    "fallecimiento",
    "sympathy",
    "condolence",
    "mourning",
  ],
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  amor: [
    "amor",
    "romance",
    "romant",
  ],

  bodas: [
    "boda",
    "bodas",
    "evento",
    "eventos",
    "wedding",
  ],

  condolencias: [
    "condolencia",
    "condolencias",
    "duelo",
    "funeral",
    "sympathy",
  ],
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9$.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function parseBudget(text: string): number | undefined {
  const normalized = normalize(text).replace(/\./g, "");

  const matches = normalized.match(
    /(?:\$\s*)?(\d{2,8})(?:\s*(?:mil|k))?/g,
  );

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

/**
 * Detecta únicamente la colección que usa Florencio:
 *
 * amor
 * bodas
 * condolencias
 */
export function parseFlorencioFilters(input: string): FlorencioFilters {
  const text = normalize(input);

  const filters: FlorencioFilters = {
    keywords: [],
  };

  for (const [collection, terms] of Object.entries(COLLECTION_TERMS)) {
    if (containsAny(text, terms)) {
      filters.occasion = collection;
      break;
    }
  }

  filters.budgetMax = parseBudget(input);

  filters.keywords = text
    .split(" ")
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
    .filter((word) => !/^\d+$/.test(word))
    .slice(0, 10);

  return filters;
}

function categoryMatchesCollection(
  category: Category | undefined,
  collection?: string,
) {
  if (!collection || !category) return false;

  const categoryText = normalize(
    [
      category.name,
      category.slug,
      category.description,
    ].join(" "),
  );

  const aliases = CATEGORY_ALIASES[collection] ?? [];

  return aliases.some((alias) => categoryText.includes(normalize(alias)));
}

function productText(product: Product, category?: Category) {
  return normalize(
    [
      product.name,
      product.description,
      ...(product.tags ?? []),
      category?.name ?? "",
      category?.description ?? "",
    ].join(" "),
  );
}

function scoreProduct(
  product: Product,
  category: Category | undefined,
  filters: FlorencioFilters,
  adjustedBudget: boolean,
) {
  const text = productText(product, category);

  let score = 0;
  const reasons: string[] = [];

  if (filters.occasion && categoryMatchesCollection(category, filters.occasion)) {
    score += 100;
    reasons.push(
      filters.occasion === "amor"
        ? "pertenece a Amor & Romance"
        : filters.occasion === "bodas"
          ? "pertenece a Bodas & Eventos"
          : "pertenece a Condolencias",
    );
  }

  if (filters.budgetMax) {
    const price = Number(product.price_cop);

    if (price <= filters.budgetMax) {
      score += 50;
      reasons.push("está dentro de tu presupuesto");
    } else if (adjustedBudget) {
      score += 20;
      reasons.push("es una de las opciones más cercanas a tu presupuesto");
    }
  }

  if (product.is_featured) {
    score += 2;
  }

  return {
    score,
    reasons,
  };
}

export function rankFlorencioProducts(
  products: Product[],
  categories: Category[],
  filters: FlorencioFilters,
  limit = 4,
): FlorencioRecommendation[] {
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );

  const activeProducts = products.filter((product) => {
    if (!product.is_active) return false;

    const stock = Number(
      (product as Product & { stock_qty?: number }).stock_qty ??
        product.stock ??
        0,
    );

    if (Number.isFinite(stock) && stock <= 0) {
      return false;
    }

    return true;
  });

  /**
   * PRIMER INTENTO:
   * colección + presupuesto máximo.
   */
  const exactMatches = activeProducts.filter((product) => {
    const category = categoryById.get(product.category_id ?? "");

    if (
      filters.occasion &&
      !categoryMatchesCollection(category, filters.occasion)
    ) {
      return false;
    }

    if (
      filters.budgetMax &&
      Number(product.price_cop) > filters.budgetMax
    ) {
      return false;
    }

    return true;
  });

  if (exactMatches.length > 0) {
    return exactMatches
      .map((product) => {
        const category = categoryById.get(product.category_id ?? "");
        const result = scoreProduct(
          product,
          category,
          filters,
          false,
        );

        return {
          ...product,
          matchScore: result.score,
          matchReasons: result.reasons,
        };
      })
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }

        return Number(a.price_cop) - Number(b.price_cop);
      })
      .slice(0, limit);
  }

  /**
   * SEGUNDO INTENTO:
   *
   * No existe una opción dentro del presupuesto.
   * Mantenemos obligatoriamente la colección y buscamos
   * los productos más cercanos al presupuesto.
   */
  const fallback = activeProducts
    .filter((product) => {
      const category = categoryById.get(product.category_id ?? "");

      if (
        filters.occasion &&
        !categoryMatchesCollection(category, filters.occasion)
      ) {
        return false;
      }

      return true;
    })
    .map((product) => {
      const category = categoryById.get(product.category_id ?? "");
      const price = Number(product.price_cop);
      const budget = Number(filters.budgetMax ?? price);

      const result = scoreProduct(
        product,
        category,
        filters,
        true,
      );

      return {
        ...product,
        matchScore: result.score,
        matchReasons: result.reasons,
        distance: Math.abs(price - budget),
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      return Number(a.price_cop) - Number(b.price_cop);
    })
    .slice(0, limit);

  return fallback.map(({ distance: _distance, ...product }) => product);
}

export function describeFlorencioFilters(
  filters: FlorencioFilters,
): string[] {
  const parts: string[] = [];

  if (filters.occasion) {
    const collection =
      filters.occasion === "amor"
        ? "Amor & Romance"
        : filters.occasion === "bodas"
          ? "Bodas & Eventos"
          : filters.occasion === "condolencias"
            ? "Condolencias"
            : filters.occasion;

    parts.push(`colección: ${collection}`);
  }

  if (filters.budgetMax) {
    parts.push(
      `presupuesto máximo: $${filters.budgetMax.toLocaleString("es-CO")}`,
    );
  }

  return parts;
}
