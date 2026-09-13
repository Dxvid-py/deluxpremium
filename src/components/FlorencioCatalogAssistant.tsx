import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Check, Send, ShoppingBag, Sparkles } from "lucide-react";
import { categoriesQuery, productsQuery, settingsQuery, type Product } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator } from "@/lib/i18n";
import { parseFlorencioFilters, rankFlorencioProducts, type FlorencioFilters } from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";

const FLORENCIO_IMAGE = "/img/florencio.png";
const STARTERS = ["Romántico y rojo", "Regalo para mamá", "Cumpleaños", "Algo elegante"];

export default function FlorencioCatalogAssistant() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { add } = useStore();
  const [input, setInput] = useState("");
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const [explanation, setExplanation] = useState("Dime qué buscas y seleccionaré piezas del catálogo que tengan sentido para ti.");
  const [loading, setLoading] = useState(false);
  const [usedAI, setUsedAI] = useState(false);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const recommendations = useMemo(() => rankFlorencioProducts(products, categories, filters, 4), [products, categories, filters]);

  const search = async (value = input) => {
    const text = value.trim();
    if (!text || loading) return;
    setInput(text);
    setLoading(true);
    const local = parseFlorencioFilters(text);
    try {
      const result = await askFlorencioAI({ message: text, history: [], currentFilters: filters });
      const merged = {
        recipient: result.filters.recipient ?? local.recipient,
        occasion: result.filters.occasion ?? local.occasion,
        style: result.filters.style ?? local.style,
        color: result.filters.color ?? local.color,
        budgetMax: result.filters.budgetMax ?? local.budgetMax,
        keywords: Array.from(new Set([...(result.keywords ?? []), ...(result.filters.keywords ?? []), ...local.keywords])),
      };
      setFilters(merged);
      setExplanation(result.reply);
      setUsedAI(true);
    } catch {
      setFilters(local);
      setExplanation(local.keywords.length || local.occasion || local.style || local.recipient || local.budgetMax ? "He entendido tus pistas y las crucé con el catálogo real de Deluxury." : "Puedes probar con palabras como romántico, cumpleaños, elegante, rojo o un presupuesto.");
      setUsedAI(false);
    } finally { setLoading(false); }
  };

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-primary/15 bg-[#170f16] px-5 py-7 text-cream-hi shadow-[0_30px_80px_-45px_rgba(0,0,0,.65)] sm:px-8 sm:py-9">
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-gold-soft/15" /><div className="absolute -right-10 -top-14 h-52 w-52 rounded-full border border-cream-hi/10" />
      <div className="relative z-10 grid gap-7 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div><div className="flex items-center gap-3"><span className="florencio-avatar florencio-avatar-sm"><img src={FLORENCIO_IMAGE} alt="" /></span><div><p className="text-[9px] tracking-[.2em] text-gold-soft uppercase">Modo IA Florencio</p><p className="font-display text-2xl">Encuentra algo que tenga sentido.</p></div></div><p className="mt-4 max-w-xl text-sm leading-relaxed text-cream-hi/65">Florencio analiza tus palabras y te muestra productos reales. Si la IA no está disponible, el modo catálogo sigue funcionando.</p><div className="mt-5 flex flex-wrap gap-2">{STARTERS.map((s) => <button key={s} type="button" onClick={() => void search(s)} className="rounded-full border border-cream-hi/12 px-3 py-2 text-[9px] text-cream-hi/65 hover:border-gold-soft/50">{s}</button>)}</div></div>
        <div className="rounded-3xl border border-cream-hi/10 bg-black/20 p-3 backdrop-blur-md"><div className="flex items-center gap-2 rounded-2xl border border-cream-hi/10 bg-black/20 p-2"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} placeholder="Ej. un ramo romántico para mi pareja…" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-cream-hi outline-none placeholder:text-cream-hi/30" /><button type="button" onClick={() => void search()} disabled={!input.trim() || loading} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button></div><div className="mt-3 flex items-start gap-2 px-2 text-xs leading-relaxed text-cream-hi/60"><Bot className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />{loading ? "Florencio está buscando…" : explanation}</div><div className="mt-4 flex items-center gap-2 px-2 text-[8px] tracking-[.14em] text-cream-hi/35 uppercase"><Sparkles className="h-3 w-3 text-gold-soft" />{usedAI ? "IA activa" : "Catálogo inteligente"}</div></div>
      </div>
      {recommendations.length > 0 && <div className="relative z-10 mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{recommendations.map((p) => <CatalogRecommendation key={p.id} product={p} trm={trm} onAdd={add} />)}</div>}
    </section>
  );
}

function CatalogRecommendation({ product, trm, onAdd }: { product: ReturnType<typeof rankFlorencioProducts>[number]; trm: number; onAdd: (p: Product) => void }) {
  const { currency } = useStore();
  const tc = useContentTranslator([product.name]);
  return <article className="overflow-hidden rounded-2xl border border-cream-hi/10 bg-black/20"><img src={product.images?.[0] ?? "/img/prod-01.jpg"} alt={tc(product.name)} className="aspect-[4/3] w-full object-cover" /><div className="p-3.5"><p className="font-display text-lg leading-tight">{tc(product.name)}</p><p className="mt-1 text-xs text-gold-soft">{formatMoney(Number(product.price_cop), currency, trm)}</p><p className="mt-2 min-h-9 text-[10px] leading-relaxed text-cream-hi/55">{product.matchReasons?.[0] ? `Florencio: ${product.matchReasons[0]}.` : "Coincide con lo que estás buscando."}</p><button type="button" onClick={() => onAdd(product)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-[9px] tracking-[.14em] text-primary-foreground uppercase"><ShoppingBag className="h-3.5 w-3.5" /> Agregar al carrito</button></div></article>;
}
