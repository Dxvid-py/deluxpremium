import type { Category, Product } from "@/lib/queries";
import { normalize, colorLabel } from "@/lib/florencio-recommendations";

type Lang = "es" | "en";

export const DEFAULT_WHATSAPP = "573006301123";

/* ───────────────────────── Saludo según la hora (Colombia) ───────────────────────── */

export function bogotaHour(date = new Date()): number {
  try {
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }).format(date);
    return Number(hour) % 24;
  } catch {
    return date.getHours();
  }
}

export function timeGreeting(lang: Lang = "es", date = new Date()): string {
  const hour = bogotaHour(date);
  if (lang === "en") return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
}

/** ¿El mensaje es solo un saludo / cortesía, sin pedir nada? */
export function isGreetingOnly(text: string): boolean {
  const t = normalize(text).replace(/[.,$-]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.length > 40) return false;
  return /^(hola+|holi+|hey|ey|buenas|buenos dias|buenas tardes|buenas noches|buen dia|saludos|que tal|hi|hello|good morning|good afternoon|good evening)( florencio| a todos| como estas| que tal| como esta| como te va)?$/.test(t);
}

/* ───────────────────────── Respuestas de Florencio ───────────────────────── */

export function welcomeMessage(lang: Lang = "es"): string {
  const g = timeGreeting(lang);
  return lang === "en"
    ? `${g}, I'm Florencio, Deluxury's floral assistant. It's a pleasure to help you. Tell me which collection you're interested in and your maximum budget in COP, and I'll find the ideal piece for you.`
    : `${g}, soy Florencio, el asistente floral de Deluxury. Es un gusto atenderte. Cuéntame qué colección te interesa y tu presupuesto máximo en COP, y con gusto te recomiendo la pieza ideal.`;
}

