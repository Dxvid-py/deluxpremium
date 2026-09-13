import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Heart,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import FlorencioCatalogAssistant from "@/components/FlorencioCatalogAssistant";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      {
        name: "description",
        content:
          "Habla con Florencio y encuentra el detalle ideal dentro de Deluxury.",
      },
    ],
  }),
  component: FlorencioPage,
});

function FlorencioPage() {
  return (
    <div className="overflow-hidden pt-24 md:pt-28">
      {/* HERO — intencionadamente sin queries ni lógica de Supabase para que
          la ruta sea robusta en SSR y el chat sea el único motor dinámico. */}
      <section className="relative isolate overflow-hidden border-b border-border bg-[#fbf7f0]">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(137,100,56,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(137,100,56,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#e3c8a2]/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-[#7c2736]/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:grid-cols-[1fr_0.8fr] md:px-8 md:py-20 lg:gap-16">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3.5 py-2 text-[9px] tracking-[0.2em] text-primary uppercase shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Florencio · asistente floral
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[0.9] md:text-7xl">
              Tu detalle,
              <br />
              pensado{" "}
              <span className="text-lux-gradient italic">contigo.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Cuéntale a Florencio para quién es el regalo, qué ocasión tienes
              o cuánto quieres invertir. Él te ayuda a encontrar una opción
              dentro de Deluxury.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#florencio-chat"
                className="press inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"
              >
                <WandSparkles className="h-4 w-4" />
                Hablar con Florencio
              </a>

              <a
                href="https://wa.me/573006301123?text=Hola%2C%20quiero%20conocer%20la%20experiencia%20de%20Florencio."
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-2 rounded-full border border-border bg-white/65 px-6 py-3.5 text-[10px] tracking-[0.2em] uppercase backdrop-blur transition hover:border-primary hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-[9px] tracking-[0.14em] text-muted-foreground uppercase">
              {["Catálogo real", "Recomendaciones", "Carrito integrado"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[500px]">
            <div className="absolute inset-x-12 bottom-3 h-24 rounded-full bg-primary/12 blur-3xl" />

            <div className="relative overflow-hidden rounded-[38px] border border-white/80 bg-white/60 px-7 pb-0 pt-7 shadow-[0_45px_100px_-42px_rgba(78,47,27,0.42)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between rounded-full border border-border/80 bg-white/70 px-3.5 py-2">
                <span className="text-[8px] tracking-[0.18em] text-muted-foreground uppercase">
                  Florencio
                </span>
                <span className="flex items-center gap-1.5 text-[8px] tracking-[0.16em] text-emerald-700 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  En línea
                </span>
              </div>

              <img
                src="/img/florencio.png"
                alt="Florencio de Deluxury"
                className="mx-auto block w-[84%] max-w-[380px] object-contain object-bottom drop-shadow-[0_35px_30px_rgba(68,44,21,0.2)]"
              />

              <div className="relative z-10 -mt-4 mb-5 rounded-2xl border border-primary/15 bg-white/85 p-4 shadow-[0_20px_50px_-28px_rgba(59,32,21,0.36)] backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-[9px] tracking-[0.2em] text-primary uppercase">
                    Recomendador Deluxury
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

      <section
        id="florencio-chat"
        className="border-b border-border bg-[#f5eee5] py-12 md:py-16"
      >
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-3xl">
              <p className="eyebrow">Florencio está aquí</p>
              <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
                De una idea suelta a{" "}
                <span className="text-lux-gradient italic">una elección.</span>
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/65 px-3.5 py-2 text-[9px] tracking-[0.14em] text-muted-foreground uppercase backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Experiencia interactiva
            </div>
          </div>

          <FlorencioCatalogAssistant />
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
              Florencio está pensado para reducir la duda al comprar: te
              escucha, entiende la ocasión y convierte tus pistas en una
              selección visual.
            </p>
          </div>

          <div className="mt-9 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-3">
            {[
              [
                Sparkles,
                "Escucha",
                "Puedes escribir de forma natural, sin tener que conocer nombres de flores o colecciones.",
              ],
              [
                Heart,
                "Interpreta",
                "Combina ocasión, persona, estilo y presupuesto para ayudarte a encontrar el detalle.",
              ],
              [
                ShoppingBag,
                "Convierte",
                "Abre el producto o añádelo al mismo carrito de Deluxury desde la conversación.",
              ],
            ].map(([Icon, title, copy]) => {
              const I = Icon as typeof Sparkles;

              return (
                <article
                  key={String(title)}
                  className="bg-background p-7 transition hover:bg-secondary/20 md:p-8"
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

      <section className="border-b border-border bg-[#f9f3ec] py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.75fr] lg:items-center">
            <div>
              <p className="eyebrow">Florencio recomienda</p>
              <h2 className="mt-3 font-display text-4xl md:text-5xl">
                La selección empieza{" "}
                <span className="text-lux-gradient italic">contigo.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Las recomendaciones de productos se generan dentro del chat a
                partir del catálogo disponible, con acceso directo al detalle
                y al carrito.
              </p>

              <a
                href="#florencio-chat"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"
              >
                Empezar la selección
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                "Según ocasión",
                "Según presupuesto",
                "Según estilo",
              ].map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-primary/10 bg-white/70 p-5 shadow-[0_18px_48px_-35px_rgba(72,45,28,0.24)]"
                >
                  <p className="text-[9px] tracking-[0.18em] text-primary uppercase">
                    0{index + 1}
                  </p>
                  <p className="mt-3 font-display text-xl">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
