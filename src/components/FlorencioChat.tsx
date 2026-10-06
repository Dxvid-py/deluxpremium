import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
  ChevronUp,
} from "lucide-react";
import {
  categoriesQuery,
  productsQuery,
  settingsQuery,
  type Product,
} from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator, useI18n, type Lang } from "@/lib/i18n";
import { playFlorencioAudio } from "@/lib/florencio-voice";
import {
  colorLabel,
  describeFlorencioFilters,
  parseFlorencioFilters,
  type FlorencioFilters,
  type FlorencioRecommendation,
} from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";
import { planFlorencioTurn } from "@/lib/florencio-turn";
import {
  colorQuestionMessage,
  DEFAULT_WHATSAPP,
  isGreetingOnly,
  isQuoteCategory,
  openWhatsApp,
  quoteMessage,
  upperName,
  welcomeMessage,
} from "@/lib/florencio-support";

const QUICK_PROMPTS: Record<Lang, string[]> = {
  es: [
    "Quiero algo de amor",
    "Flores para una boda",
    "Un detalle de condolencias",
    "Máximo $200.000",
  ],
  en: [
    "Something for love",
    "Flowers for a wedding",
    "A sympathy tribute",
    "Maximum $200,000",
  ],
};

const CHAT_KEY = "deluxury-florencio-chat-v3";
const VISIBLE_MESSAGE_LIMIT = 12;

type Message = {
  id: number;
  role: "florencio" | "user";
  text: string;
  action?: { label: string; whatsappMessage: string };
};

function Avatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg"
      ? "h-24 w-24"
      : size === "sm"
        ? "h-10 w-10"
        : "h-14 w-14";

  return (
    <div
      className={`${sizeClass} relative shrink-0 overflow-hidden rounded-full border border-primary/30 bg-[radial-gradient(circle_at_50%_25%,#fffaf0_0%,#f0dfc7_50%,#dcc3a3_100%)] shadow-[0_16px_40px_-24px_rgba(113,76,39,0.55)]`}
    >
      <img
        src="/img/florencio.png"
        alt="Florencio de Deluxury"
        className="absolute inset-0 h-full w-full object-cover object-[50%_28%]"
      />
    </div>
  );
}

