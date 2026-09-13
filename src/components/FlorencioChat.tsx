import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Send, ShoppingBag, Sparkles, X } from "lucide-react";
import { productsQuery, categoriesQuery, settingsQuery, type Product } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator } from "@/lib/i18n";
import { describeFlorencioFilters, parseFlorencioFilters, rankFlorencioProducts, type FlorencioFilters } from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";

const FLORENCIO_IMAGE = "/img/florencio.png";
const QUICK_PROMPTS = ["Regalo para mi pareja", "Algo para cumpleaños", "Quiero algo elegante", "Máximo $200.000"];

type Message = { id: number; role: "florencio" | "user"; text: string };

function Avatar({ small = false }: { small?: boolean }) {
  return <span className={`florencio-avatar ${small ? "florencio-avatar-sm" : ""}`} aria-hidden="true"><img src={FLORENCIO_IMAGE} alt="" /></span>;
}

function mergeFilters(current: FlorencioFilters, parsed: FlorencioFilters): FlorencioFilters {
  return {
    recipient: parsed.recipient ?? current.recipient,
    occasion: parsed.occasion ?? current.occasion,
    style: parsed.style ?? current.style,
    color: parsed.color ?? current.color,
    budgetMax: parsed.budgetMax ?? current.budgetMax,
    keywords: Array.from(new Set([...current.keywords, ...parsed.keywords])).slice(0, 16),
  };
}

function localReply(filters: FlorencioFilters) {
  const parts = describeFlorencioFilters(filters);
  return parts.length
    ? `Perfecto. ${parts.join(" · ")}. Voy a cruzarlo con el catálogo real de Deluxury y te mostraré las opciones que mejor encajan.`
    : "Claro. Cuéntame para quién es, qué ocasión tienes, qué estilo buscas o cuánto quieres invertir y te recomiendo opciones del catálogo real.";
}

