import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Check,
  CircleDot,
  Heart,
  Instagram,
  MessageCircle,
  Sparkles,
  Truck,
  WandSparkles,
  Zap,
} from "lucide-react";
import { productsQuery, settingsQuery } from "@/lib/queries";
import ProductCard from "@/components/ProductCard";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      {
        name: "description",
        content: "Conoce a Florencio, el asistente inteligente y servicio de entrega especial de Deluxury.",
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

function FlorencioPage() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [signal, setSignal] = useState(34);
  const [pulse, setPulse] = useState(false);

  const media = parseMedia(settings?.["florencio_media_json"]);
  const enabled = settings?.["florencio_delivery_enabled"] !== "false";
  const introImage = settings?.["florencio_intro_image_url"] || "/img/florencio.png";
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";
  const serviceCopy =
    settings?.["florencio_delivery_description"] ||
    "Un detalle especial para quienes quieren que Florencio sea parte de la sorpresa y acompañe personalmente la entrega.";
  const backgroundVideo =
    settings?.["florencio_background_video_url"] ||
    "/video/florencio-section/florencio-background.mp4";
  const suggested = products.filter((p) => p.is_active && p.is_featured).slice(0, 3);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSignal((n) => (n + 7) % 100);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden pt-24 md:pt-28">
      <section className="florencio-ai-hero relative isolate overflow-hidden border-b border-border bg-foreground text-cream-hi">
        <video
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${backgroundReady ? "opacity-24" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          src={backgroundVideo}
          onCanPlay={() => setBackgroundReady(true)}
          onError={() => setBackgroundReady(false)}
          aria-hidden="true"
        />

        <div className="florencio-ai-grid pointer-events-none absolute inset-0" />
        <div className="florencio-ai-vignette pointer-events-none absolute inset-0" />
        <div className={`florencio-ai-sweep pointer-events-none absolute inset-y-0 left-[-18%] w-[36%] ${pulse ? "is-pulsing" : ""}`} />
        <div className="florencio-ai-orbit florencio-ai-orbit-a pointer-events-none absolute left-[5%] top-[10%] hidden md:block" />
        <div className="florencio-ai-orbit florencio-ai-orbit-b pointer-events-none absolute right-[5%] bottom-[10%] hidden md:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:gap-14 sm:py-16 md:grid-cols-[1fr_0.9fr] md:px-8 md:py-24">
          <div className="order-2 md:order-1">
            <div className="mb-6 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-cream-hi/15 bg-cream-hi/5 px-3 py-1.5 text-[9px] tracking-[0.22em] text-cream-hi/80 uppercase backdrop-blur-sm">
                <span className="florencio-signal-dot" /> Florencio · IA de Deluxury
              </span>
              <span className="inline-flex items-center gap-1.5 text-[8px] tracking-[0.22em] text-cream-hi/45 uppercase">
                <CircleDot className="h-3 w-3 text-primary" /> activo
              </span>
            </div>

            <p className="eyebrow !text-gold-soft">Asistente de regalo</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.92] sm:text-6xl md:text-7xl">
              Conoce a <span className="italic text-gold-soft">Florencio.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-hi/70 sm:text-lg">
              Una experiencia que combina la calidez de nuestra mascota con un asistente que
              interpreta lo que buscas, conoce el catálogo real y te acompaña hasta el carrito.
            </p>

            <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              {["Entiende tu intención", "Cruza el catálogo", "Te ayuda a decidir", "No inventa productos"].map((item) => (
                <div key={item} className="flex min-w-0 items-center gap-2 rounded-xl border border-cream-hi/10 bg-cream-hi/5 px-3 py-2 text-[9px] tracking-[0.08em] text-cream-hi/65">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("florencio:open-chat"))}
                className="press inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
              >
                <Bot className="h-4 w-4" /> Hablar con Florencio
              </button>
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero conocer el servicio especial de Florencio.")}`}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center justify-center gap-2 rounded-full border border-cream-hi/20 bg-cream-hi/5 px-7 py-4 text-[11px] tracking-[0.24em] text-cream-hi uppercase hover:border-gold-soft/60 hover:bg-cream-hi/10"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <div className="florencio-terminal relative mx-auto max-w-[540px] overflow-hidden rounded-[30px] border border-cream-hi/15 bg-black/35 p-2.5 shadow-[0_40px_110px_-55px_rgba(0,0,0,.9)] backdrop-blur-md sm:rounded-[34px] sm:p-3">
              <div className="relative overflow-hidden rounded-[24px] border border-cream-hi/10 bg-foreground/72 sm:rounded-[28px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.08),transparent_35%)]" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-4 text-[8px] tracking-[0.22em] text-cream-hi/45 uppercase">
                  <span>Florencio intelligence</span>
                  <span className="inline-flex items-center gap-1.5"><span className="florencio-signal-dot" /> Online</span>
                </div>

                <div className="relative flex min-h-[420px] items-center justify-center p-6 sm:min-h-[470px] sm:p-8 md:min-h-[540px]">
                  <div className="florencio-ai-core pointer-events-none absolute inset-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-soft/15 sm:h-56 sm:w-56" />
                  <div className="florencio-ai-core florencio-ai-core-2 pointer-events-none absolute inset-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cream-hi/10 sm:h-72 sm:w-72" />
                  <div className="florencio-ai-pulse pointer-events-none absolute inset-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-soft/10 sm:h-36 sm:w-36" />
                  <img
                    src={introImage}
                    alt="Florencio de Deluxury"
                    className="relative z-10 h-[325px] w-auto max-w-[90%] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,.48)] sm:h-[380px] md:h-[450px]"
                  />

                  <div className="absolute bottom-5 left-4 right-4 mx-auto max-w-[360px] rounded-2xl border border-cream-hi/10 bg-black/28 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="florencio-avatar florencio-avatar-sm"><img src="/img/florencio.png" alt="" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] tracking-[0.18em] text-cream-hi/40 uppercase">Respuesta en curso</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="florencio-thinking-dot" />
                          <span className="florencio-thinking-dot" />
                          <span className="florencio-thinking-dot" />
                          <span className="ml-1 text-[10px] text-cream-hi/62">Estoy buscando la mejor coincidencia…</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-cream-hi/10 bg-black/20 p-4">
                  <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                    <div>
                      <p className="text-[9px] tracking-[0.18em] text-cream-hi/45 uppercase">Estado del asistente</p>
                      <p className="mt-1 font-display text-lg sm:text-xl">Listo para ayudarte.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] tracking-[0.16em] text-cream-hi/35 uppercase">Señal</p>
                      <p className="mt-1 font-display text-lg text-gold-soft">{String(signal).padStart(2, "0")}%</p>
                    </div>
                  </div>
                  <div className="mt-3 h-px overflow-hidden rounded-full bg-cream-hi/10">
                    <span className="florencio-ai-signal-line block h-full w-1/2 bg-gold-soft/70" />
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[8px] tracking-[0.22em] text-cream-hi/35 uppercase sm:text-[9px]">Un pequeño cerebro para una gran experiencia.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-7 md:grid-cols-[1.1fr_.9fr] md:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow">Su lado inteligente</p>
              <h2 className="mt-4 font-display text-4xl md:text-5xl">
                Una ayuda que <span className="text-lux-gradient italic">sí conoce Deluxury.</span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-right">
              Florencio convierte tus palabras en señales útiles para buscar dentro del catálogo real.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              [WandSparkles, "Entiende intención", "Convierte una conversación en persona, ocasión, presupuesto, estilo y preferencias."],
              [Sparkles, "Recomienda con criterio", "Prioriza productos reales del catálogo y explica por qué encajan."],
              [Zap, "Te ayuda a decidir", "Compara opciones, responde dudas y te lleva directo al carrito."],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Sparkles;
              return (
                <article key={String(title)} className="relative overflow-hidden rounded-2xl border border-border bg-card/75 p-6 sm:p-7">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                  <I className="relative h-5 w-5 text-primary" />
                  <h3 className="relative mt-5 font-display text-2xl">{String(title)}</h3>
                  <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {enabled && (
        <section className="border-b border-border py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="eyebrow">Servicio extra</p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">
                  Entrega especial con <span className="text-lux-gradient italic">Florencio.</span>
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">{serviceCopy}</p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <span className="text-sm">Tarifa {price > 0 ? <strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(price)}</strong> : <strong>configurable desde el panel</strong>}</span>
                </div>
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quisiera agregar la entrega especial con Florencio a mi pedido.")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press mt-7 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-[11px] tracking-[0.24em] text-cream-hi uppercase hover:bg-primary"
                >
                  <MessageCircle className="h-4 w-4" /> Consultar disponibilidad
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  [Heart, "Acompaña la sorpresa"],
                  [MessageCircle, "Coordinación por WhatsApp"],
                  [Truck, "Servicio opcional"],
                ].map(([Icon, title]) => {
                  const I = Icon as typeof Heart;
                  return (
                    <div key={String(title)} className="surface-glass rounded-2xl p-6">
                      <I className="h-4 w-4 text-primary" />
                      <p className="mt-5 font-display text-xl">{String(title)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {media.length > 0 && (
        <section className="border-b border-border py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Florencio detrás de escena</p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">Momentos de <span className="text-lux-gradient italic">Florencio.</span></h2>
              </div>
              <Instagram className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {media.map((item, index) => (
                <a
                  key={`${item.url}-${index}`}
                  href={item.link || item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/30"
                >
                  {item.type === "image" ? (
                    <img src={item.url} alt={item.caption || "Florencio"} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_50%_30%,var(--rose-glow),transparent_65%)] p-5">
                      <div className="flex h-full flex-col justify-end">
                        <p className="text-[10px] tracking-[0.22em] text-primary uppercase">Reel de Instagram</p>
                        <p className="mt-2 font-display text-2xl">{item.caption || "Ver momento de Florencio"}</p>
                        <ArrowRight className="mt-5 h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {suggested.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <p className="eyebrow">Florencio recomienda</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">Algunas piezas que <span className="text-lux-gradient italic">le encantan.</span></h2>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 lg:grid-cols-3">{suggested.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
          </div>
        </section>
      )}
    </div>
  );
}
