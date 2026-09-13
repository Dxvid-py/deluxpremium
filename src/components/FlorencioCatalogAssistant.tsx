import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronRight, Gift, Heart, HelpCircle, MessageCircle, Package, Send, ShoppingBag, Sparkles, Star } from "lucide-react";
import { categoriesQuery, productsQuery, settingsQuery, type Product } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator } from "@/lib/i18n";
import { parseFlorencioFilters, rankFlorencioProducts, type FlorencioFilters } from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";

const STARTERS = ["Quiero un ramo para mi pareja", "Regalo para mamá", "Algo elegante", "Máximo $200.000"];
type Message = { id: number; role: "florencio" | "user"; text: string };

type RankedProduct = Product & { matchReasons?: string[] };

function Avatar({ src, size = "md" }: { src: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-9 w-9" : "h-14 w-14";
  return <div className={`${cls} shrink-0 overflow-hidden rounded-full border border-primary/20 bg-[#ead7ba] shadow-sm`}><img src={src} alt="Florencio" className="h-full w-full object-cover object-[50%_18%]" /></div>;
}

function Recommendation({ product, profile, onAdd }: { product: RankedProduct; profile: string; onAdd: (p: Product) => void }) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number(settings?.trm_cop_usd ?? 3950);
  const reason = product.matchReasons?.[0] ?? "Una pieza que encaja con el estilo de Deluxury.";
  return <article className="group rounded-2xl border border-border/80 bg-white/90 p-3 shadow-[0_16px_45px_-30px_rgba(72,43,24,.3)] transition hover:-translate-y-0.5 hover:border-primary/30">
    <div className="overflow-hidden rounded-xl bg-[#f0e5d7]"><img src={product.images?.[0] ?? "/img/prod-01.jpg"} alt={tc(product.name)} className="h-32 w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div>
    <div className="px-1 pt-3">
      <div className="flex items-center gap-2"><Avatar src={profile} size="sm" /><span className="text-[8px] tracking-[.14em] text-primary uppercase">Florencio recomienda</span></div>
      <Link to="/producto/$slug" params={{ slug: product.slug }} className="mt-2 block font-display text-xl leading-tight hover:text-primary">{tc(product.name)}</Link>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reason}</p>
      <div className="mt-3 flex items-center justify-between gap-2"><span className="text-sm font-medium text-primary">{formatMoney(Number(product.price_cop), currency, trm)}</span><button type="button" onClick={() => onAdd(product)} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-2 text-[8px] tracking-[.12em] text-background uppercase hover:bg-primary hover:text-primary-foreground"><ShoppingBag className="h-3 w-3" /> Añadir</button></div>
    </div>
  </article>;
}