function joinList(items: string[], lang: Lang) {
  if (items.length <= 1) return items[0] ?? "";
  const and = lang === "en" ? "and" : "y";
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

/**
 * Pide, con cortesía, SOLO lo que falta (colección y/o presupuesto).
 * `first` = es el primer intercambio: se abre con saludo según la hora.
 */
export function askMissingReply(opts: {
  lang: Lang;
  needCollection: boolean;
  needBudget: boolean;
  collectionNames: string[];
  first: boolean;
  gotCollection?: string | undefined;
}): string {
  const { lang, needCollection, needBudget, collectionNames, first, gotCollection } = opts;
  const opener = first
    ? lang === "en" ? `${timeGreeting("en")}! It will be a pleasure to help you.` : `¡${timeGreeting("es")}! Con mucho gusto te ayudo.`
    : lang === "en" ? "Of course, happy to help." : "Claro que sí, con gusto.";
  const examples = collectionNames.length ? ` (${joinList(collectionNames.slice(0, 4), lang)})` : "";

  if (lang === "en") {
    if (needCollection && needBudget)
      return `${opener} To recommend the perfect piece, could you tell me which collection you're interested in${examples} and your maximum budget in COP?`;
    if (needCollection)
      return `${opener} Which collection are you interested in${examples}? I already have your budget.`;
    return gotCollection
      ? `${opener} I have the ${gotCollection} collection in mind. What is your maximum budget in COP so I can pick the best options?`
      : `${opener} What is your maximum budget in COP so I can pick the best options?`;
  }
  if (needCollection && needBudget)
    return `${opener} Para recomendarte la pieza ideal, ¿me cuentas por favor qué colección te interesa${examples} y cuál es tu presupuesto máximo en COP?`;
  if (needCollection)
    return `${opener} Ya tengo tu presupuesto. ¿Qué colección te interesa${examples}?`;
  return gotCollection
    ? `${opener} Ya tengo en cuenta la colección ${gotCollection}. ¿Cuál es tu presupuesto máximo en COP para elegir las mejores opciones?`
    : `${opener} ¿Cuál es tu presupuesto máximo en COP para elegir las mejores opciones?`;
}

export function recommendationReply(opts: {
  lang: Lang;
  collectionName?: string | undefined;
  budgetText?: string | undefined;
  color?: string | undefined;
  colorMatches: number;
  total: number;
  quoteOnly: boolean;
}): string {
  const { lang, collectionName, budgetText, color, colorMatches, total, quoteOnly } = opts;
  const c = color ? colorLabel(color, lang) : "";
  const where = collectionName ? (lang === "en" ? ` from ${collectionName}` : ` de ${collectionName}`) : "";
  const within = budgetText ? (lang === "en" ? ` within your ${budgetText} budget` : ` dentro de tu presupuesto de ${budgetText}`) : "";

  let text: string;
  if (lang === "en") {
    text = `With pleasure. Here are options${where}${within}.`;
    if (color && colorMatches === 0)
      text += ` I don't see a piece described in ${c} in this selection, but you can choose the one you like most and ask us on WhatsApp whether a ${c} variant is available.`;
    else if (color && colorMatches < total)
      text += ` I'm showing the ${c} ones first; for the rest you can ask on WhatsApp about a ${c} variant.`;
    else if (color) text += ` They are all available in ${c}.`;
    if (quoteOnly) text += " Each piece in this collection is quoted personally: use the Quote button and we'll answer you on WhatsApp.";
    return text;
  }
  text = `Con mucho gusto. Te comparto opciones${where}${within}.`;
  if (color && colorMatches === 0)
    text += ` En esta selección no veo un arreglo descrito en color ${c}, pero puedes elegir el que más te guste y preguntarnos por WhatsApp si hay una variante en ${c}.`;
  else if (color && colorMatches < total)
    text += ` Te muestro primero los que vienen en ${c}; de los demás puedes consultar por WhatsApp si hay variante en ${c}.`;
  else if (color) text += ` Todos están disponibles en color ${c}.`;
  if (quoteOnly) text += " Cada pieza de esta colección se cotiza de forma personalizada: usa el botón Cotizar y te respondemos por WhatsApp.";
  return text;
}

export function noResultsReply(opts: { lang: Lang; collectionName?: string | undefined; budgetText?: string | undefined; quoteOnly: boolean }): string {
  const { lang, collectionName, budgetText, quoteOnly } = opts;
  if (lang === "en")
    return quoteOnly
      ? `Pieces in ${collectionName ?? "this collection"} are quoted personally and usually exceed ${budgetText ?? "that budget"}. Write to us on WhatsApp and we'll design something for you.`
      : `I couldn't find active pieces${collectionName ? ` in ${collectionName}` : ""}${budgetText ? ` up to ${budgetText}` : ""}. You can raise the budget a little or talk to an advisor on WhatsApp.`;
  return quoteOnly
    ? `Las piezas de ${collectionName ?? "esta colección"} se cotizan de forma personalizada y normalmente superan ${budgetText ?? "ese presupuesto"}. Escríbenos por WhatsApp y diseñamos algo para ti.`
    : `No encontré piezas activas${collectionName ? ` en ${collectionName}` : ""}${budgetText ? ` hasta ${budgetText}` : ""}. Puedes subir un poco el presupuesto o hablar con un asesor por WhatsApp.`;
}

/* ───────────────────────── WhatsApp ───────────────────────── */

export function productUrl(slug: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/producto/${slug}`;
}

export function whatsappHref(phone: string | undefined, message: string) {
  return `https://wa.me/${(phone || DEFAULT_WHATSAPP).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string | undefined, message: string) {
  if (typeof window === "undefined") return;
  window.open(whatsappHref(phone, message), "_blank", "noopener,noreferrer");
}

export function colorQuestionMessage(product: Pick<Product, "name" | "slug">, color: string, lang: Lang = "es") {
  const c = colorLabel(color, lang);
  return lang === "en"
    ? `Hello, Deluxury! I'm interested in "${product.name}" but I'd like it in ${c}. Is there a ${c} variant available?\n${productUrl(product.slug)}`
    : `Hola, Deluxury. Me interesa el arreglo "${product.name}" pero lo quisiera en color ${c}. ¿Tienen alguna variante en ${c} disponible?\n${productUrl(product.slug)}`;
}

export function quoteMessage(product: Pick<Product, "name" | "slug">, categoryName?: string, lang: Lang = "es") {
  return lang === "en"
    ? `Hello, Deluxury! I'd like a quote for "${product.name}"${categoryName ? ` (${categoryName})` : ""}.\n${productUrl(product.slug)}`
    : `Hola, Deluxury. Quisiera cotizar el arreglo "${product.name}"${categoryName ? ` (${categoryName})` : ""}.\n${productUrl(product.slug)}`;
}

/* ───────────────────── Colecciones que se cotizan (Bodas & Eventos) ───────────────────── */

const QUOTE_NAME_RULE = /bod|evento|matrimon|wedding|event/;

/**
 * Las piezas de Bodas & Eventos no se compran con carrito: se cotizan por WhatsApp.
 * Se detecta por nombre/slug de la categoría, o con el ajuste `quote_category_slugs`
 * (slugs separados por coma, editable en site_settings).
 */
export function isQuoteCategory(category: Category | undefined, settings?: Record<string, string> | null): boolean {
  if (!category) return false;
  const custom = (settings?.["quote_category_slugs"] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (custom.length) return custom.includes(category.slug.toLowerCase());
  return QUOTE_NAME_RULE.test(normalize(`${category.slug} ${category.name}`));
}

export function isQuoteProduct(product: Pick<Product, "category_id">, categories: Category[] | undefined, settings?: Record<string, string> | null) {
  if (!product.category_id || !categories) return false;
  return isQuoteCategory(categories.find((c) => c.id === product.category_id), settings);
}

/** Nombre de producto siempre en MAYÚSCULAS (catálogo). */
export function upperName(name: string) {
  return name.toLocaleUpperCase("es-CO");
}
