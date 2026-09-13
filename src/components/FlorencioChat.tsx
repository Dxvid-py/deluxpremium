import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Send,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import {
  productsQuery,
  categoriesQuery,
  settingsQuery,
  type Product,
} from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator } from "@/lib/i18n";
import {
  describeFlorencioFilters,
  parseFlorencioFilters,
  rankFlorencioProducts,
  type FlorencioFilters,
} from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";

const QUICK_PROMPTS = [
  "Quiero un regalo para mi pareja",
  "Algo para un cumpleaños",
  "Quiero algo elegante",
  "Tengo máximo $200.000",
];

type Message = {
  id: number;
  role: "florencio" | "user";
  text: string;
};

function recommendationReason(
  product: Product,
  filters: FlorencioFilters,
) {
  const reasons: string[] = [];

  if (filters.occasion) reasons.push(`encaja con ${filters.occasion}`);
  if (filters.style) reasons.push(`tiene un estilo ${filters.style}`);
  if (filters.color) reasons.push(`se acerca al color ${filters.color}`);
  if (filters.budgetMax) reasons.push("respeta tu presupuesto");
  if (filters.recipient) reasons.push(`es apropiado para ${filters.recipient}`);

  if (!reasons.length) {
    return `La seleccioné porque tiene una presencia elegante y es una buena opción dentro del catálogo actual de Deluxury.`;
  }

  return `La seleccioné porque ${reasons.slice(0, 2).join(" y ")}.`;
}

