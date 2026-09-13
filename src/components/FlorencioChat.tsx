import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Send, ShoppingBag, Sparkles, X } from "lucide-react";
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

const FLORENCIO_IMAGE = "/img/florencio.png";

const QUICK_PROMPTS = [
  "Regalo para mi pareja",
  "Algo para cumpleaños",
  "Quiero algo elegante",
  "Máximo $200.000",
];

type Message = {
  id: number;
  role: "florencio" | "user";
  text: string;
};

function Avatar({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`florencio-avatar ${small ? "florencio-avatar-sm" : ""}`}
      aria-hidden="true"
    >
      <img src={FLORENCIO_IMAGE} alt="" />
    </span>
  );
}

function mergeFilters(
  current: FlorencioFilters,
  parsed: FlorencioFilters,
): FlorencioFilters {
  return {
    recipient: parsed.recipient ?? current.recipient,
    occasion: parsed.occasion ?? current.occasion,
    style: parsed.style ?? current.style,
    color: parsed.color ?? current.color,
    budgetMax: parsed.budgetMax ?? current.budgetMax,
    keywords: Array.from(
      new Set([...current.keywords, ...parsed.keywords]),
    ).slice(0, 16),
  };
}

function localReply(filters: FlorencioFilters) {
  const parts = describeFlorencioFilters(filters);

  return parts.length
    ? `Perfecto. ${parts.join(" · ")}. Voy a cruzarlo con el catálogo real de Deluxury y te mostraré las opciones que mejor encajan.`
    : "Claro. Cuéntame para quién es, qué ocasión tienes, qué estilo buscas o cuánto quieres invertir y te recomiendo opciones del catálogo real.";
}

