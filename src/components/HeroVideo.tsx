import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type Sources = { forward: string; reverse: string };

const MOBILE: Sources = {
  forward: "/video/hero-mobile.mp4",
  reverse: "/video/hero-mobile-reverse.mp4",
};
const DESKTOP: Sources = {
  forward: "/video/hero-desktop.mp4",
  reverse: "/video/hero-desktop-reverse.mp4",
};

/**
 * Hero de video en loop "boomerang" (avanza y luego retrocede) de verdad
 * fluido. Probamos primero a retroceder el mismo clip pisando
 * `currentTime` cuadro a cuadro con requestAnimationFrame, pero en la
 * práctica cada seek hacia atrás obliga al navegador a redecodificar desde
 * el fotograma clave anterior, y con GOPs largos eso se traduce en
 * cuelgues/tirones reales (lo que se veía: el video se congelaba al llegar
 * al final).
 *
 * La solución fiable: generamos un segundo archivo con los mismos
 * fotogramas *ya invertidos* (`ffmpeg -vf reverse`, ver
 * public/video/hero-*-reverse.mp4) y alternamos entre los dos videos
 * — cada uno se reproduce siempre hacia adelante, que es lo único que
 * todos los navegadores decodifican sin tirones. El cambio entre uno y
 * otro ocurre justo cuando comparten el mismo fotograma (el último de uno
 * es el primero del otro), con un crossfade de 120ms como colchón extra
 * por si el primer fotograma tarda un instante en pintar.
 */
export default function HeroVideo() {
  const isMobile = useIsMobile();
  const src = isMobile ? MOBILE : DESKTOP;
  const forwardRef = useRef<HTMLVideoElement>(null);
  const reverseRef = useRef<HTMLVideoElement>(null);
  const [showReverse, setShowReverse] = useState(false);

  useEffect(() => {
    const fwd = forwardRef.current;
    const rev = reverseRef.current;
    if (!fwd || !rev) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fwd.pause();
      rev.pause();
      return undefined;
    }

    let cancelled = false;

    const playForward = () => {
      if (cancelled) return;
      setShowReverse(false);
      rev.pause();
      fwd.currentTime = 0;
      void fwd.play().catch(() => undefined);
    };

    const playReverse = () => {
      if (cancelled) return;
      setShowReverse(true);
      fwd.pause();
      rev.currentTime = 0;
      void rev.play().catch(() => undefined);
    };

    fwd.addEventListener("ended", playReverse);
    rev.addEventListener("ended", playForward);

    playForward();

    return () => {
      cancelled = true;
      fwd.removeEventListener("ended", playReverse);
      rev.removeEventListener("ended", playForward);
    };
  }, [src]);

  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[oklch(0.1_0.01_330)]">
      <video
        key={`${src.forward}-fwd`}
        ref={forwardRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[120ms] ${
          showReverse ? "opacity-0" : "opacity-100"
        }`}
        src={src.forward}
        poster="/video/hero-poster.jpg"
        muted
        playsInline
        preload="auto"
      />
      <video
        key={`${src.reverse}-rev`}
        ref={reverseRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[120ms] ${
          showReverse ? "opacity-100" : "opacity-0"
        }`}
        src={src.reverse}
        muted
        playsInline
        preload="auto"
      />

      {/* Leve viñeta inferior para que el texto siempre sea legible,
          sin tapar el logo ni el arreglo floral. */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-16 md:px-8 md:pb-20">
        <div className="max-w-xl">
          <p className="eyebrow reveal is-in text-[oklch(0.86_0.02_80)]">
            Floristería de lujo · Barranquilla
          </p>
          <p className="reveal is-in mt-4 max-w-md text-sm leading-relaxed text-[oklch(0.86_0.02_80/0.85)] sm:text-base">
            Composiciones de autor, entrega el mismo día.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              to="/catalogo"
              className="group inline-flex items-center gap-3 bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
            >
              Ver colecciones
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/contacto"
              className="border border-[oklch(0.86_0.02_80/0.4)] px-8 py-4 text-[11px] tracking-[0.26em] text-[oklch(0.86_0.02_80)] uppercase transition-colors hover:border-primary hover:text-primary"
            >
              Pedido a medida
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
