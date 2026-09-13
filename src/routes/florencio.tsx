import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Heart,
  Instagram,
  MessageCircle,
  Sparkles,
  Truck,
  WandSparkles,
} from "lucide-react";
import { categoriesQuery, productsQuery, settingsQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import ProductCard from "@/components/ProductCard";
import FlorencioChat from "@/components/FlorencioChat";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      {
        name: "description",
        content:
          "Florencio te ayuda a encontrar el detalle ideal dentro del catálogo de Deluxury.",
      },
    ],
  }),
  component: FlorencioPage,
});

type FlorencioMedia = {
  type: "image" | "reel";
  url: string;
  caption?: string;
  link?: string;
};

function parseMedia(raw?: string): FlorencioMedia[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FlorencioMedia => {
      if (!item || typeof item !== "object") return false;
      const value = item as Record<string, unknown>;
      return (
        (value.type === "image" || value.type === "reel") &&
        typeof value.url === "string"
      );
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
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";

  const serviceCopy =
    settings?.["florencio_delivery_description"] ||
    "Un detalle especial para quienes quieren que Florencio acompañe personalmente la sorpresa.";

  const florencioImage =
    settings?.["florencio_intro_image_url"] || "/img/florencio.png";

  const recommendedProducts = products
    .filter((product) => product.is_active)
    .sort((a, b) => Number(b.is_featured) - Number(a.is_featured))
    .slice(0, 3);

  return (
    <div className="overflow-hidden pt-24 md:pt-28">
      <section className="relative isolate border-b border-border bg-[#fbf7f0]">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(137,100,56,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(137,100,56,0.055)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#e3c8a2]/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-[#7c2736]/8 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-[1fr_0.82fr] md:px-8 md:py-20 lg:gap-16">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/65 px-3.5 py-2 text-[9px] tracking-[0.2em] text-primary uppercase shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Florencio · asistente floral
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[0.9] text-foreground md:text-7xl">
              Tu detalle,
              <br />
              pensado{" "}
              <span className="text-lux-gradient italic">contigo.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Habla con Florencio como lo harías con una persona. Cuéntale a
              quién quieres sorprender, qué ocasión tienes y el estilo que
              imaginas. Él cruza esa intención con el catálogo real de
              Deluxury.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#florencio-chat"
                className="press inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase shadow-[0_18px_35px_-22px_rgba(112,53,57,0.8)]"
              >
                <WandSparkles className="h-4 w-4" />
                Hablar con Florencio
              </a>

              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  "Hola, quiero conocer el servicio de entrega especial con Florencio.",
                )}`}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-6 py-3.5 text-[10px] tracking-[0.2em] uppercase backdrop-blur transition hover:border-primary hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary" />
                Catálogo real
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary" />
                Recomendaciones
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary" />
                Carrito integrado
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute inset-x-12 bottom-5 h-24 rounded-full bg-primary/12 blur-3xl" />
            <div className="relative overflow-hidden rounded-[42px] border border-white/80 bg-white/55 px-6 pb-0 pt-6 shadow-[0_45px_100px_-42px_rgba(78,47,27,0.45)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between rounded-full border border-border/80 bg-white/65 px-3.5 py-2 backdrop-blur">
                <span className="text-[8px] tracking-[0.18em] text-muted-foreground uppercase">
                  Florencio OS
                </span>
                <span className="flex items-center gap-1.5 text-[8px] tracking-[0.16em] text-emerald-700 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ready
                </span>
              </div>

              <img
                src={florencioImage}
                alt="Florencio de Deluxury"
                className="mx-auto block w-[82%] max-w-[390px] object-contain object-bottom drop-shadow-[0_35px_30px_rgba(68,44,21,0.2)]"
              />

              <div className="relative z-10 -mt-5 mb-5 rounded-2xl border border-primary/15 bg-white/84 p-4 shadow-[0_20px_50px_-28px_rgba(59,32,21,0.4)] backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-[9px] tracking-[0.2em] text-primary uppercase">
                    Motor de recomendación
                  </p>
                </div>
                <p className="mt-2 font-display text-2xl">
                  Entender primero.
                  <br />
                  Recomendar después.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="florencio-chat" className="border-b border-border bg-[#f6efe6] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="eyebrow">Florencio está aquí</p>
              <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
                De una idea suelta a{" "}
                <span className="text-lux-gradient italic">una elección.</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/15 bg-white/65 px-3.5 py-2 text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Experiencia interactiva
            </div>
          </div>

          <FlorencioChat embedded />
        </div>
      </section>

      <section className="border-b border-border bg-background py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">
              Tecnología sutil,
              <br />
              <span className="text-lux-gradient italic">criterio floral.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              La experiencia está diseñada para sentirse más humana que
              técnica: Florencio entiende la intención y la convierte en una
              selección clara, visual y fácil de comprar.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
            {[
              [
                Sparkles,
                "Escucha",
                "Entiende ocasión, persona, estilo, color y presupuesto desde tu forma natural de escribir.",
              ],
              [
                Heart,
                "Interpreta",
                "Cruza tu intención con las piezas reales de Deluxury y prioriza las coincidencias más útiles.",
              ],
              [
                ShoppingBag,
                "Convierte",
                "Puedes abrir el producto o añadirlo directamente al carrito sin romper la conversación.",
              ],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Sparkles;
              return (
                <article
                  key={String(title)}
                  className="bg-background p-7 transition hover:bg-secondary/20 md:p-8"
                >
                  <I className="h-5 w-5 text-primary" />
                  <p className="mt-5 text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                    0{["Escucha", "Interpreta", "Convierte"].indexOf(String(title)) + 1}
                  </p>
                  <h3 className="mt-2 font-display text-2xl">
                    {String(title)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {String(copy)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {enabled && (
        <section className="border-b border-border bg-[#f9f3ec] py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="eyebrow">Servicio especial</p>
                <h2 className="mt-3 font-display text-4xl md:text-5xl">
                  Que Florencio también{" "}
                  <span className="text-lux-gradient italic">acompañe.</span>
                </h2>
                <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {serviceCopy}
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-4 py-2.5 text-sm backdrop-blur">
                  <Truck className="h-4 w-4 text-primary" />
                  Tarifa{" "}
                  {price > 0 ? (
                    <strong>
                      {new Intl.NumberFormat("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      }).format(price)}
                    </strong>
                  ) : (
                    <strong>consultar</strong>
                  )}
                </div>

                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                    "Hola, quisiera agregar la entrega especial con Florencio a mi pedido.",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press mt-7 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-[10px] tracking-[0.2em] text-cream-hi uppercase hover:bg-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar disponibilidad
                </a>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "Acompañamiento de la sorpresa",
                  "Coordinación por WhatsApp",
                  "Servicio opcional de Deluxury",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-primary/10 bg-white/70 p-6 shadow-[0_18px_48px_-35px_rgba(72,45,28,0.25)]"
                  >
                    <Check className="h-4 w-4 text-primary" />
                    <p className="mt-5 font-display text-xl">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {media.length > 0 && (
        <section className="border-b border-border bg-background py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Detrás de escena</p>
                <h2 className="mt-3 font-display text-4xl md:text-5xl">
                  Momentos de{" "}
                  <span className="text-lux-gradient italic">Florencio.</span>
                </h2>
              </div>
              <Instagram className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {media.map((item, index) => (
                <a
                  key={`${item.url}-${index}`}
                  href={item.link || item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/30"
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt={item.caption || "Florencio"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_50%_30%,var(--rose-glow),transparent_65%)] p-5">
                      <div className="flex h-full flex-col justify-end">
                        <p className="text-[10px] tracking-[0.22em] text-primary uppercase">
                          Reel de Instagram
                        </p>
                        <p className="mt-2 font-display text-2xl">
                          {item.caption || "Ver momento de Florencio"}
                        </p>
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

      <section className="border-b border-border bg-[#f6efe6] py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="eyebrow">Florencio recomienda</p>
              <h2 className="mt-3 font-display text-4xl md:text-5xl">
                Piezas que merecen{" "}
                <span className="text-lux-gradient italic">ser vistas.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Una selección inicial del catálogo. Cuando converses con
                Florencio, esta selección se adapta a lo que estés buscando.
              </p>
            </div>

            <a
              href="/catalogo"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-2.5 text-[9px] tracking-[0.18em] uppercase transition hover:border-primary hover:text-primary"
            >
              Explorar catálogo
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {recommendedProducts.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-7 lg:grid-cols-3">
              {recommendedProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-dashed border-primary/20 bg-white/60 p-10 text-center">
              <p className="font-display text-3xl">
                Florencio está esperando las próximas piezas.
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Cuando haya productos activos en el catálogo, este espacio se
                llenará automáticamente con ellos.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
