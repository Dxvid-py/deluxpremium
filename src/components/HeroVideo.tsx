import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const MOBILE_SRC = "/video/hero-mobile.mp4";
const DESKTOP_SRC = "/video/hero-desktop.mp4";

/**
 * Hero de video con fuente distinta por dispositivo:
 * - Móvil     → hero-mobile.mp4  (1080×1440, vertical)
 * - Escritorio → hero-desktop.mp4 (1920×1080, horizontal)
 *
 * El video avanza y, al llegar al final, retrocede hasta el principio en
 * vez de cortar y reiniciar, así el loop nunca se ve interrumpido (efecto
 * "boomerang"). Importante: NO usamos `playbackRate = -1`. Aunque la spec
 * de HTML5 lo permite, casi ningún navegador decodifica vídeo hacia atrás
 * de forma fluida con eso — es exactamente lo que causaba los cortes y
 * pausas que se veían antes. En su lugar, cuando el video llega al final
 * lo pausamos y retrocedemos manualmente el `currentTime` cuadro a cuadro
 * con requestAnimationFrame, que sí es fluido y funciona igual en todos
 * los navegadores.
 */
export default function HeroVideo() {
  const isMobile = useIsMobile();
  const src = isMobile ? MOBILE_SRC : DESKTOP_SRC;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return undefined;
    }

    const EDGE = 0.05; // margen en segundos para evitar quedar "pegado" en los extremos
    let dir: 1 | -1 = 1;
    let reversing = false;
    let last = 0;
    let raf = 0;

    const stepReverse = (now: number) => {
      if (!reversing) return;
      if (!last) last = now;
      const dt = (now - last) / 1000;
      last = now;
      const next = v.currentTime - dt;

      if (next <= EDGE) {
        reversing = false;
        dir = 1;
        v.currentTime = 0;
        void v.play().catch(() => undefined);
        return;
      }
      v.currentTime = next;
      raf = requestAnimationFrame(stepReverse);
    };

    const onTimeUpdate = () => {
      if (reversing) return;
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      if (dir === 1 && v.currentTime >= d - EDGE) {
        v.pause();
        dir = -1;
        reversing = true;
        last = 0;
        raf = requestAnimationFrame(stepReverse);
      }
    };

    // Si el navegador pausa el video por cualquier motivo mientras debería
    // ir hacia adelante (el "se pausa" que se veía antes), lo retomamos.
    const onPause = () => {
      if (!reversing && document.visibilityState === "visible") {
        void v.play().catch(() => undefined);
      }
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("pause", onPause);
    void v.play().catch(() => undefined);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("pause", onPause);
      cancelAnimationFrame(raf);
    };
  }, [src]);

  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[oklch(0.1_0.01_330)]">
      <video
        key={src}
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        poster="/video/hero-poster.jpg"
        autoPlay
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
