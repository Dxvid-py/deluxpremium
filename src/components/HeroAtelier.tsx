import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import PetalCanvas from "./PetalCanvas";
import { useI18n } from "@/lib/i18n";

type Scene = {
  n: string;
  eyebrowEs: string;
  eyebrowEn: string;
  line1Es: string;
  line1En: string;
  line2Es: string;
  line2En: string;
  copyEs: string;
  copyEn: string;
  image: string;
  ghost: string;
};

const SCENES: Scene[] = [
  {
    n: "01",
    eyebrowEs: "Floristería Deluxe Premium",
    eyebrowEn: "Deluxe Premium Flower Shop",
    line1Es: "El lujo",
    line1En: "Luxury",
    line2Es: "hecho flor",
    line2En: "made flower",
    copyEs: "Composiciones de autor con flor grado premium, entregadas hoy en Barranquilla.",
    copyEn: "Signature compositions with premium-grade blooms, delivered today in Barranquilla.",
    image: "/img/hero-01.jpg",
    ghost: "DELUXE",
  },
  {
    n: "02",
    eyebrowEs: "Taller de diseño floral",
    eyebrowEn: "Floral design studio",
    line1Es: "Cada tallo",
    line1En: "Every stem",
    line2Es: "elegido a mano",
    line2En: "chosen by hand",
    copyEs: "Selección diaria, hidratación controlada y una paleta cuidadosamente limitada.",
    copyEn: "Daily selection, controlled hydration and a carefully limited palette.",
    image: "/img/hero-02.jpg",
    ghost: "ATELIER",
  },
  {
    n: "03",
    eyebrowEs: "Entrega el mismo día",
    eyebrowEn: "Same-day delivery",
    line1Es: "Llega antes",
    line1En: "It arrives",
    line2Es: "que las palabras",
    line2En: "before the words",
    copyEs: "Pide antes de las 2:00 p.m. y lo entregamos hoy, con empaque firmado.",
    copyEn: "Order before 2:00 p.m. and we deliver today, in signed packaging.",
    image: "/img/prod-06.jpg",
    ghost: "PREMIUM",
  },
];

const DURATION = 7600;

/**
 * Escena principal del sitio: retrato floral con marco de arco, tipografía
 * editorial que entra línea por línea y una línea de tiempo dorada.
 * Diseño propio, en tono claro, distinto al carrusel de colecciones.
 */
export default function HeroAtelier() {
  const { lang } = useI18n();
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
  const es = lang === "es";
  const line1 = es ? s.line1Es : s.line1En;
  const line2 = es ? s.line2Es : s.line2En;

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
      className="hero-atelier relative isolate overflow-hidden bg-background pt-28 pb-16 md:pt-36 md:pb-24"
      aria-roledescription="carrusel"
    >
      <div className="diffused-light pointer-events-none absolute inset-0 opacity-80" />
      <PetalCanvas density={12} speed={0.55} />

      {/* Palabra fantasma de fondo */}
      <span
        key={`ghost-${tick}`}
        aria-hidden
        className="hero-ghost pointer-events-none absolute -right-4 top-24 font-display text-[22vw] leading-none text-foreground/[0.045] select-none"
      >
        {s.ghost}
      </span>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-8">
        {/* Texto */}
        <div>
          <p key={`eb-${tick}`} className="hero-in eyebrow" style={{ animationDelay: "60ms" }}>
            {es ? s.eyebrowEs : s.eyebrowEn}
          </p>

          <h1 className="mt-6 font-display text-5xl leading-[0.95] sm:text-6xl md:text-7xl">
            <span key={`l1-${tick}`} className="hero-mask block">
              <span className="hero-mask-in block">{line1}</span>
            </span>
            <span key={`l2-${tick}`} className="hero-mask mt-1 block">
              <span
                className="hero-mask-in text-lux-gradient block italic"
                style={{ animationDelay: "170ms" }}
              >
                {line2}
              </span>
            </span>
          </h1>

          <div key={`rule-${tick}`} className="hero-rule mt-8 h-px bg-primary/45" />

          <p
            key={`copy-${tick}`}
            className="hero-in mt-7 max-w-md text-base leading-relaxed text-muted-foreground"
            style={{ animationDelay: "320ms" }}
          >
            {es ? s.copyEs : s.copyEn}
          </p>

          <div
            key={`cta-${tick}`}
            className="hero-in mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "440ms" }}
          >
            <Link
              to="/catalogo"
              className="press shine group inline-flex items-center gap-3 bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
            >
              {es ? "Ver catálogo" : "View catalog"}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/contacto"
              className="press border border-border px-8 py-4 text-[11px] tracking-[0.26em] uppercase transition-colors hover:border-primary hover:text-primary"
            >
              {es ? "Pedido a medida" : "Bespoke order"}
            </Link>
          </div>

          {/* Línea de tiempo */}
          <div className="mt-14 flex items-center gap-6">
            {SCENES.map((sc, i) => (
              <button
                key={sc.n}
                onClick={() => go(i)}
                aria-label={`Escena ${sc.n}`}
                className="group flex items-center gap-3"
              >
                <span
                  className={`font-display text-sm transition-colors ${
                    i === active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {sc.n}
                </span>
                <span className="relative block h-px w-14 bg-border">
                  {i === active && (
                    <span
                      key={`bar-${tick}`}
                      className={`absolute inset-y-0 left-0 block bg-primary ${
                        paused ? "w-full" : "hero-progress"
                      }`}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Retrato en arco */}
        <div className="relative mx-auto w-full max-w-md">
          <span className="pointer-events-none absolute -inset-6 rounded-t-[999px] bg-[radial-gradient(circle_at_50%_35%,var(--rose-glow),transparent_68%)] blur-2xl" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-sm shadow-lux ring-1 ring-primary/20">
            {SCENES.map((sc, i) => (
              <img
                key={sc.n}
                src={sc.image}
                alt={i === active ? (es ? sc.line1Es : sc.line1En) : ""}
                aria-hidden={i !== active}
                width={900}
                height={1125}
                {...(i === 0 ? {} : { loading: "lazy" as const })}
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  i === active ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-sm"
                }`}
              />
            ))}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/25 via-transparent to-transparent" />
          </div>

          <div
            key={`num-${tick}`}
            className="hero-in absolute -bottom-5 left-1/2 -translate-x-1/2 bg-background px-5 py-2 font-display text-sm tracking-[0.4em] text-primary"
          >
            {s.n} / {String(SCENES.length).padStart(2, "0")}
          </div>
        </div>
      </div>
    </section>
  );
}
