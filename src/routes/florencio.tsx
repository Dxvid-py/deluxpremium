import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Check,
  MessageCircle,
  Sparkles,
  Truck,
} from "lucide-react";
import { productsQuery, settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import FlorencioChat from "@/components/FlorencioChat";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      {
        name: "description",
        content:
          "Florencio recomienda productos reales de Deluxury y acompaña el domicilio especial.",
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

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is FlorencioMedia =>
            !!item &&
            typeof item === "object" &&
            ((item as FlorencioMedia).type === "image" ||
              (item as FlorencioMedia).type === "reel") &&
            typeof (item as FlorencioMedia).url === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function FlorencioPage() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  const { currency } = useStore();

  const enabled = settings?.["florencio_delivery_enabled"] !== "false";
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";
  const serviceCopy =
    settings?.["florencio_delivery_description"] ||
    "Haz que la entrega sea parte de la sorpresa y solicita el domicilio especial con Florencio.";
  const media = parseMedia(settings?.["florencio_media_json"]);

  const suggested = useMemo(
    () =>
      products
        .filter((product) => product.is_active && Number(product.stock) !== 0)
        .slice(0, 4),
    [products],
  );

  // Esta página nunca debe bloquear el scroll del documento.
  useEffect(() => {
    document.body.classList.add("florencio-page");

    const htmlOverflowY = document.documentElement.style.overflowY;
    const bodyOverflowY = document.body.style.overflowY;

    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";

    return () => {
      document.body.classList.remove("florencio-page");
      document.documentElement.style.overflowY = htmlOverflowY;
      document.body.style.overflowY = bodyOverflowY;
    };
  }, []);

  return (
    <div className="overflow-x-clip pt-24 md:pt-28">
      <section className="relative isolate overflow-visible touch-pan-y text-white">
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <video
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[50%_38%] opacity-75 sm:object-center sm:opacity-70"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/video/florencio-section/florencio-ai-poster.jpg"
          src="/video/florencio-section/florencio-ia.mp4"
          aria-hidden="true"
          style={{ pointerEvents: "none", touchAction: "none" }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[#100b0d]/38" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(240,190,135,.2),transparent_35%),linear-gradient(180deg,rgba(10,7,8,.18),rgba(10,7,8,.72)_88%,rgba(10,7,8,1))]" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-[9px] tracking-[0.22em] text-white/70 uppercase backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Florencio IA · Deluxury
            </div>

            <h1 className="mt-6 font-display text-5xl leading-[0.92] sm:text-6xl md:text-7xl">
              Habla con{" "}
              <span className="italic text-primary">Florencio.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              Cuéntale qué estás buscando. Te recomienda flores del catálogo
              real, te explica brevemente por qué encajan y puedes agregarlas
              al carrito sin salir del chat.
            </p>
          </div>

          <div
            className="relative z-10 mx-auto mt-9 w-full max-w-4xl sm:mt-12"
            style={{ touchAction: "pan-y" }}
          >
            <FlorencioChat embedded />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow">La experiencia</p>

            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              Florencio no solo conversa.{" "}
              <span className="text-lux-gradient italic">
                te ayuda a decidir.
              </span>
            </h2>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Puedes escribir con tus propias palabras o usar el catálogo
              cuando prefieras. La recomendación siempre termina en productos
              reales de Deluxury.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Describe", "“Quiero algo romántico, rojo y elegante.”"],
              [
                "02",
                "Recomienda",
                "Florencio cruza tus pistas con el catálogo real.",
              ],
              [
                "03",
                "Compra",
                "Agrega el arreglo al carrito o entra a comprarlo.",
              ],
            ].map(([number, title, copy]) => (
              <div
                key={number}
                className="rounded-3xl border border-border bg-card p-6"
              >
                <p className="text-[10px] tracking-[0.22em] text-primary">
                  {number}
                </p>
                <h3 className="mt-5 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-primary/15 bg-secondary/45 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 text-primary" />

              <div>
                <p className="font-display text-xl">¿No hay IA disponible?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Florencio cambia automáticamente a modo catálogo: ocasión,
                  destinatario, estilo, color y presupuesto.
                </p>
              </div>
            </div>

            <Link
              to="/catalogo"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-[10px] tracking-[0.18em] uppercase"
            >
              Modo IA en catálogo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {enabled && (
        <section className="border-b border-border bg-secondary/35 py-16 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_.75fr] md:items-center md:px-8">
            <div>
              <p className="eyebrow">Servicio especial</p>

              <h2 className="mt-4 font-display text-4xl md:text-5xl">
                Domicilio{" "}
                <span className="italic text-lux-gradient">
                  con Florencio.
                </span>
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {serviceCopy}
              </p>

              <div className="mt-7 flex flex-wrap gap-5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  Entrega especial
                </span>

                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Opción en el producto
                </span>

                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Parte de la sorpresa
                </span>
              </div>
            </div>

            <div className="surface-glass rounded-3xl p-7">
              <p className="eyebrow">Tarifa</p>

              <p className="mt-3 font-display text-4xl text-primary">
                {price > 0 ? formatMoney(price, currency, trm) : "Consultar"}
              </p>

              <p className="mt-3 text-sm text-muted-foreground">
                También puedes coordinar el servicio por WhatsApp.
              </p>

              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  "Hola, quiero solicitar el domicilio especial con Florencio.",
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"
              >
                <MessageCircle className="h-4 w-4" />
                Coordinar por WhatsApp
              </a>
            </div>
          </div>
        </section>
      )}

      {suggested.length > 0 && (
        <section className="border-b border-border py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Después de hablar con Florencio</p>

                <h2 className="mt-4 font-display text-4xl md:text-5xl">
                  Empieza por estas piezas.
                </h2>
              </div>

              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase hover:text-primary"
              >
                Ver catálogo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {suggested.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      {media.length > 0 && (
        <section className="border-b border-border py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <p className="eyebrow">Más de Florencio</p>

            <h2 className="mt-4 font-display text-4xl md:text-5xl">
              Su universo.
            </h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((item, index) => (
                <a
                  key={`${item.url}-${index}`}
                  href={item.link || item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-3xl border border-border bg-secondary"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.caption || "Florencio de Deluxury"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {item.caption && (
                    <p className="p-4 text-sm text-muted-foreground">
                      {item.caption}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
