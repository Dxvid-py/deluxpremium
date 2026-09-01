import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import PetalCanvas from "./PetalCanvas";
import { categoriesQuery, type Category } from "@/lib/queries";
import { useContentTranslator, useI18n } from "@/lib/i18n";

const AUTOPLAY_MS = 8200;

/**
 * Escena cinematográfica de apertura, al estilo "Slider Revolution":
 * fondo con travelling lento, arco dibujado, título letra por letra y la
 * pieza central flotando. Al presionar la pieza se abre la colección.
 */
export default function CollectionRevolution() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: categories } = useQuery(categoriesQuery);

  const slides: Category[] = (categories ?? []).filter((c) => c.is_active).slice(0, 3);
  const tc = useContentTranslator(slides.flatMap((c) => [c.name, c.description]));

  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const go = useCallback(
    (next: number, direction: 1 | -1) => {
      if (slides.length === 0) return;
      setDir(direction);
      setActive(((next % slides.length) + slides.length) % slides.length);
      setTick((n) => n + 1);
    },
    [slides.length],
  );

  const next = useCallback(() => go(active + 1, 1), [active, go]);
  const prev = useCallback(() => go(active - 1, -1), [active, go]);

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const id = window.setTimeout(next, AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [next, paused, slides.length, tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Paralaje suave siguiendo el cursor.
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  };

  if (slides.length === 0) {
    return <section className="h-[70svh] bg-ink/90" aria-hidden />;
  }

  const current = slides[active] as Category;
  const title = tc(current.name).toUpperCase();

  return (
    <section
      ref={rootRef}
      onMouseMove={onMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setPointer({ x: 0, y: 0 });
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        if (start != null && end != null && Math.abs(end - start) > 45) {
          if (end < start) next();
          else prev();
        }
        touchX.current = null;
      }}
      className="rev-stage relative isolate flex h-[100svh] min-h-[560px] w-full items-center justify-center overflow-hidden bg-ink"
      aria-roledescription="carrusel"
      aria-label={t("home.collections.eyebrow")}
    >
      {/* Fondos apilados con travelling lento */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            key={`${s.id}-${i === active ? tick : "idle"}`}
            src={s.image_url}
            alt=""
            aria-hidden
            className={`h-full w-full object-cover ${i === active ? "rev-bg" : ""}`}
            style={{
              transform: `translate3d(${pointer.x * -26}px, ${pointer.y * -18}px, 0)`,
            }}
          />
        </div>
      ))}

      <div className="rev-veil absolute inset-0" />
      <div className="diffused-light absolute inset-0 opacity-70" />
      <PetalCanvas density={18} speed={0.7} />

      {/* Arco dibujado */}
      <svg
        key={`arch-${tick}`}
        viewBox="0 0 400 620"
        preserveAspectRatio="xMidYMax meet"
        className="rev-arch pointer-events-none absolute bottom-0 h-[78%] w-auto opacity-70"
        aria-hidden
      >
        <path
          d="M20 620 L20 250 A180 180 0 0 1 380 250 L380 620"
          fill="none"
          stroke="url(#revGold)"
          strokeWidth="1.2"
        />
        <defs>
          <linearGradient id="revGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.86 0.1 84)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="oklch(0.86 0.1 84)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Título gigante detrás de la pieza */}
      <h2
        key={`title-${tick}`}
        className="pointer-events-none absolute z-20 w-full px-4 text-center font-display text-[clamp(2.1rem,9vw,7.5rem)] leading-none text-cream-hi"
        style={{ transform: `translate3d(${pointer.x * 18}px, ${pointer.y * 10}px, 0)` }}
      >
        <span className="sr-only">{title}</span>
        <span aria-hidden className="inline-flex flex-wrap justify-center">
          {Array.from(title).map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="rev-letter inline-block"
              style={{
                animationDelay: `${360 + i * 46}ms`,
                marginInline: ch === " " ? "0.32em" : "0.055em",
              }}
            >
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </span>
      </h2>

      {/* Pieza central: la colección, presionable */}
      <button
        key={`piece-${tick}`}
        onClick={() => navigate({ to: "/coleccion/$slug", params: { slug: current.slug } })}
        className={`rev-piece group relative z-30 block h-[62%] max-h-[560px] w-[min(58vw,320px)] cursor-pointer ${
          dir === 1 ? "rev-piece-next" : "rev-piece-prev"
        }`}
        style={{
          transform: `translate3d(${pointer.x * 34}px, ${pointer.y * 22}px, 0)`,
        }}
        aria-label={`${t("cta.viewCollection")}: ${tc(current.name)}`}
      >
        <span className="rev-piece-glow pointer-events-none absolute -inset-10 rounded-full" />
        <img
          src={current.image_url}
          alt={tc(current.name)}
          className="rev-piece-img relative h-full w-full rounded-t-[999px] object-cover shadow-lux transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
        />
        <span className="pointer-events-none absolute inset-0 rounded-t-[999px] ring-1 ring-gold-soft/45" />
      </button>

      {/* Sello giratorio */}
      <div className="pointer-events-none absolute top-[16%] right-[6%] z-30 hidden h-28 w-28 md:block lg:h-32 lg:w-32">
        <svg viewBox="0 0 120 120" className="rev-seal h-full w-full">
          <defs>
            <path id="revSealPath" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
          </defs>
          <circle cx="60" cy="60" r="52" fill="none" stroke="oklch(0.86 0.1 84 / 0.4)" />
          <text fill="oklch(0.93 0.05 84)" fontSize="9.5" letterSpacing="3.1">
            <textPath href="#revSealPath">
              {`${t("rev.seal")} · ${t("rev.seal")} · `}
            </textPath>
          </text>
        </svg>
      </div>

      {/* Descripción + CTA */}
      <div
        key={`copy-${tick}`}
        className="absolute inset-x-0 bottom-24 z-30 mx-auto max-w-xl px-6 text-center md:bottom-28"
      >
        <p className="rev-copy text-[11px] tracking-[0.34em] text-gold-soft uppercase">
          {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </p>
        <p className="rev-copy mt-4 text-sm leading-relaxed text-cream-hi/85 md:text-base">
          {tc(current.description)}
        </p>
        <button
          onClick={() => navigate({ to: "/coleccion/$slug", params: { slug: current.slug } })}
          className="rev-copy press shine mt-7 inline-flex items-center gap-3 border border-gold-soft/60 px-8 py-3.5 text-[10px] tracking-[0.3em] text-cream-hi uppercase transition-colors hover:border-gold-soft hover:bg-gold-soft/12"
        >
          {t("cta.viewCollection")} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Flechas */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="rev-arrow group absolute left-3 z-40 flex h-14 w-14 items-center justify-center text-cream-hi md:left-8"
      >
        <ArrowLeft className="h-6 w-6 transition-transform duration-500 group-hover:-translate-x-1.5" />
      </button>
      <button
        onClick={next}
        aria-label="Siguiente"
        className="rev-arrow group absolute right-3 z-40 flex h-14 w-14 items-center justify-center text-cream-hi md:right-8"
      >
        <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-1.5" />
      </button>

      {/* Índice de colecciones */}
      <div className="absolute bottom-7 left-1/2 z-40 flex -translate-x-1/2 items-center gap-5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go(i, i > active ? 1 : -1)}
            aria-label={tc(s.name)}
            className="group flex flex-col items-center gap-2"
          >
            <span
              className={`text-[9px] tracking-[0.3em] uppercase transition-colors ${
                i === active ? "text-gold-soft" : "text-cream-hi/45 group-hover:text-cream-hi/80"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="relative block h-px w-12 bg-cream-hi/25">
              {i === active && (
                <span
                  key={`bar-${tick}`}
                  className={`absolute inset-y-0 left-0 block bg-gold-soft ${paused ? "w-full" : "rev-progress"}`}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
