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
      { title: "Florencio IA · Asistente de Deluxury" },
      {
        name: "description",
        content:
          "Habla con Florencio, la IA floral de Deluxury, y descubre productos reales del catálogo según tu ocasión, estilo y presupuesto.",
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
    <div className="overflow-hidden bg-[#0b0808] pt-20 text-white md:pt-24">
      {/* IA principal: el video es el ambiente del chat, no una tarjeta
          separada. En móvil el encuadre queda centrado y menos recortado. */}
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <video
          className="absolute inset-0 h-full w-full object-cover object-[50%_42%] opacity-65 sm:object-center sm:opacity-70"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/video/florencio-section/florencio-ai-poster.jpg"
          aria-hidden="true"
        >
          <source
            src="/video/florencio-section/florencio-ia.mp4"
            type="video/mp4"
          />
        </video>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,220,184,0.2),transparent_34%),linear-gradient(180deg,rgba(7,5,5,0.12),rgba(7,5,5,0.72)_68%,#0b0808)]" />
        <div className="absolute inset-0 bg-black/15" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-14 sm:px-6 sm:py-20 md:px-8 md:py-24">
          <div className="max-w-3xl text-center">
            <p className="text-[9px] tracking-[0.3em] text-primary uppercase">
              Florencio IA
            </p>

            <h1 className="mt-4 font-display text-4xl leading-[0.95] sm:text-6xl md:text-7xl">
              Tu asistente floral de{" "}
              <span className="text-lux-gradient italic">Deluxury.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              Dile qué necesitas y Florencio buscará coincidencias en el
              catálogo real, te explicará por qué las recomienda y te permitirá
              añadirlas al carrito.
            </p>
          </div>

          <div className="mt-10 flex w-full justify-center sm:mt-12">
            <FlorencioChat embedded />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b0808] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-2xl">
            <p className="text-[9px] tracking-[0.3em] text-primary uppercase">
              Cómo funciona
            </p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              Una IA que{" "}
              <span className="text-lux-gradient italic">
                sí conoce Deluxury.
              </span>
            </h2>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {[
              [
                Sparkles,
                "Entiende tu idea",
                "Puedes escribir de forma natural: ocasión, persona, estilo, color o presupuesto.",
              ],
              [
                Heart,
                "Cruza el catálogo",
                "Las recomendaciones salen de los productos reales disponibles en Deluxury.",
              ],
              [
                Check,
                "Te ayuda a comprar",
                "Puedes revisar el producto o añadirlo directamente al mismo carrito de la tienda.",
              ],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Sparkles;
              return (
                <article
                  key={String(title)}
                  className="bg-white/[0.025] p-7 backdrop-blur-sm md:p-8"
                >
                  <I className="h-5 w-5 text-primary" />
                  <h3 className="mt-5 font-display text-2xl">
                    {String(title)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    {String(copy)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {enabled && (
        <section className="border-b border-white/10 bg-[#0b0808] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-[9px] tracking-[0.3em] text-primary uppercase">
                  Servicio extra
                </p>
                <h2 className="mt-4 font-display text-4xl md:text-5xl">
                  Entrega especial con{" "}
                  <span className="text-lux-gradient italic">
                    Florencio.
                  </span>
                </h2>
                <p className="mt-5 text-base leading-relaxed text-white/55">
                  {serviceCopy}
                </p>

                <div className="mt-7 flex items-center gap-3 text-sm text-white/70">
                  <Truck className="h-5 w-5 text-primary" />
                  <span>
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
                  className="mt-7 inline-flex items-center gap-2 bg-white px-7 py-3.5 text-[11px] tracking-[0.24em] text-black uppercase hover:bg-primary"
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
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
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
        <section className="border-b border-white/10 bg-[#0b0808] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[9px] tracking-[0.3em] text-primary uppercase">
                  Florencio detrás de escena
                </p>
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
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
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
        <section className="bg-[#0b0808] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <p className="text-[9px] tracking-[0.3em] text-primary uppercase">
              Florencio recomienda
            </p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              Algunas piezas que{" "}
              <span className="text-lux-gradient italic">
                le encantan.
              </span>
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