export default function FlorencioCatalogAssistant() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { add } = useStore();
  const [input, setInput] = useState("");
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "florencio", text: "¡Hola! Soy Florencio. Cuéntame qué quieres regalar y te ayudaré a encontrar una pieza que tenga sentido para ese momento." },
    { id: 2, role: "florencio", text: "Puedes contarme para quién es, qué ocasión tienes, qué estilo imaginas o cuánto quieres invertir." },
  ]);
  const nextId = useRef(3);
  const scrollRef = useRef<HTMLDivElement>(null);
  const profile = settings?.florencio_profile_image_url || settings?.florencio_intro_image_url || "/img/florencio.png";
  const fallback = useMemo(() => products.filter(p => p.is_active).sort((a, b) => Number(b.is_featured) - Number(a.is_featured)).slice(0, 4), [products]);
  const ranked = useMemo(() => rankFlorencioProducts(products, categories, filters, 4) as RankedProduct[], [products, categories, filters]);
  const recommendations = ranked.length ? ranked : fallback;

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const send = async (raw = input) => {
    const text = raw.trim(); if (!text || loading) return;
    setMessages(p => [...p, { id: nextId.current++, role: "user", text }]); setInput(""); setLoading(true); setSearched(true);
    const local = parseFlorencioFilters(text);
    try {
      const result = await askFlorencioAI({ message: text, history: messages.slice(-8), currentFilters: filters });
      const merged: FlorencioFilters = {
        recipient: result.filters.recipient ?? local.recipient ?? filters.recipient,
        occasion: result.filters.occasion ?? local.occasion ?? filters.occasion,
        style: result.filters.style ?? local.style ?? filters.style,
        color: result.filters.color ?? local.color ?? filters.color,
        budgetMax: result.filters.budgetMax ?? local.budgetMax ?? filters.budgetMax,
        keywords: Array.from(new Set([...filters.keywords, ...local.keywords, ...(result.keywords ?? []), ...(result.filters.keywords ?? [])])).slice(0, 20),
      };
      setFilters(merged); setMessages(p => [...p, { id: nextId.current++, role: "florencio", text: result.reply }]);
    } catch {
      setFilters(p => ({ ...p, ...local, keywords: Array.from(new Set([...p.keywords, ...local.keywords])).slice(0, 20) }));
      setMessages(p => [...p, { id: nextId.current++, role: "florencio", text: "Perfecto. Entendí la idea y ya la estoy cruzando con las piezas disponibles de Deluxury." }]);
    } finally { setLoading(false); }
  };

  const addProduct = (product: Product) => {
    add(product);
    setMessages(p => [...p, { id: nextId.current++, role: "florencio", text: `Listo. Añadí ${product.name} a tu carrito. Puedes seguir buscando conmigo o continuar con tu compra.` }]);
  };

  return <section className="relative overflow-hidden rounded-[32px] border border-primary/15 bg-[linear-gradient(140deg,#fffdf9_0%,#f7eee3_60%,#f1e1d0_100%)] shadow-[0_45px_100px_-55px_rgba(69,39,22,.55)]">
    <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(142,108,69,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(142,108,69,.04)_1px,transparent_1px)] [background-size:38px_38px]" />
    <div className="relative grid min-h-[760px] lg:grid-cols-[230px_minmax(0,1fr)_330px]">
      <aside className="border-b border-border/80 bg-white/45 p-5 backdrop-blur-xl lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3"><Avatar src={profile} /><div><p className="font-display text-2xl leading-none">Florencio</p><p className="mt-1 text-[9px] tracking-[.15em] text-muted-foreground uppercase">Asistente floral</p><span className="mt-1.5 flex items-center gap-1.5 text-[9px] text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />En línea</span></div></div>
        <div className="mt-8 space-y-1.5">
          {[[MessageCircle,"Conversación",true],[Sparkles,"Recomendaciones",false],[Heart,"Mis favoritos",false],[Package,"Mi pedido",false],[HelpCircle,"Ayuda",false]].map(([Icon,label,active]) => { const I = Icon as typeof MessageCircle; return <div key={String(label)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? "bg-primary/10" : "text-muted-foreground"}`}><I className={`h-4 w-4 ${active ? "text-primary" : ""}`} /><span>{String(label)}</span>{active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary" />}</div>; })}
        </div>
        <div className="mt-12 rounded-2xl border border-primary/10 bg-white/65 p-4"><div className="flex items-center gap-2 text-[8px] tracking-[.18em] text-primary uppercase"><Star className="h-3 w-3" />Siempre contigo</div><p className="mt-3 font-display text-lg leading-tight">“Las flores también hablan cuando las elegimos con intención.”</p></div>
      </aside>

      <div className="flex min-h-[700px] min-w-0 flex-col bg-white/55 backdrop-blur-xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border/80 px-5 py-4 md:px-7"><div className="flex items-center gap-3"><Avatar src={profile} size="sm" /><div><div className="flex items-center gap-2"><p className="font-display text-xl">Florencio</p><span className="text-[8px] tracking-[.14em] text-primary uppercase">IA floral</span></div><p className="mt-0.5 text-[9px] text-muted-foreground">Personalización · catálogo Deluxury</p></div></div><div className="hidden items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-[8px] tracking-[.12em] text-muted-foreground uppercase sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Disponible</div></header>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7"><div className="mx-auto max-w-2xl space-y-5">
          <div className="rounded-2xl border border-primary/10 bg-primary/[.035] px-4 py-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Cuéntame lo que tienes en mente.</span> Habla con naturalidad; Florencio se encarga de traducirlo a una selección.</div>
          {messages.map(m => m.role === "florencio" ? <div key={m.id} className="flex items-start gap-3"><Avatar src={profile} size="sm" /><div className="max-w-[88%]"><div className="rounded-2xl rounded-tl-md border border-border/80 bg-[#f6eee5] px-4 py-3.5 text-sm leading-relaxed shadow-sm">{m.text}</div></div></div> : <div key={m.id} className="flex justify-end"><div className="max-w-[82%] rounded-2xl rounded-tr-md bg-primary px-4 py-3.5 text-sm leading-relaxed text-primary-foreground shadow-[0_14px_30px_-22px_rgba(110,53,55,.55)]">{m.text}</div></div>)}
          {loading && <div className="flex items-start gap-3"><Avatar src={profile} size="sm" /><div className="rounded-2xl rounded-tl-md border border-border/80 bg-[#f6eee5] px-4 py-3.5"><div className="flex gap-1"><span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-.2s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-.1s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-primary" /></div></div></div>}
        </div></div>
        <footer className="shrink-0 border-t border-border/80 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6"><div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{STARTERS.map(s => <button key={s} type="button" onClick={() => void send(s)} className="shrink-0 rounded-full border border-border bg-background/80 px-3.5 py-2 text-[9px] transition hover:border-primary/45 hover:text-primary">{s}</button>)}</div><form onSubmit={e => { e.preventDefault(); void send(); }} className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-sm focus-within:border-primary/50"><MessageCircle className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" /><input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe tu mensaje…" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none" /><button type="submit" disabled={!input.trim() || loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button></form></footer>
      </div>

      <aside className="flex min-w-0 flex-col border-t border-border/80 bg-[#fbf7f1]/85 p-4 backdrop-blur-xl lg:border-l lg:border-t-0 lg:p-5">
        <div><div className="flex items-center gap-2 text-[9px] tracking-[.18em] text-primary uppercase"><Sparkles className="h-3.5 w-3.5" />Selección de Florencio</div><h3 className="mt-2 font-display text-2xl leading-tight">Recomendaciones</h3><p className="mt-1 text-xs text-muted-foreground">{searched ? "Basadas en lo que acabas de contarme." : "Un punto de partida para conversar."}</p></div>
        <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">{recommendations.length ? recommendations.map(p => <Recommendation key={p.id} product={p as RankedProduct} profile={profile} onAdd={addProduct} />) : <div className="rounded-2xl border border-dashed border-primary/20 bg-white/60 p-5"><Gift className="h-5 w-5 text-primary" /><p className="mt-4 font-display text-xl">Estoy listo para recomendar.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Cuando haya productos activos en el catálogo, aparecerán aquí.</p></div>}</div>
        <div className="mt-4 rounded-2xl border border-primary/10 bg-white/70 p-4"><p className="text-[9px] tracking-[.15em] text-primary uppercase">¿No encuentras lo que buscas?</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Cuéntame qué tienes en mente y ajustamos la selección.</p><button type="button" onClick={() => void send("Quiero una recomendación diferente.")} className="mt-3 inline-flex items-center gap-1.5 text-[9px] tracking-[.14em] uppercase hover:text-primary">Seguir buscando <ArrowRight className="h-3 w-3" /></button></div>
      </aside>
    </div>
  </section>;
}
