import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Check, Heart, Instagram, MessageCircle, Sparkles, Truck } from "lucide-react";
import { categoriesQuery, productsQuery, settingsQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import ProductCard from "@/components/ProductCard";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      { name: "description", content: "Conoce a Florencio, el asistente virtual y servicio de entrega especial de Deluxury." },
    ],
  }),
  component: FlorencioPage,
});

type FlorencioMedia = { type: "image" | "reel"; url: string; caption?: string; link?: string };

function parseMedia(raw?: string): FlorencioMedia[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FlorencioMedia => {
      if (!item || typeof item !== "object") return false;
      const x = item as Record<string, unknown>;
      return (x.type === "image" || x.type === "reel") && typeof x.url === "string";
    });
  } catch {
    return [];
  }
}

function FlorencioPage() {
  useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  useQuery(categoriesQuery);

  const media = parseMedia(settings?.["florencio_media_json"]);
  const enabled = settings?.["florencio_delivery_enabled"] !== "false";
  const introImage = settings?.["florencio_intro_image_url"] || "/img/florencio.png";
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";
  const serviceCopy = settings?.["florencio_delivery_description"] || "Un detalle especial para quienes quieren que Florencio sea parte de la sorpresa y acompañe personalmente la entrega.";
  const suggested = products.filter((p) => p.is_active).filter((p) => p.is_featured).slice(0, 3);

  return (
    <div className="overflow-hidden pt-24 md:pt-28">
      <section className="relative border-b border-border">
        <div className="diffused-light pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-24">
          <div className="order-2 md:order-1">
            <p className="eyebrow">El aliado de Deluxury</p>
            <h1 className="mt-4 max-w-2xl font-display text-5xl leading-[0.95] md:text-7xl">Conoce a <span className="text-lux-gradient italic">Florencio.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">Florencio es la mascota, asistente virtual y anfitrión de una experiencia de regalo pensada para sentirse más cercana, útil y especial.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => window.dispatchEvent(new Event("florencio:open-chat"))} className="press inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"><Bot className="h-4 w-4" /> Hablar con Florencio</button>
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero conocer el servicio de entrega especial con Florencio.")}`} target="_blank" rel="noreferrer" className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-7 py-4 text-[11px] tracking-[0.24em] uppercase hover:border-primary hover:text-primary"><MessageCircle className="h-4 w-4" /> Consultar por WhatsApp</a>
            </div>
          </div>

          <div className="order-1 mx-auto w-full max-w-md md:order-2">
            <div className="relative overflow-hidden rounded-[42%_42%_10%_10%] border border-primary/20 bg-secondary/35 p-3 shadow-[0_35px_80px_-45px_rgba(0,0,0,0.65)]">
              <div className="overflow-hidden rounded-[40%_40%_8%_8%] bg-background">
                <img src={introImage} alt="Florencio de Deluxury" className="aspect-[4/5] h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">Su lado inteligente</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">Una ayuda que <span className="text-lux-gradient italic">sí conoce Deluxury.</span></h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">Florencio puede ayudarte a descubrir productos, entender tu presupuesto, encontrar un detalle según la ocasión y llevarte directamente al producto o al carrito. Cuando hay IA disponible, entiende mejor el lenguaje natural; cuando no, conserva un modo de recomendación local.</p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {[
              [Sparkles, "Recomendaciones", "Encuentra piezas del catálogo según persona, ocasión, estilo y presupuesto."],
              [Heart, "Asesoría", "Te hace preguntas simples cuando todavía no sabes qué quieres regalar."],
              [Bot, "IA con límites", "La IA interpreta la intención; los productos y precios salen del catálogo real."],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Sparkles;
              return <article key={String(title)} className="bg-background p-7 md:p-8"><I className="h-5 w-5 text-primary" /><h3 className="mt-5 font-display text-2xl">{String(title)}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{String(copy)}</p></article>;
            })}
          </div>
        </div>
      </section>

      {enabled && (
        <section className="border-b border-border py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="eyebrow">Servicio extra</p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">Entrega especial con <span className="text-lux-gradient italic">Florencio.</span></h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">{serviceCopy}</p>
                <div className="mt-7 flex items-center gap-3"><Truck className="h-5 w-5 text-primary" /><span className="text-sm">Tarifa {price > 0 ? <strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(price)}</strong> : <strong>configurable desde el panel</strong>}</span></div>
                <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quisiera agregar la entrega especial con Florencio a mi pedido.")}`} target="_blank" rel="noreferrer" className="press mt-7 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-[11px] tracking-[0.24em] text-cream-hi uppercase hover:bg-primary"><MessageCircle className="h-4 w-4" /> Preguntar por disponibilidad</a>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {["Acompañamiento de la sorpresa", "Coordinación por WhatsApp", "Servicio opcional de Deluxury"].map((item) => <div key={item} className="surface-glass rounded-2xl p-6"><Check className="h-4 w-4 text-primary" /><p className="mt-5 font-display text-xl">{item}</p></div>)}
              </div>
            </div>
          </div>
        </section>
      )}

      {media.length > 0 && (
        <section className="border-b border-border py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">Florencio detrás de escena</p><h2 className="mt-4 font-display text-4xl md:text-5xl">Momentos de <span className="text-lux-gradient italic">Florencio</span></h2></div><Instagram className="h-5 w-5 text-primary" /></div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {media.map((item, index) => (
                <a key={`${item.url}-${index}`} href={item.link || item.url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/30">
                  {item.type === "image" ? <img src={item.url} alt={item.caption || "Florencio"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_50%_30%,var(--rose-glow),transparent_65%)] p-5"><div className="flex h-full flex-col justify-end"><p className="text-[10px] tracking-[0.22em] text-primary uppercase">Reel de Instagram</p><p className="mt-2 font-display text-2xl">{item.caption || "Ver momento de Florencio"}</p><ArrowRight className="mt-5 h-4 w-4 text-primary" /></div></div>}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {suggested.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8"><p className="eyebrow">Florencio recomienda</p><h2 className="mt-4 font-display text-4xl md:text-5xl">Algunas piezas que <span className="text-lux-gradient italic">le encantan.</span></h2><div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 lg:grid-cols-3">{suggested.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div></div>
        </section>
      )}
    </div>
  );
}
