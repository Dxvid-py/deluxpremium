import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Flower2, Gem, Gift, Truck } from "lucide-react";
import PetalCanvas from "./PetalCanvas";
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
    eyebrowEs: "Entrega el mismo día",
    eyebrowEn: "Same-day delivery",
    titleEs: "Llega antes",
    titleEn: "It arrives",
    accentEs: "que las palabras",
    accentEn: "before the words",
    copyEs: "Pide antes de las 2:00 p.m. y lo entregamos hoy, con empaque firmado.",
    copyEn: "Order before 2:00 p.m. and we deliver today, in signed packaging.",
    image: "/img/hero-arch.jpg",
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
    n: "04",
    eyebrowEs: "Empaque firmado Deluxe",
    eyebrowEn: "Signed Deluxe packaging",
    titleEs: "Un regalo",
    titleEn: "A gift",
    accentEs: "que se recuerda",
    accentEn: "to remember",
    copyEs: "Cada pieza viaja en empaque firmado, con tarjeta personalizada y nudo de cinta a mano.",
    copyEn: "Each piece travels in signed packaging, with a personalized card and hand-tied ribbon.",
    image: "/img/prod-06.jpg",
  },
];

const FEATURES = [
  {
    icon: Truck,
    es: ["Entrega el mismo día", "Pide antes de las 2:00 p.m."],
    en: ["Same-day delivery", "Order before 2:00 p.m."],
  },
  {
    icon: Gem,
    es: ["Empaque premium", "Flores protegidas y cuidadas"],
    en: ["Premium packaging", "Protected, cared-for flowers"],
  },
  {
    icon: Flower2,
    es: ["Flores frescas", "Seleccionadas cada día"],
    en: ["Fresh flowers", "Selected every day"],
  },
  {
    icon: Gift,
    es: ["Tarjeta personalizada", "Tu mensaje, tu historia"],
    en: ["Personalized card", "Your message, your story"],
  },
] as const;

const DURATION = 8000;

/**
 * Portada editorial inspirada en el lenguaje de la marca: imagen en arco
 * sobre pedestal, paginación vertical, headline a dos líneas y barra de
 * beneficios flotante. Movimiento sutil (Ken Burns, destello, pétalos).
 */
export default function HeroSlider() {
  const { lang } = useI18n();
  const es = lang === "es";
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
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
      onMouseLeave={() => {
        setPaused(false);
        setTilt({ x: 0, y: 0 });
      }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({
          x: ((e.clientX - r.left) / r.width - 0.5) * 8,
          y: ((e.clientY - r.top) / r.height - 0.5) * -6,
        });
      }}
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
      className="relative isolate overflow-hidden bg-background pt-28 pb-40 sm:pt-32 md:pt-36 md:pb-44"
      aria-roledescription="carrusel"
    >
      <div className="diffused-light pointer-events-none absolute inset-0 opacity-80" />
      <span className="pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,var(--rose-glow),transparent_70%)] blur-3xl" />
      <PetalCanvas density={12} speed={0.5} />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-[1fr_1fr] md:gap-16 md:px-8">
        {/* Texto */}
        <div className="order-2 min-w-0 md:order-1">
          <div className="flex items-center gap-5">
            {/* Paginación vertical */}
            <div className="flex gap-2 sm:flex-col sm:gap-3">
              {SCENES.map((sc, i) => (
                <button
                  key={sc.n}
                  onClick={() => go(i)}
                  aria-label={`${es ? "Escena" : "Scene"} ${sc.n}`}
                  className="group flex items-center gap-2.5"
                >
                  <span
                    className={`font-display text-xs transition-colors ${
                      i === active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {sc.n}
                  </span>
                  <span className="relative block h-px w-8 overflow-hidden bg-border sm:w-px sm:h-8">
                    {i === active && (
                      <span
                        key={`bar-${tick}`}
                        className={`absolute inset-0 block bg-primary ${paused ? "" : "hero-bar"} sm:rotate-90 sm:origin-top`}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p key={`eb-${tick}`} className="hero-in eyebrow mt-7">
            {es ? s.eyebrowEs : s.eyebrowEn}
          </p>

          <h1 className="mt-4 font-display text-[clamp(2.6rem,10vw,3.6rem)] leading-[1.02] md:text-[4.4rem]">
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

          <div key={`rule-${tick}`} className="hero-rule mt-7 h-px w-40 bg-primary/50" />

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
              to="/nosotros"
              className="press inline-flex items-center justify-center border border-border px-7 py-4 text-[11px] tracking-[0.24em] uppercase transition-colors hover:border-primary hover:text-primary"
            >
              {es ? "Ver experiencia Floristería Deluxe" : "Explore the Floristería Deluxe experience"}
            </Link>
          </div>
        </div>

        {/* Retrato en arco sobre pedestal */}
        <div
          className="hero-drift relative order-1 w-full md:order-2"
          style={{
            transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
            transition: "transform 500ms cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="pointer-events-none absolute -inset-5 rounded-[999px_999px_8px_8px] bg-[radial-gradient(circle_at_50%_30%,var(--rose-glow),transparent_68%)] blur-2xl" />
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-[999px] rounded-b-sm shadow-lux ring-1 ring-primary/20 sm:aspect-[3/4]">
            {SCENES.map((sc, i) => (
              <img
                key={`${sc.n}-${i === active ? tick : "off"}`}
                src={sc.image}
                alt={i === active ? (es ? sc.titleEs : sc.titleEn) : ""}
                aria-hidden={i !== active}
                width={900}
                height={1125}
                {...(i === 0 ? {} : { loading: "lazy" as const })}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  i === active ? "hero-ken opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
            {/* Cinta rosa decorativa */}
            <span className="pointer-events-none absolute bottom-10 left-1/2 h-24 w-2.5 -translate-x-1/2 rotate-3 rounded-full bg-[linear-gradient(180deg,var(--rose),var(--blush))] opacity-80 blur-[0.3px]" />
            {/* Destello de luz que cruza */}
            <span className="hero-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cream-hi/45 to-transparent" />
          </div>
          {/* Pedestal */}
          <div className="mx-auto mt-1 h-2.5 w-3/4 rounded-full bg-secondary/70 blur-[1px]" />
          <div className="mx-auto h-1 w-1/2 rounded-full bg-secondary/40 blur-sm" />

          <div
            key={`num-${tick}`}
            className="hero-in absolute -bottom-2 left-1/2 -translate-x-1/2 bg-background px-4 py-1.5 font-display text-xs tracking-[0.4em] text-primary"
          >
            {s.n} / {String(SCENES.length).padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Barra de beneficios flotante */}
      <div className="relative mx-auto mt-14 max-w-6xl px-5 md:mt-20 md:px-8">
        <div
          className="surface-glass grid grid-cols-2 gap-6 rounded-sm px-6 py-6 sm:grid-cols-4 sm:gap-8 md:px-9"
          data-stagger="100"
        >
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-3" data-anim="fade-up">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="font-display text-sm leading-tight text-foreground">
                  {es ? f.es[0] : f.en[0]}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {es ? f.es[1] : f.en[1]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Indicador de scroll */}
      <div className="mt-10 flex flex-col items-center gap-2 text-muted-foreground">
        <span className="text-[10px] tracking-[0.4em] uppercase">
          {es ? "Desliza" : "Scroll"}
        </span>
        <span className="block h-9 w-px bg-gradient-to-b from-primary/60 to-transparent" />
      </div>
    </section>
  );
}