function ProductMiniCard({
  product,
  filters,
  onAdd,
}: {
  product: Product;
  filters: FlorencioFilters;
  onAdd: (product: Product) => void;
}) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number(
    (settings as Record<string, string> | undefined)?.["trm_cop_usd"] ??
      3950,
  );

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/15 bg-white/[0.055] shadow-[0_18px_50px_-35px_rgba(0,0,0,0.9)] backdrop-blur-md">
      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_1fr] sm:p-3.5">
        <img
          src={product.images?.[0] ?? "/img/prod-01.jpg"}
          alt={tc(product.name)}
          className="h-[94px] w-full rounded-xl object-cover sm:h-28"
        />

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-lg text-white">
                {tc(product.name)}
              </p>
              <p className="mt-1 text-xs text-white/65">
                {recommendationReason(product, filters)}
              </p>
            </div>
            <p className="shrink-0 text-xs text-primary">
              {formatMoney(Number(product.price_cop), currency, trm)}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/producto/$slug"
              params={{ slug: product.slug }}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[9px] tracking-[0.12em] text-white/80 uppercase hover:border-primary hover:text-white"
            >
              Ver detalle
              <ArrowRight className="h-3 w-3" />
            </Link>

            <button
              type="button"
              onClick={() => onAdd(product)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[9px] tracking-[0.1em] text-primary-foreground uppercase"
            >
              <ShoppingBag className="h-3 w-3" />
              Añadir
            </button>
          </div>
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
  const [filters, setFilters] = useState<FlorencioFilters>({
    keywords: [],
  });
  const [thinking, setThinking] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { add } = useStore();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const recommendations = useMemo(
    () => rankFlorencioProducts(products, categories, filters, 3),
    [products, categories, filters],
  );

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
    if (messages.length) return;

    setMessages([
      {
        id: nextId.current++,
        role: "florencio",
        text: "Hola, soy Florencio, la IA floral de Deluxury.",
      },
      {
        id: nextId.current++,
        role: "florencio",
        text: "Cuéntame para quién es el detalle, qué ocasión tienes y cuánto quieres invertir. Yo me encargo de buscar las mejores coincidencias en nuestro catálogo.",
      },
    ]);
  }, [messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;

    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text },
    ]);
    setInput("");
    setThinking(true);

    try {
      const result = await askFlorencioAI({
        message: text,
        history: messages
          .slice(-8)
          .map(({ role, text: messageText }) => ({
            role,
            text: messageText,
          })),
        currentFilters: filters,
      });

      const localFallback = parseFlorencioFilters(text);

      const merged: FlorencioFilters = {
        recipient:
          result.filters.recipient ??
          localFallback.recipient ??
          filters.recipient,
        occasion:
          result.filters.occasion ??
          localFallback.occasion ??
          filters.occasion,
        style: result.filters.style ?? localFallback.style ?? filters.style,
        color: result.filters.color ?? localFallback.color ?? filters.color,
        budgetMax:
          result.filters.budgetMax ??
          localFallback.budgetMax ??
          filters.budgetMax,
        keywords: Array.from(
          new Set([
            ...filters.keywords,
            ...localFallback.keywords,
            ...(result.keywords ?? []),
            ...(result.filters.keywords ?? []),
          ]),
        ).slice(0, 16),
      };

      setFilters(merged);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "florencio",
          text: result.reply,
        },
      ]);
    } catch (error) {
      const parsed = parseFlorencioFilters(text);

      const merged: FlorencioFilters = {
        recipient: parsed.recipient ?? filters.recipient,
        occasion: parsed.occasion ?? filters.occasion,
        style: parsed.style ?? filters.style,
        color: parsed.color ?? filters.color,
        budgetMax: parsed.budgetMax ?? filters.budgetMax,
        keywords: Array.from(
          new Set([...filters.keywords, ...parsed.keywords]),
        ).slice(0, 16),
      };

      setFilters(merged);

      const parts = describeFlorencioFilters(merged);
      const reply = parts.length
        ? `Perfecto. ${parts.join(" · ")}. Voy a cruzarlo con el catálogo real de Deluxury y mostrarte las opciones que mejor encajan.`
        : "Perfecto. Voy a cruzar tu idea con el catálogo real de Deluxury y mostrarte las opciones que mejor encajan.";

      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "florencio", text: reply },
      ]);

      console.warn("Florencio AI no disponible; usando modo local.", error);
    } finally {
      setThinking(false);
    }
  };

  const addRecommended = (product: Product) => {
    add(product);

    window.dispatchEvent(
      new CustomEvent("florencio:product-selected", {
        detail: { name: product.name },
      }),
    );

    setMessages((prev) => [
      ...prev,
      {
        id: nextId.current++,
        role: "florencio",
        text: `Listo. Añadí ${product.name} a tu carrito. Si quieres, puedo ayudarte a elegir una alternativa o revisar otra ocasión.`,
      },
    ]);
  };

  const chat = (
    <div
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${
        embedded
          ? "rounded-[26px] border border-white/15 bg-black/25 shadow-[0_35px_100px_-45px_rgba(0,0,0,0.95)] backdrop-blur-xl"
          : "rounded-[24px] border border-primary/20 bg-background/98 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.55)]"
      }`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-black/25 sm:h-11 sm:w-11">
            <img
              src="/img/florencio.png"
              alt=""
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div>
            <p className="font-display text-lg text-white sm:text-xl">
              Florencio
            </p>
            <p className="text-[9px] tracking-[0.18em] text-white/50 uppercase">
              IA floral · Deluxury
            </p>
          </div>
        </div>

        {!embedded && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar chat"
            className="rounded-full border border-white/10 p-2 text-white/70 hover:border-primary/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3.5 py-4 sm:px-5 sm:py-6"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[92%] ${
                message.role === "user"
                  ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground"
                  : "flex items-start gap-2"
              }`}
            >
              {message.role === "florencio" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/20">
                  <img
                    src="/img/florencio.png"
                    alt=""
                    className="h-full w-full object-contain p-0.5"
                  />
                </div>
              )}

              <p
                className={
                  message.role === "florencio"
                    ? "rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3 text-sm leading-relaxed text-white/90"
                    : "text-sm leading-relaxed"
                }
              >
                {message.text}
              </p>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-2 px-2 text-xs text-white/55">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
            Florencio está analizando el catálogo…
          </div>
        )}

        {recommendations.length > 0 && messages.length > 1 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1 text-[9px] tracking-[0.18em] text-white/55 uppercase">
              <Sparkles className="h-3 w-3 text-primary" />
              Recomendaciones para ti
            </div>

            {recommendations.map((product) => (
              <ProductMiniCard
                key={product.id}
                product={product}
                filters={filters}
                onAdd={addRecommended}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-black/20 px-3.5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-5 sm:py-4 sm:pb-4">
        <div className="mb-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] text-white/70 hover:border-primary/50 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-1.5 focus-within:border-primary/60"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe a Florencio…"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            disabled={!input.trim() || thinking}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-2 text-center text-[8px] tracking-[0.1em] text-white/35 uppercase">
          <Bot className="mr-1 inline h-3 w-3" />
          Productos y precios salen del catálogo real de Deluxury
        </p>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="relative h-[min(760px,calc(100dvh-180px))] min-h-[620px] w-full max-w-5xl">
        {chat}

        <div className="pointer-events-none absolute -bottom-5 right-[-8px] hidden w-28 sm:block lg:-right-20 lg:w-36">
          <div className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,var(--rose-glow),transparent_68%)] opacity-60 blur-xl" />
          <img
            src="/img/florencio.png"
            alt="Florencio"
            className="relative h-auto w-full object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)]"
          />
        </div>

        <div className="pointer-events-none absolute -bottom-3 right-4 w-20 sm:hidden">
          <img
            src="/img/florencio.png"
            alt=""
            className="w-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.5)]"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-x-2 bottom-2 z-[80] flex h-[min(760px,calc(100dvh-16px))] w-auto min-w-0 flex-col overflow-hidden rounded-[24px] border border-primary/20 bg-background/98 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[opacity,transform] duration-500 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(720px,calc(100vh-24px))] sm:w-[min(430px,calc(100vw-48px))] sm:rounded-[28px] ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-8 opacity-0"
        }`}
        aria-hidden={!open}
      >
        {chat}
      </aside>
    </>
  );
}
