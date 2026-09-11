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
 * El video se reproduce lento (0.6×) y en bucle "ping-pong":
 * avanza hasta el final, retrocede hasta el principio, avanza de
 * nuevo… así el loop nunca se ve cortado. Se usa `playbackRate`
 * negativo (soportado en Chrome/Safari/Firefox) para el retroceso
 * fluido; si el navegador no lo soporta, se hace scrub manual.
 */
const PLAY_RATE = 0.6;

export default function HeroVideo() {
  const isMobile = useIsMobile();
  const src = isMobile ? mobileVideo.url : desktopVideo.url;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let dir = 1; // 1 = adelante, -1 = atrás
    let rafId = 0;
    let last = 0;
    let manual = false;

    const setRate = () => {
      const target = PLAY_RATE * dir;
      try {
        v.playbackRate = target;
      } catch {
        /* noop */
      }
      // Si el navegador rechazó el valor negativo, caemos a scrub manual
      if (dir === -1 && v.playbackRate >= 0) {
        manual = true;
        v.pause();
      } else {
        manual = false;
        if (v.paused) v.play().catch(() => {});
      }
    };

    const onTick = (now: number) => {
      rafId = 0;
      if (!manual) return;
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      v.currentTime = Math.max(0, v.currentTime - PLAY_RATE * dt);
      if (v.currentTime <= 0.02) {
        dir = 1;
        manual = false;
        last = 0;
        v.playbackRate = PLAY_RATE;
        v.play().catch(() => {});
        return;
      }
      rafId = requestAnimationFrame(onTick);
    };

    const onTime = () => {
      if (manual) return;
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      if (dir === 1 && v.currentTime >= d - 0.08) {
        dir = -1;
        last = 0;
        setRate();
        if (manual) {
          rafId = requestAnimationFrame(onTick);
        }
      } else if (dir === -1 && v.currentTime <= 0.08) {
        dir = 1;
        v.playbackRate = PLAY_RATE;
        if (v.paused) v.play().catch(() => {});
      }
    };

    const onLoaded = () => {
      v.playbackRate = PLAY_RATE;
      v.play().catch(() => {});
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);

    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      if (rafId) cancelAnimationFrame(rafId);
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
