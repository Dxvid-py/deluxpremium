import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import PetalCanvas from "./PetalCanvas";

type Scene = {
  n: string;
  eyebrow: string;
  title: string;
  accent: string;
  copy: string;
  image: string;
  to: "/catalogo" | "/coleccion/$slug";
  slug?: string;
  cta: string;
};

const SCENES: Scene[] = [
  {
    n: "01",
    eyebrow: "Colección Signature",
    title: "El lujo",
    accent: "florece de noche",
    copy: "Composiciones de autor con rosas premium, entregadas el mismo día en Barranquilla.",
    image: "/img/hero-01.jpg",
    to: "/catalogo",
    cta: "Ver colección",
  },
  {
    n: "02",
    eyebrow: "Elegancia",
    title: "Blanco",
    accent: "absoluto",
    copy: "Orquídeas, lirios y astilbe en cajas marfil con acabados dorados.",
    image: "/img/hero-02.jpg",
    to: "/coleccion/$slug",
    slug: "elegancia",
    cta: "Descubrir elegancia",
  },
  {
    n: "03",
    eyebrow: "Amor & Romance",
    title: "Rosas",
    accent: "a la luz de vela",
    copy: "Para las noches que merecen quedarse en la memoria.",
    image: "/img/hero-03.jpg",
    to: "/coleccion/$slug",
    slug: "amor",
    cta: "Explorar romance",
  },
  {
    n: "04",
    eyebrow: "Atelier",
    title: "Hecho",
    accent: "a mano, siempre",
    copy: "Cada tallo se selecciona, se limpia y se compone en nuestro taller.",
    image: "/img/prod-06.jpg",
    to: "/catalogo",
    cta: "Conocer el atelier",
  },
];

export default function HeroSlider() {
  const [active, setActive] = useState(0);
  const timer = useRef<number | null>(null);

  const go = useCallback((index: number) => {
    setActive(((index % SCENES.length) + SCENES.length) % SCENES.length);
  }, []);

  useEffect(() => {
    timer.current = window.setInterval(() => setActive((a) => (a + 1) % SCENES.length), 7000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden">
      {SCENES.map((scene, i) => (
        <div
          key={scene.n}
          className={`absolute inset-0 transition-all duration-1600 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            i === active ? "scale-100 opacity-100" : "scale-105 opacity-0"
          }`}
        >
          <img
            src={scene.image}
            alt={scene.title}
            width={1600}
            height={1100}
            {...(i === 0 ? {} : { loading: "lazy" as const })}
            className={`h-full w-full object-cover ${i === active ? "ken-burns" : ""}`}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-background/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-background/35" />
      <div className="diffused-light absolute inset-0" />
      <PetalCanvas density={18} speed={0.75} />

      <div className="relative mx-auto flex h-full max-w-7xl items-center px-5 md:px-8">
        <div className="max-w-2xl">
          {SCENES.map((scene, i) => (
            <div
              key={scene.n}
              className={`transition-all duration-1000 ${
                i === active ? "block" : "hidden"
              }`}
            >
              <p className="eyebrow reveal is-in">{scene.eyebrow}</p>
              <h1 className="reveal is-in mt-5 font-display text-5xl leading-[0.98] sm:text-7xl md:text-8xl">
                <span className="block text-cream">{scene.title}</span>
                <span className="text-lux-gradient block italic">{scene.accent}</span>
              </h1>
              <p className="reveal is-in mt-7 max-w-md text-base leading-relaxed text-muted-foreground">
                {scene.copy}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                {scene.slug ? (
                  <Link
                    to="/coleccion/$slug"
                    params={{ slug: scene.slug }}
                    className="group inline-flex items-center gap-3 bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
                  >
                    {scene.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <Link
                    to="/catalogo"
                    className="group inline-flex items-center gap-3 bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
                  >
                    {scene.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
                <Link
                  to="/contacto"
                  className="border border-border px-8 py-4 text-[11px] tracking-[0.26em] uppercase transition-colors hover:border-primary hover:text-primary"
                >
                  Pedido a medida
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paginación enumerada 01–04 */}
      <div className="absolute right-5 bottom-10 flex items-end gap-5 md:right-8">
        {SCENES.map((scene, i) => (
          <button
            key={scene.n}
            onClick={() => go(i)}
            className="group flex flex-col items-center gap-2"
            aria-label={`Escena ${scene.n}`}
          >
            <span
              className={`font-display text-sm transition-colors ${
                i === active ? "text-primary" : "text-muted-foreground group-hover:text-cream"
              }`}
            >
              {scene.n}
            </span>
            <span
              className={`h-px transition-all duration-700 ${
                i === active ? "w-12 bg-primary" : "w-5 bg-border group-hover:w-8"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
