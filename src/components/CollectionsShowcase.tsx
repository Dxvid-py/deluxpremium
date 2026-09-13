import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { categoriesQuery, type Category } from "@/lib/queries";
import { useI18n, useLocalizedContent } from "@/lib/i18n";

const CYCLE_MS = 6500;

/**
 * Carrusel editorial estable para la sección de Floristería del home.
 * Tres tarjetas siempre mantienen su sitio: la central es protagonista y
 * las laterales actúan como adelanto. En móvil se convierte en una sola tarjeta
 * para evitar scroll horizontal de página.
 */
export default function CollectionsShowcase() {
  const { t } = useI18n();
  const { data: categories } = useQuery(categoriesQuery);
  const slides = useMemo<Category[]>(
    () => (categories ?? []).filter((c) => c.is_active).slice(0, 3),
    [categories],
  );
  const L = useLocalizedContent(slides, ["name"]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return undefined;
    const id = window.setInterval(() => setActive((current) => (current + 1) % slides.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  useEffect(() => {
    if (active >= slides.length && slides.length) setActive(0);
  }, [active, slides.length]);

  if (slides.length === 0) return null;

  const go = (offset: number) => setActive((current) => (current + offset + slides.length) % slides.length);

  return (
    <section className="relative overflow-hidden border-y border-border/60 py-20 md:py-28">
      <div className="diffused-light pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="eyebrow" data-anim="left">{t("home.collections.eyebrow")}</p>
            <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl" data-anim="letters">
              {t("home.collections.title1")} <span className="text-lux-gradient italic">{t("home.collections.title2")}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2" data-anim="right">
            <button type="button" onClick={() => go(-1)} aria-label="Anterior" className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur hover:border-primary hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Siguiente" className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur hover:border-primary hover:text-primary">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="relative mt-10 overflow-hidden md:mt-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div className="flex min-w-0 items-stretch gap-3 md:gap-5">
            {slides.map((category, index) => {
              const position = (index - active + slides.length) % slides.length;
              const current = position === 0;
              const next = position === 1;
              const previous = position === slides.length - 1;
              const visible = current || next || previous;

              return (
                <div
                  key={category.id}
                  className={`min-w-0 shrink-0 transition-[width,opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    slides.length === 1 ? "w-full" : current ? "w-full md:w-[64%]" : "w-[84%] md:w-[20%]"
                  } ${visible ? "opacity-100" : "hidden opacity-0 md:block"}`}
                >
                  <Link
                    to="/coleccion/$slug"
                    params={{ slug: category.slug }}
                    className={`group relative block h-[420px] overflow-hidden rounded-sm ring-1 ring-border transition-transform duration-700 md:h-[520px] ${current ? "md:hover:-translate-y-1 md:hover:ring-primary/50" : "md:brightness-[0.72]"}`}
                  >
                    <img src={category.image_url} alt={L(category, "name")} loading={current ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.035]" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {current && <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,transparent,rgba(0,0,0,0.18))]" />}

                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-9">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-[10px] tracking-[0.28em] text-cream-hi/70 uppercase">{String(index + 1).padStart(2, "0")}</span>
                          <h3 className={`mt-2 font-display leading-none text-cream-hi ${current ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl"}`}>{L(category, "name")}</h3>
                        </div>
                        {current && <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cream-hi/40 text-cream-hi md:flex"><ArrowRight className="h-4 w-4" /></span>}
                      </div>
                      {current && <p className="mt-4 text-[10px] tracking-[0.24em] text-cream-hi/80 uppercase">{t("cta.viewCollection")}</p>}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" aria-label="Selector de colecciones">
          {slides.map((category, index) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ir a ${L(category, "name")}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${index === active ? "w-10 bg-primary" : "w-2 bg-border hover:bg-primary/50"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
