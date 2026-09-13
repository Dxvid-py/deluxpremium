import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Send, ShoppingBag, Sparkles, X } from "lucide-react";
import { productsQuery, categoriesQuery, settingsQuery, type Product } from "@/lib/queries";
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

function ProductMiniCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number(
    (settings as Record<string, string> | undefined)?.["trm_cop_usd"] ?? 3950,
  );

  return (
    <div className="overflow-hidden border border-border bg-background">
      <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-4 p-3 sm:grid-cols-[105px_minmax(0,1fr)] sm:p-4">
        <img
          src={product.images?.[0] ?? "/img/prod-01.jpg"}
          alt={tc(product.name)}
          className="h-[88px] w-full object-cover sm:h-[108px]"
        />
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight">{tc(product.name)}</p>
          <p className="mt-1 text-xs text-primary">
            {formatMoney(Number(product.price_cop), currency, trm)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/producto/$slug"
              params={{ slug: product.slug }}
              className="inline-flex items-center gap-1 border border-border px-3 py-2 text-[9px] tracking-[0.14em] uppercase transition hover:border-primary"
            >
              Ver producto <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => onAdd(product)}
              className="inline-flex items-center gap-1 bg-primary px-3 py-2 text-[9px] tracking-[0.12em] text-primary-foreground uppercase"
            >
              <ShoppingBag className="h-3 w-3" /> Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
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
    if (!open || messages.length) return;

    setMessages([
      {
        id: nextId.current++,
        role: "florencio",
        text: "¡Hola! Soy Florencio. Estoy aquí para ayudarte a encontrar un detalle que se sienta perfecto.",
      },
      {
        id: nextId.current++,
        role: "florencio",
        text: "Cuéntame para quién es, qué ocasión tienes y cuánto quieres invertir. Si no sabes exactamente qué buscas, yo te guío.",
      },
    ]);
  }, [open, messages.length]);

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
        { id: nextId.current++, role: "florencio", text: result.reply },
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
        ? `Entendido. ${parts.join(" · ")}. Voy a cruzarlo con nuestro catálogo real.`
        : "Entendido. Voy a tomar eso como punto de partida y buscar coincidencias en el catálogo real de Deluxury.";

      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "florencio", text: reply },
      ]);
      console.warn("Florencio AI no disponible; usando recomendaciones locales.", error);
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
        text: `¡Listo! Añadí ${product.name} a tu carrito. Si quieres, también puedo ayudarte a completar el detalle.`,
      },
    ]);
  };

  const visible = embedded || open;

  return (
    <>
      {!embedded && open && (
        <div
          className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          embedded
            ? "relative flex h-[680px] w-full min-w-0 flex-col overflow-hidden border-y border-border bg-background shadow-[0_30px_90px_-50px_rgba(0,0,0,0.55)] md:h-[720px]"
            : `fixed inset-x-2 bottom-2 z-[80] flex h-[min(760px,calc(100dvh-16px))] w-auto min-w-0 flex-col overflow-hidden rounded-[24px] border border-primary/20 bg-background shadow-[0_30px_100px_-30px_rgba(0,0,0,0.55)] transition-[opacity,transform] duration-500 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:h-[min(720px,calc(100vh-24px))] sm:w-[min(430px,calc(100vw-48px))] sm:rounded-[28px] ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-8 opacity-0"
              }`
        }
        aria-hidden={!visible}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-secondary/45 px-5 py-4 md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl">Florencio</p>
              <p className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                Asistente floral de Deluxury
              </p>
            </div>
          </div>

          {!embedded && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-full border border-border p-2 transition hover:border-primary/50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 md:px-7 md:py-7"
        >
          <div className="max-w-2xl">
            <p className="text-[10px] tracking-[0.22em] text-primary uppercase">
              Tu momento, tu elección
            </p>
            <p className="mt-2 font-display text-2xl md:text-3xl">
              Cuéntame qué quieres regalar.
            </p>
          </div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "florencio" ? (
                <div className="flex max-w-[88%] items-start gap-2">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <p className="border border-border bg-secondary/45 px-4 py-3 text-sm leading-relaxed">
                    {message.text}
                  </p>
                </div>
              ) : (
                <div className="max-w-[82%] bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                  {message.text}
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              Florencio está pensando…
            </div>
          )}

          {recommendations.length > 0 && messages.length > 1 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 px-1 text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                <Sparkles className="h-3 w-3 text-primary" />
                Selección para ti
              </div>
              {recommendations.map((product) => (
                <ProductMiniCard
                  key={product.id}
                  product={product}
                  onAdd={addRecommended}
                />
              ))}
            </div>
          )}

          {products.length === 0 && messages.length > 1 && (
            <div className="border border-border bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
              En cuanto el catálogo esté disponible, aquí aparecerán las piezas que mejor encajen contigo.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-background px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                className="shrink-0 rounded-full border border-border px-3 py-2 text-[9px] tracking-[0.05em] transition hover:border-primary/50"
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
            className="flex items-center gap-2 border border-border bg-secondary/30 p-1.5 focus-within:border-primary/50"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escríbele a Florencio…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              aria-label="Enviar"
              className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground disabled:opacity-40"
              disabled={!input.trim() || thinking}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-2 text-center text-[8px] tracking-[0.1em] text-muted-foreground uppercase">
            <Bot className="mr-1 inline h-3 w-3" />
            Catálogo real de Deluxury
          </p>
        </div>
      </aside>
    </>
  );
}
