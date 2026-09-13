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
  const [explanation, setExplanation] = useState(
    "Dime qué buscas y seleccionaré piezas del catálogo que tengan sentido para ti.",
  );
  const [loading, setLoading] = useState(false);
  const [usedAI, setUsedAI] = useState(false);
  const [searched, setSearched] = useState(false);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const recommendations = useMemo(
    () => rankFlorencioProducts(products, categories, filters, 5),
    [products, categories, filters],
  );
  const [spotlight, ...rest] = recommendations;

  const search = async (value = input) => {
    const text = value.trim();
    if (!text || loading) return;
    setInput(text);
    setLoading(true);
    setSearched(true);
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
      setExplanation(
        local.keywords.length || local.occasion || local.style || local.recipient || local.budgetMax
          ? "He entendido tus pistas y las crucé con el catálogo real de Deluxury."
          : "Puedes probar con palabras como romántico, cumpleaños, elegante, rojo o un presupuesto.",
      );
      setUsedAI(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-primary/15 bg-[#170f16] px-6 py-9 text-cream-hi shadow-[0_40px_100px_-45px_rgba(0,0,0,.7)] sm:px-10 sm:py-12">
      <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-gold-soft/15" />
      <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border border-cream-hi/10" />

      <div className="relative z-10 grid gap-9 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
        <div>
          <div className="flex items-center gap-4">
            <span className="florencio-avatar florencio-avatar-sm h-14 w-14 shrink-0">
              <img src={FLORENCIO_IMAGE} alt="" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="text-[9px] tracking-[0.22em] text-gold-soft uppercase">Modo IA Florencio</p>
              <p className="font-display text-3xl leading-tight">Encuentra algo que tenga sentido.</p>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-cream-hi/65">
            Florencio analiza tus palabras y te muestra productos reales, con la razón exacta de por qué te lo
            recomienda. Si la IA no está disponible, el modo catálogo sigue funcionando igual de bien.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void search(s)}
                className="rounded-full border border-cream-hi/12 px-3.5 py-2 text-[9px] text-cream-hi/65 transition-colors hover:border-gold-soft/50 hover:text-cream-hi"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-cream-hi/10 bg-black/20 p-4 backdrop-blur-md sm:p-5">
          <div className="flex items-center gap-2 rounded-2xl border border-cream-hi/10 bg-black/20 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void search();
              }}
              placeholder="Ej. un ramo romántico para mi pareja…"
              className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-cream-hi outline-none placeholder:text-cream-hi/30"
            />
            <button
              type="button"
              onClick={() => void search()}
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3.5 flex items-start gap-2.5 px-2 text-sm leading-relaxed text-cream-hi/70">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" />
            {loading ? "Florencio está buscando…" : explanation}
          </div>
          <div className="mt-4 flex items-center gap-2 px-2 text-[8px] tracking-[0.16em] text-cream-hi/35 uppercase">
            <Sparkles className="h-3 w-3 text-gold-soft" />
            {usedAI ? "IA activa" : "Catálogo inteligente"}
          </div>

          {/* Recomendación destacada: la mejor coincidencia, con sus razones */}
          {searched && spotlight && (
            <FlorencioSpotlight product={spotlight} trm={trm} onAdd={add} />
          )}
        </div>
      </div>

      {rest.length > 0 && (
        <div className="relative z-10 mt-8">
          <p className="px-1 text-[9px] tracking-[0.2em] text-cream-hi/40 uppercase">También podría interesarte</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {rest.map((p) => (
              <CatalogRecommendation key={p.id} product={p} trm={trm} onAdd={add} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function FlorencioSpotlight({
  product,
  trm,
  onAdd,
}: {
  product: ReturnType<typeof rankFlorencioProducts>[number];
  trm: number;
  onAdd: (p: Product) => void;
}) {
  const { currency } = useStore();
  const tc = useContentTranslator([product.name]);
  const reasons = product.matchReasons?.length ? product.matchReasons : ["coincide con lo que estás buscando"];

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-gold-soft/25 bg-gradient-to-br from-primary/15 via-black/20 to-black/20">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <img
          src={product.images?.[0] ?? "/img/prod-01.jpg"}
          alt={tc(product.name)}
          className="h-40 w-full shrink-0 rounded-xl object-cover sm:h-auto sm:w-36"
        />
        <div className="flex-1">
          <p className="text-[9px] tracking-[0.2em] text-gold-soft uppercase">Florencio recomienda</p>
          <p className="mt-1.5 font-display text-xl leading-tight">{tc(product.name)}</p>
          <p className="mt-1 text-sm text-gold-soft">{formatMoney(Number(product.price_cop), currency, trm)}</p>

          <ul className="mt-3 space-y-1.5">
            {reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-xs leading-relaxed text-cream-hi/70">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-soft" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onAdd(product)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[9px] tracking-[0.16em] text-primary-foreground uppercase"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
}

function CatalogRecommendation({
  product,
  trm,
  onAdd,
}: {
  product: ReturnType<typeof rankFlorencioProducts>[number];
  trm: number;
  onAdd: (p: Product) => void;
}) {
  const { currency } = useStore();
  const tc = useContentTranslator([product.name]);
  return (
    <article className="overflow-hidden rounded-2xl border border-cream-hi/10 bg-black/20">
      <img
        src={product.images?.[0] ?? "/img/prod-01.jpg"}
        alt={tc(product.name)}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="p-3.5">
        <p className="font-display text-lg leading-tight">{tc(product.name)}</p>
        <p className="mt-1 text-xs text-gold-soft">{formatMoney(Number(product.price_cop), currency, trm)}</p>
        <p className="mt-2 min-h-9 text-[10px] leading-relaxed text-cream-hi/55">
          {product.matchReasons?.[0] ? `Florencio: ${product.matchReasons[0]}.` : "Coincide con lo que estás buscando."}
        </p>
        <button
          type="button"
          onClick={() => onAdd(product)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-[9px] tracking-[0.14em] text-primary-foreground uppercase"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Agregar al carrito
        </button>
      </div>
    </article>
  );
}