function RecommendationCard({
  product,
  onAdd,
}: {
  product: ReturnType<typeof rankFlorencioProducts>[number];
  onAdd: (product: Product) => void;
}) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
      <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[105px_1fr] sm:p-3.5">
        <img
          src={product.images?.[0] ?? "/img/prod-01.jpg"}
          alt={tc(product.name)}
          className="h-[96px] w-full rounded-xl object-cover sm:h-28"
        />

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 font-display text-lg leading-tight text-white">
              {tc(product.name)}
            </p>

            <span className="shrink-0 text-[11px] text-primary">
              {formatMoney(Number(product.price_cop), currency, trm)}
            </span>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-white/60">
            {product.matchReasons?.[0]
              ? `Lo recomiendo porque ${product.matchReasons[0]}.`
              : "Es una de las piezas que mejor coincide con lo que buscas."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/producto/$slug"
              params={{ slug: product.slug }}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[9px] tracking-[0.12em] text-white/75 uppercase hover:border-primary hover:text-white"
            >
              Ver producto
              <ArrowRight className="h-3 w-3" />
            </Link>

            <button
              type="button"
              onClick={() => onAdd(product)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[9px] tracking-[0.12em] text-primary-foreground uppercase"
            >
              <ShoppingBag className="h-3 w-3" />
              Agregar
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ChatCore({ embedded = false }: { embedded?: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<"ia" | "catalogo">("ia");

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
    setMessages([
      {
        id: nextId.current++,
        role: "florencio",
        text: "Hola, soy Florencio. ¿Qué detalle estás buscando?",
      },
      {
        id: nextId.current++,
        role: "florencio",
        text: "Puedes decirme para quién es, la ocasión, el estilo, el color o tu presupuesto.",
      },
    ]);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;

    const history = messages
      .slice(-8)
      .map((message) => ({
        role: message.role,
        text: message.text,
      }));

    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text },
    ]);
    setInput("");
    setThinking(true);

    try {
      const result = await askFlorencioAI({
        message: text,
        history,
        currentFilters: filters,
      });

      const local = parseFlorencioFilters(text);

      const merged = mergeFilters(filters, {
        recipient: result.filters.recipient ?? local.recipient,
        occasion: result.filters.occasion ?? local.occasion,
        style: result.filters.style ?? local.style,
        color: result.filters.color ?? local.color,
        budgetMax: result.filters.budgetMax ?? local.budgetMax,
        keywords: Array.from(
          new Set([
            ...(result.keywords ?? []),
            ...(result.filters.keywords ?? []),
          ]),
        ),
      });

      setFilters(merged);
      setMode("ia");

      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "florencio",
          text: result.reply,
        },
      ]);
    } catch (error) {
      const merged = mergeFilters(filters, parseFlorencioFilters(text));

      setFilters(merged);
      setMode("catalogo");

      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "florencio",
          text: localReply(merged),
        },
      ]);

      console.warn(
        "Florencio AI no disponible; usando modo catálogo.",
        error,
      );
    } finally {
      setThinking(false);
    }
  };

  const useCatalog = () => {
    const text = input.trim() || "Quiero una recomendación";
    const merged = mergeFilters(filters, parseFlorencioFilters(text));

    setFilters(merged);
    setMode("catalogo");

    setMessages((prev) => [
      ...prev,
      { id: nextId.current++, role: "user", text },
      {
        id: nextId.current++,
        role: "florencio",
        text: localReply(merged),
      },
    ]);

    setInput("");
  };

  const addRecommended = (product: Product) => {
    add(product);

    setMessages((prev) => [
      ...prev,
      {
        id: nextId.current++,
        role: "florencio",
        text: `Listo. Añadí ${product.name} a tu carrito.`,
      },
    ]);

    window.dispatchEvent(
      new CustomEvent("florencio:product-selected", {
        detail: { name: product.name },
      }),
    );
  };

  return (
    <div
      className={
        embedded
          ? "relative w-full"
          : "flex h-full min-h-0 flex-col"
      }
    >
      <div
        className={
          embedded
            ? "flex h-[min(700px,calc(100dvh-170px))] min-h-[560px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#120d12]/88 shadow-[0_35px_100px_-45px_rgba(0,0,0,.95)] backdrop-blur-xl sm:h-[min(760px,calc(100dvh-160px))]"
            : "flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] bg-[#130d12]"
        }
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar small />

            <div className="min-w-0">
              <p className="font-display text-xl text-white">Florencio</p>
              <p className="text-[8px] tracking-[0.2em] text-white/45 uppercase">
                Asistente floral ·{" "}
                {mode === "ia" ? "IA activa" : "modo catálogo"}
              </p>
            </div>
          </div>

          <span className="hidden items-center gap-2 text-[8px] tracking-[0.16em] text-white/45 uppercase sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            online
          </span>
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain px-4 py-5 [scrollbar-width:thin] sm:px-7 sm:py-6"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          {messages.map((message) =>
            message.role === "florencio" ? (
              <div
                key={message.id}
                className="flex max-w-[94%] items-start gap-2.5 sm:gap-3"
              >
                <Avatar small />

                <div className="rounded-2xl rounded-tl-md border border-white/8 bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-white/90">
                  {message.text}
                </div>
              </div>
            ) : (
              <div
                key={message.id}
                className="ml-auto max-w-[84%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground"
              >
                {message.text}
              </div>
            ),
          )}

          {thinking && (
            <div className="flex items-center gap-3">
              <Avatar small />
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
              </div>
              <span className="text-xs text-white/45">
                Florencio está pensando…
              </span>
            </div>
          )}

          {recommendations.length > 0 && messages.length > 2 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[9px] tracking-[0.18em] text-white/45 uppercase">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Recomendaciones de Florencio
              </div>

              {recommendations.map((product) => (
                <RecommendationCard
                  key={product.id}
                  product={product}
                  onAdd={addRecommended}
                />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-black/20 px-3.5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 sm:pb-4">
          <div className="mb-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                disabled={thinking}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] text-white/65 hover:border-primary/50 disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5 focus-within:border-primary/60"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe lo que necesitas…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35"
            />

            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Enviar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[8px] tracking-[0.12em] text-white/30 uppercase">
              Productos reales del catálogo
            </span>

            {mode === "ia" && (
              <button
                type="button"
                onClick={useCatalog}
                className="text-[8px] tracking-[0.12em] text-primary uppercase"
              >
                Usar modo catálogo
              </button>
            )}
          </div>
        </div>
      </div>

      {embedded && (
        <div className="pointer-events-none absolute bottom-[-18px] right-2 z-20 w-[92px] sm:bottom-[-24px] sm:right-6 sm:w-[118px] lg:right-10 lg:w-[140px]">
          <div className="absolute -inset-5 rounded-full bg-[radial-gradient(circle,var(--rose-glow),transparent_68%)] opacity-50 blur-xl" />
          <img
            src={FLORENCIO_IMAGE}
            alt="Florencio, asistente de Deluxury"
            className="relative h-auto w-full object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,.55)]"
          />
        </div>
      )}
    </div>
  );
}

export default function FlorencioChat({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openChat = () => setOpen(true);

    window.addEventListener("florencio:open-chat", openChat);

    return () => {
      window.removeEventListener("florencio:open-chat", openChat);
    };
  }, []);

  if (embedded) return <ChatCore embedded />;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-x-2 bottom-2 z-[80] h-[calc(100dvh-20px)] max-h-[780px] overflow-hidden rounded-[26px] border border-white/15 bg-[#120d12] text-white shadow-[0_30px_100px_-35px_rgba(0,0,0,.8)] transition-all duration-300 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(720px,calc(100vh-24px))] sm:w-[460px] ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-8 opacity-0"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/25 px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3">
              <Avatar />
              <div>
                <p className="font-display text-xl text-white">Florencio</p>
                <p className="text-[9px] tracking-[0.16em] text-white/45 uppercase">
                  Asistente Deluxury
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-full border border-white/10 p-2 text-white/60 hover:border-primary/50 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1">
            <ChatCore />
          </div>
        </div>
      </aside>
    </>
  );
}
