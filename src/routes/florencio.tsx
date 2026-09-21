import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bot, Check, Heart, Instagram, MessageCircle, Sparkles, Truck } from "lucide-react";
import { categoriesQuery, productsQuery, settingsQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import ProductCard from "@/components/ProductCard";
import FlorencioChat from "@/components/FlorencioChat";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      { name: "description", content: "Florencio, el asistente floral virtual de Deluxury." },
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
  } catch { return []; }
}

function FlorencioPage() {
  const { lang } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  useQuery(categoriesQuery);
  const media = parseMedia(settings?.["florencio_media_json"]);
  const enabled = settings?.["florencio_delivery_enabled"] !== "false";
  const introImage = settings?.["florencio_intro_image_url"] || "/img/florencio.png";
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";
  const serviceCopy = settings?.["florencio_delivery_description"] || (lang === "en" ? "A special delivery experience for customers who want Florencio to be part of the surprise." : "Un detalle especial para quienes quieren que Florencio sea parte de la sorpresa.");
  const suggested = products.filter((p) => p.is_active).filter((p) => p.is_featured).slice(0, 3);

  const copy = lang === "en" ? {
    eyebrow: "Deluxury's floral host", title: "Meet Florencio.", intro: "Florencio is Deluxury's mascot and virtual assistant, designed to make your gift search feel more personal, useful and special.", chat: "Talk to Florencio", wa: "Ask on WhatsApp", how: "How Florencio helps", step1: "Tell him what you need", step1b: "Occasion, person, style or budget.", step2: "He narrows the idea", step2b: "He keeps your preferences in context.", step3: "He checks real products", step3b: "Recommendations come from the live Deluxury catalog.", special: "A special delivery", specialOn: "When enabled, this service adds Florencio to the delivery experience.", price: "Service price", gallery: "Florencio in the wild", gallerySub: "Photos and reels curated by Deluxury.", picks: "Selected by Deluxury", picksSub: "A small set of real creations to explore.", learn: "Explore", empty: "No media has been published yet.", openWA: "Ask about this service",
  } : {
    eyebrow: "El anfitrión floral de Deluxury", title: "Conoce a Florencio.", intro: "Florencio es la mascota y asistente virtual de Deluxury, diseñado para hacer que buscar un regalo se sienta más cercano, útil y especial.", chat: "Hablar con Florencio", wa: "Consultar por WhatsApp", how: "Cómo te ayuda Florencio", step1: "Cuéntale qué necesitas", step1b: "Ocasión, persona, estilo o presupuesto.", step2: "Afina la idea", step2b: "Conserva tus preferencias en contexto.", step3: "Cruza con productos reales", step3b: "Las recomendaciones salen del catálogo real de Deluxury.", special: "Una entrega especial", specialOn: "Cuando está habilitado, este servicio suma a Florencio a la experiencia de entrega.", price: "Precio del servicio", gallery: "Florencio en la experiencia", gallerySub: "Fotos y reels seleccionados por Deluxury.", picks: "Selección de Deluxury", picksSub: "Algunas creaciones reales para explorar.", learn: "Explorar", empty: "Todavía no se han publicado medios.", openWA: "Consultar este servicio",
  };

  return (
    <div className="overflow-hidden pt-24 md:pt-28">
      <section className="relative border-b border-border">
        <div className="diffused-light pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-24">
          <div className="order-2 md:order-1">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="mt-4 max-w-2xl font-display text-5xl leading-[0.95] md:text-7xl">{copy.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{copy.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => window.dispatchEvent(new Event("florencio:open-chat"))} className="press inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"><Bot className="h-4 w-4" /> {copy.chat}</button>
              <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(lang === "en" ? "Hi, I'd like to learn more about Florencio's special delivery service." : "Hola, quiero conocer el servicio de entrega especial con Florencio.")}`} target="_blank" rel="noreferrer" className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-7 py-4 text-[11px] tracking-[0.24em] uppercase hover:border-primary hover:text-primary"><MessageCircle className="h-4 w-4" /> {copy.wa}</a>
            </div>
          </div>
          <div className="order-1 mx-auto w-full max-w-md md:order-2">
            <div className="relative overflow-hidden rounded-[42%_42%_10%_10%] border border-primary/20 bg-secondary/35 p-3 shadow-[0_35px_80px_-45px_rgba(0,0,0,0.65)]"><div className="overflow-hidden rounded-[40%_40%_8%_8%] bg-background"><img src={introImage} alt="Florencio" className="h-[480px] w-full object-cover object-center" /></div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <div className="mb-10 max-w-2xl"><p className="eyebrow">{copy.how}</p><div className="mt-4 h-px w-16 bg-primary/40" /></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[{n:"01", icon:Heart, title:copy.step1, body:copy.step1b},{n:"02", icon:Sparkles, title:copy.step2, body:copy.step2b},{n:"03", icon:Check, title:copy.step3, body:copy.step3b}].map(({n,icon:Icon,title,body})=><article key={n} className="rounded-3xl border border-border bg-white/55 p-6 md:p-8"><div className="flex items-center justify-between"><span className="text-[9px] tracking-[.2em] text-primary">{n}</span><Icon className="h-4 w-4 text-primary" /></div><h2 className="mt-10 font-display text-3xl">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p></article>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 md:pb-24"><FlorencioChat embedded /></section>

      {enabled && (
        <section className="relative border-y border-border bg-secondary/20"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[1fr_auto] md:items-center md:px-8 md:py-20"><div><p className="eyebrow">{copy.special}</p><h2 className="mt-4 max-w-2xl font-display text-4xl md:text-6xl">{copy.specialOn}</h2><p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{serviceCopy}</p></div><div className="rounded-3xl border border-primary/20 bg-white/70 p-6 text-center"><Truck className="mx-auto h-5 w-5 text-primary" /><p className="mt-4 text-[9px] tracking-[.18em] text-muted-foreground uppercase">{copy.price}</p><p className="mt-2 font-display text-3xl">{price > 0 ? `$${price.toLocaleString("es-CO")}` : "—"}</p><a className="mt-5 inline-flex rounded-full bg-primary px-5 py-3 text-[10px] tracking-[.14em] text-primary-foreground uppercase" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(lang === "en" ? "Hi, I'd like to ask about Florencio's special delivery service." : "Hola, quiero consultar el servicio de entrega especial con Florencio.")}`} target="_blank" rel="noreferrer">{copy.openWA}</a></div></div></section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><div className="mb-8 flex items-end justify-between gap-6"><div><p className="eyebrow">{copy.gallery}</p><h2 className="mt-3 font-display text-4xl md:text-6xl">{copy.gallerySub}</h2></div><Instagram className="hidden h-5 w-5 text-primary sm:block" /></div>{media.length === 0 ? <div className="rounded-3xl border border-border bg-white/55 p-8 text-sm text-muted-foreground">{copy.empty}</div> : <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">{media.map((item, i) => <a key={`${item.url}-${i}`} href={item.link || item.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-3xl border border-border bg-white"><div className="aspect-[4/5] overflow-hidden bg-secondary/45">{item.type === "reel" ? <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <img src={item.url} alt={item.caption || "Florencio"} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}</div>{item.caption && <div className="p-4 text-xs leading-relaxed text-muted-foreground">{item.caption}</div>}</a>)}</div>}</section>

      <section className="border-t border-border"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><div className="mb-8"><p className="eyebrow">{copy.picks}</p><h2 className="mt-3 font-display text-4xl md:text-6xl">{copy.picksSub}</h2></div><div className="grid grid-cols-2 gap-4 md:grid-cols-3">{suggested.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section>
    </div>
  );
}
