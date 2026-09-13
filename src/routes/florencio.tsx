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
          "Conoce a Florencio, el asistente virtual y servicio de entrega especial de Deluxury.",
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
      const x = item as Record<string, unknown>;
      return (
        (x.type === "image" || x.type === "reel") &&
        typeof x.url === "string"
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
  const introImage =
    settings?.["florencio_intro_image_url"] ||
    "/video/florencio-section/florencio-ai-poster.jpg";
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";
  const serviceCopy =
    settings?.["florencio_delivery_description"] ||
    "Un detalle especial para quienes quieren que Florencio sea parte de la sorpresa y acompañe personalmente la entrega.";
  const suggested = products
    .filter((p) => p.is_active)
    .filter((p) => p.is_featured)
    .slice(0, 3);

  return (
    <div className="pt-24 md:pt-28">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img
            src={introImage}
            alt=""
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-background" />
        </div>

        <div className="relative mx-auto flex min-h-[430px] max-w-7xl items-center justify-center px-5 py-20 text-center md:min-h-[500px] md:px-8">
          <div className="max-w-4xl text-white">
            <p className="inline-flex items-center gap-2 bg-black/25 px-4 py-2 text-[9px] tracking-[0.24em] text-white/80 uppercase backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Florencio · Asistente floral
            </p>
            <h1 className="mt-7 font-display text-5xl leading-[0.95] md:text-7xl">
              Encuentra el detalle{" "}
              <span className="text-primary italic">perfecto.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
              Háblame como lo harías con una persona. Cuéntame para quién es,
              qué ocasión tienes y cuánto quieres invertir.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-0 md:px-8">
          <div className="px-5 py-14 md:px-0 md:py-20">
            <p className="eyebrow">Tu asesoría floral</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight md:text-5xl">
              Una conversación que termina en{" "}
              <span className="text-lux-gradient italic">una elección.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Puedes escribir con tus propias palabras. Florencio interpreta
              lo que necesitas y lo conecta con piezas reales de Deluxury.
            </p>
          </div>

          <FlorencioChat embedded />
        </div>
      </section>

      <section className="border-b border-border py-16 md:py-22">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              Del primer mensaje a{" "}
              <span className="text-lux-gradient italic">tu elección.</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              Florencio puede ayudarte a descubrir productos según la persona,
              la ocasión, el estilo y el presupuesto.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
            {[
              [
                Sparkles,
                "Recomendaciones",
                "Encuentra piezas del catálogo según persona, ocasión, estilo y presupuesto.",
              ],
              [
                Heart,
                "Asesoría",
                "Te hace preguntas sencillas cuando todavía no sabes exactamente qué quieres regalar.",
              ],
              [
                Check,
                "Compra sencilla",
                "Puedes ver una pieza, añadirla al carrito y continuar tu compra.",
              ],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Sparkles;
              return (
                <article
                  key={String(title)}
                  className="bg-background p-7 md:p-8"
                >
                  <I className="h-5 w-5 text-primary" />
                  <h3 className="mt-5 font-display text-2xl">
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
        <section className="border-b border-border py-16 md:py-22">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="eyebrow">Servicio extra</p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">
                  Entrega especial con{" "}
                  <span className="text-lux-gradient italic">Florencio.</span>
                </h2>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  {serviceCopy}
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <span className="text-sm">
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
                      <strong>configurable desde el panel</strong>
                    )}
                  </span>
                </div>
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                    "Hola, quisiera agregar la entrega especial con Florencio a mi pedido.",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press mt-7 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-[11px] tracking-[0.24em] text-cream-hi uppercase hover:bg-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                  Preguntar por disponibilidad
                </a>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  "Acompañamiento de la sorpresa",
                  "Coordinación por WhatsApp",
                  "Servicio opcional de Deluxury",
                ].map((item) => (
                  <div
                    key={item}
                    className="surface-glass rounded-2xl p-6"
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
        <section className="border-b border-border py-16 md:py-22">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Florencio detrás de escena</p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">
                  Momentos de{" "}
                  <span className="text-lux-gradient italic">Florencio</span>
                </h2>
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

      {suggested.length > 0 && (
        <section className="py-16 md:py-22">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <p className="eyebrow">Florencio recomienda</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              Algunas piezas que{" "}
              <span className="text-lux-gradient italic">le encantan.</span>
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 lg:grid-cols-3">
              {suggested.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
