import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Scene = {
  n: string;
  eyebrowEs: string;
  eyebrowEn: string;
  titleEs: string;
  titleEn: string;
  accentEs: string;
  accentEn: string;
  copyEs: string;
  copyEn: string;
  image: string;
};

const SCENES: Scene[] = [
  {
    n: "01",
    eyebrowEs: "Floristería Deluxe Premium",
    eyebrowEn: "Deluxe Premium Flower Shop",
    titleEs: "El lujo",
    titleEn: "Luxury",
    accentEs: "hecho flor",
    accentEn: "made flower",
    copyEs: "Composiciones de autor con flor grado premium, entregadas hoy en Barranquilla.",
    copyEn: "Signature compositions with premium blooms, delivered today in Barranquilla.",
    image: "/img/hero-01.jpg",
  },
  {
    n: "02",
    eyebrowEs: "Taller de diseño floral",
    eyebrowEn: "Floral design studio",
    titleEs: "Cada tallo",
    titleEn: "Every stem",
    accentEs: "elegido a mano",
    accentEn: "chosen by hand",
    copyEs: "Selección diaria, hidratación controlada y una paleta cuidadosamente limitada.",
    copyEn: "Daily selection, controlled hydration and a carefully limited palette.",
    image: "/img/hero-02.jpg",
  },
  {
    n: "03",
    eyebrowEs: "Entrega el mismo día",
    eyebrowEn: "Same-day delivery",
    titleEs: "Llega antes",
    titleEn: "It arrives",
    accentEs: "que las palabras",
    accentEn: "before the words",
    copyEs: "Pide antes de las 2:00 p.m. y lo entregamos hoy, con empaque firmado.",
    copyEn: "Order before 2:00 p.m. and we deliver today, in signed packaging.",
    image: "/img/prod-06.jpg",
  },
];

const DURATION = 7000;

/**
 * Hero limpio: una sola imagen grande, tipografía tranquila y transición suave.
 * Sin adornos: fondo claro, mucho aire y controles discretos.
 */
export default function HeroAtelier() {
  const { lang } = useI18n();
  const es = lang === "es";
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((i: number) => {
    setActive(((i % SCENES.length) + SCENES.length) % SCENES.length);
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setTimeout(() => go(active + 1), DURATION);
    return () => window.clearTimeout(id);
  }, [active, go, paused, tick]);

  const s = SCENES[active] as Scene;

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        if (start != null && end != null && Math.abs(end - start) > 45)
          go(active + (end < start ? 1 : -1));
        touchX.current = null;
      }}
      className="relative isolate overflow-hidden bg-background pt-24 pb-14 sm:pt-28 md:pt-36 md:pb-24"
      aria-roledescription="carrusel"
    >
      <div className="diffused-light pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2 md:gap-16 md:px-8">
        {/* Texto */}
        <div className="order-2 min-w-0 md:order-1">
          <p key={`eb-${tick}`} className="hero-in eyebrow">
            {es ? s.eyebrowEs : s.eyebrowEn}
          </p>

          <h1 className="mt-5 font-display text-[clamp(2.4rem,9vw,3.2rem)] leading-[1.02] md:text-6xl">
            <span key={`l1-${tick}`} className="hero-mask block">
              <span className="hero-mask-in block">{es ? s.titleEs : s.titleEn}</span>
            </span>
            <span key={`l2-${tick}`} className="hero-mask block">
              <span
                className="hero-mask-in text-lux-gradient block italic"
                style={{ animationDelay: "150ms" }}
              >
                {es ? s.accentEs : s.accentEn}
              </span>
            </span>
          </h1>

          <p
            key={`copy-${tick}`}
            className="hero-in mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground md:text-base"
            style={{ animationDelay: "260ms" }}
          >
            {es ? s.copyEs : s.copyEn}
          </p>

          <div
            key={`cta-${tick}`}
            className="hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            style={{ animationDelay: "380ms" }}
          >
            <Link
              to="/catalogo"
              className="press shine group inline-flex items-center justify-center gap-3 bg-primary px-7 py-4 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
            >
              {es ? "Ver catálogo" : "View catalog"}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/contacto"
              className="press inline-flex items-center justify-center border border-border px-7 py-4 text-[11px] tracking-[0.24em] uppercase transition-colors hover:border-primary hover:text-primary"
            >
              {es ? "Pedido a medida" : "Bespoke order"}
            </Link>
          </div>

          {/* Controles discretos */}
          <div className="mt-10 flex items-center gap-3">
            {SCENES.map((sc, i) => (
              <button
                key={sc.n}
                onClick={() => go(i)}
                aria-label={`${es ? "Escena" : "Scene"} ${sc.n}`}
                className="py-2"
              >
                <span
                  className={`block h-px transition-all duration-500 ${
                    i === active ? "w-12 bg-primary" : "w-6 bg-border hover:bg-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Imagen */}
        <div className="relative order-1 w-full md:order-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm shadow-lux ring-1 ring-border sm:aspect-[3/4]">
            {SCENES.map((sc, i) => (
              <img
                key={sc.n}
                src={sc.image}
                alt={i === active ? (es ? sc.titleEs : sc.titleEn) : ""}
                aria-hidden={i !== active}
                width={900}
                height={1125}
                {...(i === 0 ? {} : { loading: "lazy" as const })}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  i === active ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
