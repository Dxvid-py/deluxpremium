import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { categoriesQuery, type Category } from "@/lib/queries";
import { useI18n, useLocalizedContent } from "@/lib/i18n";
import { usePetalBurst } from "@/lib/petal-burst";

const CYCLE_MS = 6000;

/**
 * Colecciones: paneles verticales que se expanden (acordeón editorial).
 * Autociclo suave, expansión al pasar el cursor/tap y apilado en móvil.
 * Sólo el nombre de cada colección — sin descripción — para que la
 * selección se sienta más directa y visual.
 */
export default function CollectionsShowcase() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { burst } = usePetalBurst();
  const { data: categories } = useQuery(categoriesQuery);
  const slides: Category[] = (categories ?? []).filter((c) => c.is_active).slice(0, 3);
  const L = useLocalizedContent(slides, ["name"]);

  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? active;

  useEffect(() => {
    if (slides.length < 2 || hovered !== null) return undefined;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % slides.length), CYCLE_MS);
    return () => window.clearTimeout(id);
  }, [active, hovered, slides.length]);

  if (slides.length === 0) return null;

  const onSelect = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    burst(e.clientX, e.clientY, () => {
      navigate({ to: "/coleccion/$slug", params: { slug } });
    });
  };

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="diffused-light pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="max-w-xl">
          <p className="eyebrow" data-anim="left">
            {t("home.collections.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl" data-anim="letters">
            {t("home.collections.title1")}{" "}
            <span className="text-lux-gradient italic">{t("home.collections.title2")}</span>
          </h2>
        </div>

        <div
          className="mt-12 flex flex-col gap-4 md:mt-16 md:h-[560px] md:flex-row"
          data-anim="fade-up"
          onMouseLeave={() => setHovered(null)}
        >
          {slides.map((c, i) => {
            const open = shown === i;
            return (
              <a
                key={c.id}
                href={`/coleccion/${c.slug}`}
                onClick={(e) => onSelect(e, c.slug)}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                className={`group relative isolate block cursor-pointer overflow-hidden rounded-sm ring-1 transition-all duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  open ? "ring-primary/35" : "ring-border"
                } h-[220px] md:h-full ${open ? "md:flex-[3.4]" : "md:flex-[1]"}`}
              >
                <img
                  src={c.image_url}
                  alt={L(c, "name")}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    open ? "scale-105 saturate-100" : "scale-100 saturate-[0.55]"
                  }`}
                />
                <span
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    open
                      ? "bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent"
                      : "bg-gradient-to-t from-foreground/75 via-foreground/30 to-foreground/10"
                  }`}
                />

                {/* Índice */}
                <span className="absolute top-5 left-5 font-display text-sm tracking-[0.35em] text-cream-hi/80">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Nombre vertical cuando está cerrado (sólo escritorio) */}
                <span
                  className={`absolute bottom-6 left-6 hidden origin-bottom-left rotate-180 font-display text-2xl tracking-[0.12em] text-cream-hi transition-opacity duration-500 [writing-mode:vertical-rl] md:block ${
                    open ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {L(c, "name")}
                </span>

                {/* Contenido abierto: sólo el nombre + CTA, sin descripción */}
                <div
                  className={`absolute inset-x-0 bottom-0 p-6 transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:p-9 ${
                    open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-100 md:opacity-0"
                  }`}
                >
                  <h3 className="font-display text-2xl leading-tight text-cream-hi md:text-4xl">
                    {L(c, "name")}
                  </h3>
                  <span className="mt-4 block h-px w-16 bg-gold-soft/70" />
                  <span className="mt-4 inline-flex items-center gap-3 border-b border-gold-soft/60 pb-1 text-[10px] tracking-[0.3em] text-cream-hi uppercase transition-colors group-hover:border-gold-soft">
                    {t("cta.viewCollection")}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