function RecommendationCard({ product, onAdd }: { product: ReturnType<typeof rankFlorencioProducts>[number]; onAdd: (p: Product) => void }) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  return (
    <article className="overflow-hidden rounded-2xl border border-cream-hi/10 bg-black/25 backdrop-blur-md">
      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_1fr] sm:p-3.5">
        <img src={product.images?.[0] ?? "/img/prod-01.jpg"} alt={tc(product.name)} className="h-[105px] w-full rounded-xl object-cover sm:h-28" />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-xl leading-tight text-cream-hi">{tc(product.name)}</p>
            <span className="shrink-0 text-xs text-gold-soft">{formatMoney(Number(product.price_cop), currency, trm)}</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-cream-hi/60">{product.matchReasons?.[0] ? `Lo recomiendo porque ${product.matchReasons[0]}.` : "Es una de las piezas que mejor coincide con lo que buscas."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/producto/$slug" params={{ slug: product.slug }} className="inline-flex items-center gap-1 rounded-full border border-cream-hi/15 px-3 py-2 text-[9px] tracking-[0.14em] text-cream-hi/75 uppercase hover:border-gold-soft/60">Ver producto <ArrowRight className="h-3 w-3" /></Link>
            <button type="button" onClick={() => onAdd(product)} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-[9px] tracking-[0.14em] text-primary-foreground uppercase"><ShoppingBag className="h-3 w-3" /> Agregar</button>
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
  const recommendations = useMemo(() => rankFlorencioProducts(products, categories, filters, 3), [products, categories, filters]);

  useEffect(() => {
    setMessages([
      { id: nextId.current++, role: "florencio", text: "Hola, soy Florencio. ¿Qué detalle estás buscando?" },
      { id: nextId.current++, role: "florencio", text: "Puedes decirme para quién es, la ocasión, el estilo, el color o tu presupuesto." },
    ]);
  }, []);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, thinking]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    const history = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text }]);
    setInput("");
    setThinking(true);
    try {
      const result = await askFlorencioAI({ message: text, history, currentFilters: filters });
      const local = parseFlorencioFilters(text);
      const merged = mergeFilters(filters, {
        recipient: result.filters.recipient ?? local.recipient,
        occasion: result.filters.occasion ?? local.occasion,
        style: result.filters.style ?? local.style,
        color: result.filters.color ?? local.color,
        budgetMax: result.filters.budgetMax ?? local.budgetMax,
        keywords: Array.from(new Set([...(result.keywords ?? []), ...(result.filters.keywords ?? [])])),
      });
      setFilters(merged);
      setMode("ia");
      setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: result.reply }]);
    } catch (error) {
      const merged = mergeFilters(filters, parseFlorencioFilters(text));
      setFilters(merged);
      setMode("catalogo");
      setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: localReply(merged) }]);
      console.warn("Florencio AI no disponible; usando modo catálogo.", error);
    } finally { setThinking(false); }
  };

  const useCatalog = () => {
    const text = input.trim() || "Quiero una recomendación";
    const merged = mergeFilters(filters, parseFlorencioFilters(text));
    setFilters(merged);
    setMode("catalogo");
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text }, { id: nextId.current++, role: "florencio", text: localReply(merged) }]);
    setInput("");
  };

  const addRecommended = (product: Product) => {
    add(product);
    setMessages((prev) => [...prev, { id: nextId.current++, role: "florencio", text: `Listo. Añadí ${product.name} a tu carrito.` }]);
    window.dispatchEvent(new CustomEvent("florencio:product-selected", { detail: { name: product.name } }));
  };

  return (
    <div className={embedded ? "grid min-h-[650px] gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]" : "flex h-full flex-col"}>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-cream-hi/12 bg-[#130d12]/55 shadow-[0_30px_90px_-40px_rgba(0,0,0,.9)] backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-cream-hi/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3"><Avatar small /><div><p className="font-display text-xl text-cream-hi">Florencio</p><p className="text-[8px] tracking-[.2em] text-cream-hi/45 uppercase">Asistente floral · {mode === "ia" ? "IA activa" : "modo catálogo"}</p></div></div>
          <span className="inline-flex items-center gap-2 text-[8px] tracking-[.16em] text-cream-hi/45 uppercase"><span className="h-1.5 w-1.5 rounded-full bg-gold-soft" /> online</span>
        </header>
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
          {messages.map((message) => message.role === "florencio" ? (
            <div key={message.id} className="flex max-w-[90%] items-start gap-3"><Avatar small /><div className="rounded-2xl rounded-tl-md bg-cream-hi/[.07] px-4 py-3 text-sm leading-relaxed text-cream-hi/88">{message.text}</div></div>
          ) : <div key={message.id} className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">{message.text}</div>)}
          {thinking && <div className="flex items-center gap-3"><Avatar small /><div className="florencio-thinking"><span /><span /><span /></div><span className="text-xs text-cream-hi/45">Florencio está pensando…</span></div>}
          {recommendations.length > 0 && messages.length > 2 && <div className="space-y-3 pt-2"><div className="flex items-center gap-2 text-[9px] tracking-[.18em] text-cream-hi/45 uppercase"><Sparkles className="h-3.5 w-3.5 text-gold-soft" /> Recomendaciones de Florencio</div>{recommendations.map((p) => <RecommendationCard key={p.id} product={p} onAdd={addRecommended} />)}</div>}
        </div>
        <div className="border-t border-cream-hi/10 px-4 py-4 sm:px-5">
          <div className="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{QUICK_PROMPTS.map((p) => <button key={p} type="button" onClick={() => void send(p)} disabled={thinking} className="shrink-0 rounded-full border border-cream-hi/10 px-3 py-2 text-[9px] text-cream-hi/65 hover:border-gold-soft/50 disabled:opacity-40">{p}</button>)}</div>
          <div className="flex items-center gap-2 rounded-2xl border border-cream-hi/12 bg-black/20 p-2 focus-within:border-gold-soft/50"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe lo que necesitas…" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-cream-hi outline-none placeholder:text-cream-hi/35" /><button type="button" onClick={() => void send(input)} disabled={!input.trim() || thinking} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
          <div className="mt-2 flex items-center justify-between px-1"><span className="text-[8px] tracking-[.12em] text-cream-hi/35 uppercase">Productos reales del catálogo</span>{mode === "ia" && <button type="button" onClick={useCatalog} className="text-[8px] tracking-[.12em] text-gold-soft uppercase">Usar modo catálogo</button>}</div>
        </div>
      </div>

      {embedded && <div className="relative flex min-h-[520px] items-end justify-center overflow-hidden lg:min-h-0">
        <div className="pointer-events-none absolute bottom-8 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full border border-gold-soft/20 opacity-70" />
        <div className="pointer-events-none absolute bottom-14 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full border border-cream-hi/10 opacity-60" />
        <div className="relative z-10 flex h-full w-full items-end justify-center"><img src={FLORENCIO_IMAGE} alt="Florencio, asistente de Deluxury" className="max-h-[620px] w-auto max-w-[92%] object-contain object-bottom drop-shadow-[0_25px_50px_rgba(0,0,0,.45)]" /></div>
        <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-cream-hi/12 bg-black/25 px-4 py-2 text-[8px] tracking-[.18em] text-cream-hi/55 uppercase backdrop-blur-md">Recomienda · explica · acompaña</div>
      </div>}
    </div>
  );
}

export default function FlorencioChat({ embedded = false }: { embedded?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("florencio:open-chat", openChat);
    return () => window.removeEventListener("florencio:open-chat", openChat);
  }, []);
  if (embedded) return <ChatCore embedded />;
  return <>{open && <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />}{<aside className={`fixed inset-x-2 bottom-2 z-[80] h-[min(760px,calc(100dvh-16px))] overflow-hidden rounded-[26px] border border-primary/20 bg-background/98 shadow-2xl transition-all duration-300 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[460px] ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"}`}><div className="flex h-full flex-col"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-3"><Avatar /><div><p className="font-display text-xl">Florencio</p><p className="text-[9px] tracking-[.16em] text-muted-foreground uppercase">Asistente Deluxury</p></div></div><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-border p-2"><X className="h-4 w-4" /></button></div><div className="min-h-0 flex-1 p-2"><div className="h-full overflow-hidden rounded-2xl bg-[#170f16]"><ChatCore /></div></div></div></aside>}</>;
}
