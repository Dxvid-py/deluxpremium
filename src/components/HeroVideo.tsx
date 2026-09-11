import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import mobileVideo from "@/assets/video/hero-mobile.mp4.asset.json";
import desktopVideo from "@/assets/video/hero-desktop.mp4.asset.json";

/**
 * Hero de video con fuente distinta por dispositivo:
 * - Móvil  → hero-mobile.mp4  (1080×1440, vertical)
 * - Escritorio → hero-desktop.mp4 (1920×1080, horizontal)
 *
 * El video avanza a velocidad normal y, al llegar al final,
 * retrocede hasta el principio en vez de cortar y reiniciar,
 * así el loop nunca se ve interrumpido. Se usa `playbackRate`
 * negativo (soportado en Chrome/Safari/Firefox).
 */
export default function HeroVideo() {
  const isMobile = useIsMobile();
  const src = isMobile ? mobileVideo.url : desktopVideo.url;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let dir = 1; // 1 = adelante, -1 = atrás

    const flip = () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      if (dir === 1 && v.currentTime >= d - 0.15) {
        dir = -1;
        v.playbackRate = -1;
      } else if (dir === -1 && v.currentTime <= 0.15) {
        dir = 1;
        v.playbackRate = 1;
      }
    };

    v.addEventListener("timeupdate", flip);

    return () => {
      v.removeEventListener("timeupdate", flip);
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
          <p className="eyebrow reveal is-in text-[oklch(0.86_0.02_80)]">Floristería de lujo · Barranquilla</p>
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
              className="border border-[oklch(0.86_0.02_80/0.4)] px-8 py-4 text-[11px] tracking-[0.26em] text-cream uppercase transition-colors hover:border-primary hover:text-primary"
            >
              Pedido a medida
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
