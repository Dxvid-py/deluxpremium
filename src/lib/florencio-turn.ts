import type { Category, Product } from "@/lib/queries";
import type { FlorencioAIResult } from "@/lib/florencio-ai";
import { formatMoney } from "@/lib/format";
import {
  categoryBySlug,
  isKnownColor,
  parseFlorencioFilters,
  rankFlorencioProducts,
  RECOMMENDATION_MARKER,
  resolveCollection,
  saidAnyColor,
  normalize,
  type FlorencioFilters,
  type FlorencioRecommendation,
} from "@/lib/florencio-recommendations";
import {
  askMissingReply,
  isGreetingOnly,
  isQuoteCategory,
  noResultsReply,
  recommendationReply,
  timeGreeting,
} from "@/lib/florencio-support";

type Lang = "es" | "en";

export type TurnAction = { label: string; whatsappMessage: string };

export type TurnPlan = {
  merged: FlorencioFilters;
  replyText: string;
  action?: TurnAction;
  recommendations: FlorencioRecommendation[];
  shouldRecommend: boolean;
  /** Florencio está pidiendo un dato que falta (colección o presupuesto). */
  asking: boolean;
};

export const isShoppingText = (text: string) =>
  /\b(regalo|regalar|ramo|arreglo|flores?|rosas?|orquide\w*|caja|sorprender|comprar|busco|quiero|necesito|presupuesto|cotiz\w*|recomiend\w*|sugier\w*|ideas?|gift|bouquet|flowers?|buy|looking|need|want)\b/.test(normalize(text));

/**
 * Decide qué hace Florencio con un mensaje. Es el mismo cerebro para el chat de la
 * página /florencio y para el chat flotante, así ambos se comportan igual:
 *  - saludo cordial según la hora,
 *  - pide SOLO lo que falta (colección y presupuesto),
 *  - recomienda dentro de la colección pedida y del presupuesto,
 *  - prioriza el color pedido y avisa cuando ninguno lo menciona.
 * La IA (si responde) solo aporta comprensión; si falla, esto sigue funcionando.
 */
export function planFlorencioTurn(a: {
  text: string;
  lang: Lang;
  firstContact: boolean;
  filters: FlorencioFilters;
  categories: Category[];
  products: Product[];
  settings?: Record<string, string> | null | undefined;
  ai: FlorencioAIResult | null;
  limit?: number;
}): TurnPlan {
  const { text, lang, firstContact, filters, products, settings, ai, limit = 4 } = a;
  const categories = a.categories.filter((c) => c.is_active !== false);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);

  const local = parseFlorencioFilters(text, categories);
  const greetingOnly = isGreetingOnly(text);

  // Colección: lo que dice el cliente ahora > un cambio de ocasión entendido por la IA > lo ya guardado.
  const aiOccasion = ai?.filters.occasion;
  const aiCollection = aiOccasion ? resolveCollection(aiOccasion, categories) : undefined;
  const aiChangedOccasion = Boolean(aiOccasion && aiOccasion !== filters.occasion);
  const collection =
    resolveCollection(text, categories) ??
    (aiChangedOccasion ? aiCollection : undefined) ??
    categoryBySlug(filters.collection, categories) ??
    aiCollection;
  const collectionChanged = Boolean(collection && collection.slug !== filters.collection);

  const aiColor = isKnownColor(ai?.filters.color) ? ai?.filters.color : undefined;
  const color = saidAnyColor(text) ? undefined : local.color ?? aiColor ?? (collectionChanged ? undefined : filters.color);

  const merged: FlorencioFilters = {
    recipient: ai?.filters.recipient ?? local.recipient ?? filters.recipient,
    occasion: ai?.filters.occasion ?? local.occasion ?? filters.occasion,
    style: ai?.filters.style ?? local.style ?? filters.style,
    color,
    collection: collection?.slug,
    budgetMax: local.budgetMax ?? ai?.filters.budgetMax ?? filters.budgetMax,
    keywords: Array.from(
      new Set([...(filters.keywords ?? []), ...(local.keywords ?? []), ...(ai?.keywords ?? []), ...(ai?.filters.keywords ?? [])]),
    )
      .filter((k) => k !== RECOMMENDATION_MARKER)
      .slice(0, 20),
  };

  const needCollection = !collection;
  const needBudget = !merged.budgetMax;
  const collectionNames = categories.map((c) => c.name);
  const budgetText = merged.budgetMax ? formatMoney(merged.budgetMax, "COP", trm) : undefined;
  const intent = ai?.intent;
  const shopping =
    Boolean(collection) || Boolean(merged.budgetMax) || isShoppingText(text) || intent === "discovery" || intent === "recommendation";
  const smallTalk = Boolean(ai) && (intent === "conversation" || intent === "information") && !collection && !merged.budgetMax;

  const plan: TurnPlan = { merged, replyText: "", recommendations: [], shouldRecommend: false, asking: false };

  if (greetingOnly) {
    plan.asking = needCollection || needBudget;
    plan.replyText = plan.asking
      ? askMissingReply({ lang, needCollection, needBudget, collectionNames, first: true, gotCollection: collection?.name })
      : `${timeGreeting(lang)}! ${lang === "en" ? "How else can I help you?" : "¿En qué más puedo ayudarte?"}`;
    return plan;
  }
  if (smallTalk && ai) {
    plan.replyText = ai.reply;
    return plan;
  }
  if (!shopping) {
    plan.asking = true;
    plan.replyText =
      ai?.reply ?? askMissingReply({ lang, needCollection: true, needBudget: true, collectionNames, first: firstContact });
    return plan;
  }
  if (needCollection || needBudget) {
    plan.asking = true;
    plan.replyText = askMissingReply({ lang, needCollection, needBudget, collectionNames, first: firstContact, gotCollection: collection?.name });
    return plan;
  }

  // Colección + presupuesto completos → recomendar, estrictamente dentro de la colección.
  plan.shouldRecommend = true;
  plan.recommendations = rankFlorencioProducts(products, categories, merged, limit);
  const quoteOnly = isQuoteCategory(collection, settings);
  if (plan.recommendations.length) {
    plan.replyText = recommendationReply({
      lang,
      collectionName: collection!.name,
      budgetText,
      color: merged.color,
      colorMatches: plan.recommendations.filter((r) => r.colorMatch).length,
      total: plan.recommendations.length,
      quoteOnly,
    });
  } else {
    plan.replyText = noResultsReply({ lang, collectionName: collection!.name, budgetText, quoteOnly });
    plan.action = {
      label: lang === "en" ? "Talk to an advisor" : "Hablar con un asesor",
      whatsappMessage:
        lang === "en"
          ? `Hello, Deluxury! I'm looking for something from the ${collection!.name} collection${budgetText ? ` with a maximum budget of ${budgetText}` : ""}. Could you advise me?`
          : `Hola, Deluxury. Busco algo de la colección ${collection!.name}${budgetText ? ` con un presupuesto máximo de ${budgetText}` : ""}. ¿Me pueden asesorar?`,
    };
  }
  return plan;
}
