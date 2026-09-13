import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Truck,
  WandSparkles,
} from "lucide-react";
import { productsQuery, settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      {
        name: "description",
        content:
          "Conoce a Florencio, el asistente inteligente y servicio de entrega especial de Deluxury.",
      },
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

const defaultCopy =
  "Un detalle especial para quienes quieren que Florencio sea parte de la sorpresa y acompañe personalmente la entrega.";

function FlorencioPage() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  const { currency } = useStore();
  const [signal, setSignal] = useState(82);

  const introImage = settings?.["florencio_intro_image_url"] || "/img/florencio.png";
  const enabled = settings?.["florencio_delivery_enabled"] !== "false";
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";
  const serviceCopy = settings?.["florencio_delivery_description"] || defaultCopy;
  const configuredVideo = settings?.["florencio_background_video_url"]?.trim();
  const backgroundVideo =
    configuredVideo && !configuredVideo.endsWith("florencio-background.mp4")
      ? configuredVideo
      : "/video/florencio-section/florencio-ia.mp4";
  const media = parseMedia(settings?.["florencio_media_json"]);
  const suggested = useMemo(
    () => products.filter((p) => p.is_active && Number(p.stock) !== 0).slice(0, 3),
    [products],
  );
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);

  useEffect(() => {
    const id = window.setInterval(() => setSignal((n) => (n >= 96 ? 74 : n + 4)), 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="overflow-x-clip pt-24 md:pt-28">
      <section className="florencio-ai-stage relative isolate min-h-[760px] overflow-hidden bg-[#170f16] text-cream-hi md:min-h-[840px]">
        <video
          className="absolute inset-0 h-full w-full object-cover object-[center_58%] opacity-72"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/video/florencio-section/florencio-ai-poster.jpg"
          src={backgroundVideo}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(23,15,22,.96)_0%,rgba(23,15,22,.82)_34%,rgba(23,15,22,.34)_66%,rgba(23,15,22,.58)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_44%,rgba(190,145,67,.18),transparent_25%),radial-gradient(circle_at_50%_58%,rgba(99,35,55,.24),transparent_43%)]" />
        <div className="florencio-tech-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid min-h-[760px] max-w-7xl items-center gap-10 px-5 py-14 md:min-h-[840px] md:grid-cols-[1fr_0.9fr] md:px-8 md:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-cream-hi/15 bg-black/20 px-3.5 py-2 text-[9px] tracking-[0.2em] text-cream-hi/80 uppercase backdrop-blur-md">
                <span className="florencio-signal-dot" /> Florencio · IA Deluxury
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.18em] text-cream-hi/55 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-soft" /> sistema activo
              </span>
            </div>

            <p className="mt-8 eyebrow !text-gold-soft">Asistente de regalos</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.94] sm:text-6xl md:text-7xl">
              Florencio, tu <span className="italic text-gold-soft">asistente.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-hi/72 sm:text-lg">
              Te ayuda a descubrir el regalo adecuado, cruza tus preferencias con el catálogo real y te acompaña hasta el carrito.
            </p>

            <div className="mt-7 grid max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-4">
              {["Ocasión", "Destinatario", "Estilo", "Presupuesto"].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-cream-hi/10 bg-black/15 px-3 py-3 text-center text-[9px] tracking-[0.14em] text-cream-hi/70 uppercase backdrop-blur-sm"
                >
                  <span className="block text-gold-soft">{item}</span>
                  <span className="mt-1 block text-[8px] tracking-normal text-cream-hi/42 normal-case">filtro útil</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("florencio:open-chat"))}
                className="press inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-[11px] tracking-[0.22em] text-primary-foreground uppercase shadow-[0_14px_40px_-18px_rgba(190,145,67,.9)]"
              >
                <Bot className="h-4 w-4" /> Hablar con Florencio
              </button>
              {enabled && (
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero conocer el domicilio especial con Florencio.")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press inline-flex items-center justify-center gap-2 rounded-full border border-cream-hi/18 bg-black/20 px-7 py-4 text-[11px] tracking-[0.22em] text-cream-hi uppercase backdrop-blur-md hover:border-gold-soft/60"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>

            <div className="mt-7 flex items-center gap-3 text-[9px] tracking-[0.12em] text-cream-hi/48 uppercase">
              <WandSparkles className="h-3.5 w-3.5 text-gold-soft" />
              funciona con IA y también en modo catálogo
            </div>
          </div>

          <div className="relative z-10 flex justify-center md:justify-end">
            <div className="florencio-orb-shell relative w-full max-w-[460px] rounded-[32px] border border-cream-hi/15 bg-black/20 p-3 shadow-[0_35px_100px_-45px_rgba(0,0,0,.95)] backdrop-blur-sm sm:p-4">
              <div className="relative min-h-[500px] overflow-hidden rounded-[25px] border border-cream-hi/10 bg-black/12 sm:min-h-[570px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,.08),transparent_35%)]" />
                <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[8px] tracking-[0.22em] text-cream-hi/44 uppercase">
                  <span>Florencio Intelligence</span>
                  <span className="inline-flex items-center gap-1.5"><span className="florencio-signal-dot" /> Online</span>
                </div>

                <div className="relative flex min-h-[500px] items-center justify-center px-5 pt-12 pb-24 sm:min-h-[570px]">
                  <div className="florencio-orbit-main pointer-events-none absolute inset-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-soft/20" />
                  <div className="florencio-orbit-main florencio-orbit-main-reverse pointer-events-none absolute inset-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cream-hi/10" />
                  <div className="florencio-orb-glow pointer-events-none absolute inset-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-soft/10 blur-2xl" />

                  <img
                    src={introImage}
                    alt="Florencio de Deluxury"
                    className="relative z-10 h-[350px] w-auto max-w-[88%] object-contain sm:h-[430px]"
                  />

                  <div className="absolute left-4 right-4 top-[28%] hidden sm:block">
                    <div className="mx-auto max-w-[240px] rounded-2xl border border-cream-hi/10 bg-foreground/55 px-4 py-3 backdrop-blur-md">
                      <p className="text-[8px] tracking-[0.18em] text-cream-hi/46 uppercase">Interpreto tu intención</p>
                      <p className="mt-1 font-display text-lg">¿Qué quieres regalar?</p>
                      <div className="mt-2 h-px bg-cream-hi/10"><span className="block h-full w-2/3 bg-gold-soft/70" /></div>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-cream-hi/10 bg-foreground/72 p-4 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                      <span className="florencio-avatar florencio-avatar-sm"><img src={introImage} alt="" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[8px] tracking-[0.16em] text-cream-hi/42 uppercase">Estado</p>
                          <p className="text-[8px] text-gold-soft">{signal}%</p>
                        </div>
                        <p className="mt-1 text-xs text-cream-hi/80">Listo para recomendar.</p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-cream-hi/10">
                          <span className="florencio-signal-line block h-full bg-gold-soft/75" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
              Inteligencia útil, <span className="text-lux-gradient italic">sin complicarte.</span>
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Cuéntale lo que buscas", "Ocasión, persona, estilo, color o presupuesto."],
              ["02", "Cruza el catálogo", "Filtra productos reales de Deluxury y prioriza coincidencias."],
              ["03", "Elige y compra", "Abre el producto, añádelo al carrito y continúa la compra."],
            ].map(([n, title, copy]) => (
              <div key={n} className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
                <p className="text-[10px] tracking-[0.24em] text-primary">{n}</p>
                <h3 className="mt-5 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-primary/15 bg-secondary/40 p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-display text-xl">¿La IA no está disponible?</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Florencio sigue funcionando con el catálogo: entiende frases sencillas, aplica filtros y muestra productos reales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("florencio:open-chat"))}
                className="press inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-[10px] tracking-[0.18em] uppercase hover:border-primary"
              >
                Buscar en catálogo <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {enabled && (
        <section className="relative overflow-hidden border-b border-border bg-secondary/35 py-20 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_.8fr] md:items-center md:px-8">
            <div className="max-w-2xl">
              <p className="eyebrow">Servicio especial</p>
              <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
                Domicilio <span className="italic text-lux-gradient">con Florencio.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{serviceCopy}</p>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Entrega especial</span>
                <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Opción configurable</span>
                <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Momento memorable</span>
              </div>
            </div>
            <div className="surface-glass rounded-3xl p-6 md:p-8">
              <p className="eyebrow">Tarifa configurada</p>
              <p className="mt-3 font-display text-4xl text-primary">
                {price > 0 ? formatMoney(price, currency, trm) : "Consultar"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Selecciona esta opción al comprar o escríbenos por WhatsApp para coordinarla.</p>
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero solicitar el domicilio especial con Florencio.")}`}
                target="_blank"
                rel="noreferrer"
                className="press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"
              >
                <MessageCircle className="h-4 w-4" /> Coordinar por WhatsApp
              </a>
            </div>
          </div>
        </section>
      )}

      {suggested.length > 0 && (
        <section className="border-b border-border py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="eyebrow">Florencio recomienda</p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">Piezas para empezar.</h2>
              </div>
              <Link to="/catalogo" className="press inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase hover:text-primary">
                Ver catálogo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-7">
              {suggested.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {media.length > 0 && (
        <section className="border-b border-border py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <p className="eyebrow">Más de Florencio</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">Su universo.</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((item, i) => (
                <a
                  key={`${item.url}-${i}`}
                  href={item.link || item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-3xl border border-border bg-secondary"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img src={item.url} alt={item.caption || "Florencio de Deluxury"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  </div>
                  {item.caption && <p className="p-4 text-sm text-muted-foreground">{item.caption}</p>}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-secondary/40 py-16 md:py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-5 text-center">
          <p className="eyebrow">Un detalle empieza con una buena idea</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Habla con Florencio.</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">Cuéntale lo que necesitas y déjalo ayudarte a decidir.</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event("florencio:open-chat"))} className="press mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 text-[10px] tracking-[0.22em] text-primary-foreground uppercase">
            Abrir asistente <Bot className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