function ProductMiniCard({
  product,
  onAdd,
  lang,
  quote,
  phone,
}: {
  product: FlorencioRecommendation;
  onAdd: (product: FlorencioRecommendation) => void;
  lang: Lang;
  quote: boolean;
  phone: string;
}) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const trm = Number(
    (settings as Record<string, string> | undefined)?.["trm_cop_usd"] ?? 3950,
  );
  const askColor = Boolean(product.requestedColor) && product.colorMatch === false;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/80 bg-white/80 shadow-[0_18px_50px_-32px_rgba(62,39,19,0.28)] backdrop-blur-sm transition duration-500 hover:-translate-y-1 hover:border-primary/40">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-4">
        <div className="overflow-hidden rounded-xl bg-secondary/60">
          <img
            src={product.images?.[0] ?? "/img/prod-01.jpg"}
            alt={upperName(product.name)}
            className="h-24 w-full object-cover transition duration-700 group-hover:scale-105 sm:h-28"
          />
        </div>

        <div className="min-w-0 py-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-lg leading-tight tracking-[0.03em] break-words">
              {upperName(product.name)}
            </p>
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          </div>

          <p className="mt-1 text-xs font-medium tracking-[0.08em] text-primary uppercase">
            {formatMoney(Number(product.price_cop), currency, trm)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/producto/$slug"
              params={{ slug: product.slug }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-[9px] tracking-[0.14em] uppercase transition hover:border-primary/50 hover:text-primary"
            >
              {lang === "en" ? "View details" : "Ver detalle"}
              <ArrowRight className="h-3 w-3" />
            </Link>

            <button
              type="button"
              onClick={() => onAdd(product)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[9px] tracking-[0.12em] text-primary-foreground uppercase transition hover:opacity-90"
            >
              {quote ? <MessageCircle className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
              {quote ? (lang === "en" ? "Quote" : "Cotizar") : lang === "en" ? "Add" : "Añadir"}
            </button>
          </div>

          {askColor && product.requestedColor && (
            <button
              type="button"
              onClick={() => openWhatsApp(phone, colorQuestionMessage(product, product.requestedColor!, lang))}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/50 bg-[#25D366]/10 px-3 py-2 text-[9px] tracking-[0.1em] text-[#128C7E] uppercase transition hover:bg-[#25D366]/20"
            >
              <MessageCircle className="h-3 w-3" />
              {lang === "en"
                ? `Ask about ${colorLabel(product.requestedColor, "en")} on WhatsApp`
                : `Preguntar por color ${colorLabel(product.requestedColor)} en WhatsApp`}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FlorencioChat({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(embedded);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const [thinking, setThinking] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_MESSAGE_LIMIT);
  const [lastIntent, setLastIntent] = useState<"conversation" | "information" | "discovery" | "recommendation">("conversation");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const { lang } = useI18n();
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { add } = useStore();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const [recommendations, setRecommendations] = useState<FlorencioRecommendation[]>([]);
  const { data: settings } = useQuery(settingsQuery);
  const phone = settings?.["whatsapp_number"] ?? DEFAULT_WHATSAPP;


  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<{
        messages: Message[];
        filters: FlorencioFilters;
        lastIntent: typeof lastIntent;
      }>;
      if (Array.isArray(parsed.messages)) {
        const clean = parsed.messages.filter((item) => item && (item.role === "user" || item.role === "florencio") && typeof item.text === "string");
        if (clean.length) {
          setMessages(clean);
          nextId.current = clean.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
          setVisibleCount(VISIBLE_MESSAGE_LIMIT);
        }
      }
      if (parsed.filters?.keywords) setFilters(parsed.filters);
      if (parsed.lastIntent) setLastIntent(parsed.lastIntent);
    } catch {
      // Ignore malformed local chat history.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify({ messages, filters, lastIntent }));
    } catch {
      // Ignore unavailable storage.
    }
  }, [messages, filters, lastIntent]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("florencio:chat-visibility", { detail: { open: embedded || open } }));
    return () => {
      window.dispatchEvent(new CustomEvent("florencio:chat-visibility", { detail: { open: false } }));
    };
  }, [open, embedded]);

  useEffect(() => {
    if (embedded) return;

    const openChat = () => setOpen(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("florencio:open-chat", openChat);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("florencio:open-chat", openChat);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [embedded]);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    setMessages([{ id: nextId.current++, role: "florencio", text: welcomeMessage(lang) }]);
    setLastIntent("conversation");
  }, [lang, open, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;

    setVisibleCount(VISIBLE_MESSAGE_LIMIT);
    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text },
    ]);
    setInput("");
    setThinking(true);

    try {
      const firstContact = !messages.some((m) => m.role === "user");
      let ai: Awaited<ReturnType<typeof askFlorencioAI>> | null = null;
      if (!isGreetingOnly(text)) {
        try {
          ai = await askFlorencioAI({
            message: text,
            history: messages.slice(-8).map(({ role, text: messageText }) => ({ role, text: messageText })),
            currentFilters: filters,
            language: lang,
            categories: categories
              .filter((c) => c.is_active !== false)
              .map((c) => ({ name: c.name, slug: c.slug, description: c.description })),
          });
        } catch (error) {
          console.warn("Florencio IA no disponible; uso el motor local.", error);
        }
      }

      const plan = planFlorencioTurn({
        text,
        lang,
        firstContact,
        filters,
        categories,
        products,
        settings,
        ai,
        limit: 3,
      });

      setFilters(plan.merged);
      setRecommendations(plan.recommendations);
      setLastIntent(plan.shouldRecommend ? "recommendation" : plan.asking ? "discovery" : "conversation");
      if (plan.shouldRecommend && plan.recommendations.length > 0) {
        playFlorencioAudio("recommend", lang);
        setRecommendationOpen(true);
      } else if (plan.asking) {
        playFlorencioAudio("ask", lang);
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "florencio", text: plan.replyText, ...(plan.action ? { action: plan.action } : {}) },
      ]);
    } catch (error) {
      console.warn("Florencio: error inesperado.", error);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "florencio",
          text: lang === "en"
            ? "I'm sorry, something went wrong. Could you write that again, please?"
            : "Disculpa, tuve un inconveniente. ¿Me lo puedes escribir de nuevo, por favor?",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const deleteChat = () => {
    setRecommendationOpen(false);
    setRecommendations([]);
    setMessages([]);
    setFilters({ keywords: [] });
    setLastIntent("conversation");
    setVisibleCount(VISIBLE_MESSAGE_LIMIT);
    setConfirmDelete(false);
    nextId.current = 1;
    try { localStorage.removeItem(CHAT_KEY); } catch { /* ignore */ }
    window.setTimeout(() => {
      setMessages([{ id: nextId.current++, role: "florencio", text: welcomeMessage(lang) }]);
    }, 0);
  };

  const addRecommended = (product: FlorencioRecommendation) => {
    const category = categories.find((c) => c.id === product.category_id);

    // Bodas & Eventos: no hay carrito; se cotiza por WhatsApp con el link del producto.
    if (isQuoteCategory(category, settings)) {
      openWhatsApp(phone, quoteMessage(product, category?.name, lang));
      return;
    }

    add(product);
    setRecommendationOpen(false);
    playFlorencioAudio("added", lang);

    window.dispatchEvent(
      new CustomEvent("florencio:product-selected", {
        detail: { name: product.name },
      }),
    );

    const needsColorAsk = Boolean(product.requestedColor) && product.colorMatch === false;
    setMessages((prev) => [
      ...prev,
      {
        id: nextId.current++,
        role: "florencio",
        text: lang === "en"
          ? `Done. I added ${upperName(product.name)} to your cart.${needsColorAsk ? " If you'd like it in another color, ask us on WhatsApp." : ""} I can also help you complete the gift.`
          : `Listo. Añadí ${upperName(product.name)} a tu carrito.${needsColorAsk ? " Si lo quieres en otro color, pregúntanos por WhatsApp." : ""} También puedo ayudarte a completar el detalle.`,
        ...(needsColorAsk && product.requestedColor
          ? { action: { label: lang === "en" ? "Ask about another color" : "Preguntar por otro color", whatsappMessage: colorQuestionMessage(product, product.requestedColor, lang) } }
          : {}),
      },
    ]);
  };

  const firstVisibleIndex = Math.max(0, messages.length - visibleCount);
  const visibleMessages = messages.slice(firstVisibleIndex);
  const hasOlderMessages = firstVisibleIndex > 0;
  const visibleRecommendations = recommendations;
  const showRecommendations = lastIntent === "recommendation" && visibleRecommendations.length > 0;

  const visible = embedded || open;

  return (
    <>
      {!embedded && open && (
        <div
          className="fixed inset-0 z-[70] bg-[#2d1914]/12 backdrop-blur-[3px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          embedded
            ? "relative z-10 flex h-[760px] min-w-0 flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-[0_35px_100px_-42px_rgba(77,45,25,0.38)] backdrop-blur-2xl md:h-[720px]"
            : `fixed inset-x-2 bottom-2 z-[80] flex h-[min(760px,calc(100dvh-16px))] w-auto min-w-0 flex-col overflow-hidden rounded-[26px] border border-primary/20 bg-white/95 shadow-[0_35px_100px_-30px_rgba(54,32,22,0.4)] backdrop-blur-xl transition-[opacity,transform] duration-500 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(720px,calc(100vh-24px))] sm:w-[min(460px,calc(100vw-48px))] ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-8 opacity-0"
              }`
        }
        aria-hidden={!visible}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-border/80 bg-[linear-gradient(135deg,#fffdf8_0%,#f5eadc_100%)] px-5 py-4 md:px-7">
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display text-2xl leading-none">Florencio</p>
                  <span className="flex items-center gap-1 text-[8px] tracking-[0.16em] text-primary uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {lang === "en" ? "Online" : "En línea"}
                  </span>
                </div>
                <p className="mt-1 text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                  {lang === "en" ? "Deluxury floral assistant" : "Asistente floral de Deluxury"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label={lang === "en" ? "Delete chat" : "Eliminar chat"}
                className="rounded-full border border-border bg-white/60 p-2 text-muted-foreground transition hover:border-red-300 hover:text-red-600"
                title={lang === "en" ? "Delete chat" : "Eliminar chat"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {!embedded && (
                <button type="button" onClick={() => setOpen(false)} aria-label={lang === "en" ? "Close chat" : "Cerrar chat"} className="rounded-full border border-border bg-white/60 p-2 transition hover:border-primary/50">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_82%_12%,rgba(180,139,86,0.09),transparent_22%),linear-gradient(180deg,#fffdf9_0%,#fbf5ed_100%)] px-4 py-5 md:px-7 md:py-7"
        >
          <div className="mb-6 grid gap-5 rounded-2xl border border-primary/15 bg-white/65 p-4 shadow-[0_14px_45px_-30px_rgba(76,49,27,0.3)] sm:grid-cols-[auto_1fr] sm:items-center">
            <Avatar size="md" />
            <div>
              <p className="text-[9px] tracking-[0.2em] text-primary uppercase">
                {lang === "en" ? "Your floral guidance" : "Tu asesoría floral"}
              </p>
              <p className="mt-1 font-display text-2xl">
                {lang === "en" ? "A gift designed with you." : "Un regalo pensado contigo."}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {lang === "en" ? "Florencio understands what you are looking for and connects it with real Deluxury products." : "Florencio interpreta lo que buscas y conecta esa intención con productos reales de Deluxury."}
              </p>
            </div>
          </div>

          {confirmDelete && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3">
              <p className="text-xs text-red-800">{lang === "en" ? "Delete this conversation and start a new one?" : "¿Eliminar esta conversación y empezar una nueva?"}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full border border-border bg-white px-3 py-2 text-[9px] tracking-[.12em] uppercase">{lang === "en" ? "Cancel" : "Cancelar"}</button>
                <button type="button" onClick={deleteChat} className="rounded-full bg-red-600 px-3 py-2 text-[9px] tracking-[.12em] text-white uppercase">{lang === "en" ? "Delete" : "Eliminar"}</button>
              </div>
            </div>
          )}

          {hasOlderMessages && (
            <button type="button" onClick={() => setVisibleCount((count) => count + VISIBLE_MESSAGE_LIMIT)} className="mx-auto mb-4 flex items-center gap-2 rounded-full border border-border bg-white/75 px-4 py-2.5 text-[9px] tracking-[.14em] text-muted-foreground uppercase hover:border-primary/50 hover:text-primary">
              <ChevronUp className="h-3.5 w-3.5" />
              {lang === "en" ? "Load older messages" : "Cargar mensajes anteriores"}
            </button>
          )}

          <div className="space-y-4">
            {visibleMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "florencio" ? (
                  <div className="max-w-[92%]">
                    <p className="rounded-2xl rounded-tl-md border border-border/80 bg-white px-4 py-3 text-sm leading-relaxed shadow-[0_10px_30px_-24px_rgba(55,31,17,0.3)]">
                      {message.text}
                    </p>
                    {message.action && (
                      <button
                        type="button"
                        onClick={() => openWhatsApp(phone, message.action!.whatsappMessage)}
                        className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-[9px] tracking-[0.14em] text-white uppercase shadow-sm transition hover:opacity-90"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {message.action.label}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="max-w-[82%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-[0_14px_30px_-20px_rgba(109,56,56,0.5)]">
                    {message.text}
                  </p>
                )}
              </div>
            ))}

            {thinking && (
              <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
                {lang === "en" ? "Thinking…" : "Pensando…"}
              </div>
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-border/80 bg-white/92 px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))] backdrop-blur-xl md:px-6">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PROMPTS[lang].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                className="shrink-0 rounded-full border border-border bg-background px-3 py-2 text-[9px] tracking-[0.04em] transition hover:border-primary/50 hover:text-primary"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] focus-within:border-primary/50"
          >
            <MessageCircle className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={lang === "en" ? "Write to Florencio…" : "Escríbele a Florencio…"}
              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              aria-label="Enviar mensaje"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
              disabled={!input.trim() || thinking}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[8px] tracking-[0.12em] text-muted-foreground uppercase">
            <Check className="h-3 w-3 text-primary" />
            {lang === "en" ? "Products and prices come from the Deluxury catalog" : "Productos y precios tomados del catálogo Deluxury"}
          </div>
        </footer>
      </aside>

      {recommendationOpen && showRecommendations && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/25 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Recomendaciones de Florencio">
          <div className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-primary/20 bg-[#fffdf9] p-4 shadow-[0_35px_100px_-35px_rgba(55,31,17,.45)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] tracking-[.2em] text-primary uppercase">Selección de Florencio</p>
                <h3 className="mt-1 font-display text-3xl">Encontré estas opciones para ti.</h3>
                <p className="mt-1 text-xs text-muted-foreground">Puedes elegir una, ver todo el catálogo o continuar sin seleccionar.</p>
              </div>
              <button type="button" onClick={() => setRecommendationOpen(false)} className="rounded-full border border-border p-2" aria-label="Cerrar recomendaciones"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {visibleRecommendations.slice(0, 3).map((product) => (
                <ProductMiniCard
                  key={product.id}
                  product={product}
                  onAdd={addRecommended}
                  lang={lang}
                  quote={isQuoteCategory(categories.find((c) => c.id === product.category_id), settings)}
                  phone={phone}
                />
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/catalogo" onClick={() => setRecommendationOpen(false)} className="rounded-full bg-primary px-5 py-3 text-[9px] tracking-[.16em] text-primary-foreground uppercase">Ver catálogo</Link>
              <button type="button" onClick={() => setRecommendationOpen(false)} className="rounded-full border border-border bg-white px-5 py-3 text-[9px] tracking-[.16em] uppercase">Ahora no</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
