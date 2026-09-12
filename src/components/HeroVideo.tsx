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
 * Hero de video en loop "boomerang":
 *
 *   forward → reverse → forward → reverse → ...
 *
 * HTMLVideoElement no tiene un reverse playback fiable entre navegadores.
 * Por eso el reverse es un segundo MP4 cuyos fotogramas ya están invertidos.
 * Ambos vídeos se reproducen siempre hacia delante, evitando los saltos que
 * aparecen al modificar currentTime cuadro a cuadro.
 *
 * Los dos clips comparten el mismo fotograma en cada punto de cambio:
 *   forward termina = reverse comienza
 *   reverse termina = forward comienza
 *
 * Además, el vídeo que va a entrar se reproduce ANTES de hacerlo visible.
 * Esto evita el flash negro/blanco que puede aparecer si el navegador todavía
 * no ha pintado el primer frame del segundo vídeo.
 */
export default function HeroVideo() {
  const isMobile = useIsMobile();
  const src = isMobile ? MOBILE : DESKTOP;

  const forwardRef = useRef<HTMLVideoElement>(null);
  const reverseRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"forward" | "reverse">("forward");

  useEffect(() => {
    const forward = forwardRef.current;
    const reverse = reverseRef.current;

    if (!forward || !reverse) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      forward.pause();
      reverse.pause();
      forward.currentTime = 0;
      setPhase("forward");
      return undefined;
    }

    let cancelled = false;

    const play = async (video: HTMLVideoElement) => {
      video.muted = true;
      video.playsInline = true;
      await video.play();
    };

    const playForward = async () => {
      if (cancelled) return;

      reverse.pause();
      forward.currentTime = 0;

      try {
        await play(forward);
        if (!cancelled) setPhase("forward");
      } catch {
        // El vídeo está muted, así que normalmente autoplay está permitido.
        // Si el navegador lo bloquea, el usuario puede iniciar el vídeo con
        // cualquier interacción sin que la página quede visualmente vacía.
      }
    };

    const playReverse = async () => {
      if (cancelled) return;

      forward.pause();
      reverse.currentTime = 0;

      try {
        // Empezamos a reproducir el reverse antes de mostrarlo. Así el primer
        // frame ya está listo cuando hacemos el cambio de opacidad.
        await play(reverse);
        if (!cancelled) setPhase("reverse");
      } catch {
        // Fallback de seguridad: si el reverse no puede reproducirse, volvemos
        // al forward en lugar de dejar el hero completamente vacío.
        if (!cancelled) void playForward();
      }
    };

    const onForwardEnded = () => void playReverse();
    const onReverseEnded = () => void playForward();

    forward.addEventListener("ended", onForwardEnded);
    reverse.addEventListener("ended", onReverseEnded);

    void playForward();

    return () => {
      cancelled = true;
      forward.pause();
      reverse.pause();
      forward.removeEventListener("ended", onForwardEnded);
      reverse.removeEventListener("ended", onReverseEnded);
    };
  }, [src.forward, src.reverse]);

  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-black">
      {/*
        Ambos vídeos están montados y precargados. El que está detrás permanece
        oculto, pero listo para entrar cuando termine el actual.
      */}
      <video
        ref={forwardRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ease-linear will-change-[opacity] ${
          phase === "forward" ? "opacity-100" : "opacity-0"
        }`}
        src={src.forward}
        poster="/video/hero-poster.jpg"
        muted
        playsInline
        preload="auto"
        aria-hidden={phase !== "forward"}
      />

      <video
        ref={reverseRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ease-linear will-change-[opacity] ${
          phase === "reverse" ? "opacity-100" : "opacity-0"
        }`}
        src={src.reverse}
        poster="/video/hero-poster.jpg"
        muted
        playsInline
        preload="auto"
        aria-hidden={phase !== "reverse"}
      />

      {/* Viñeta cinematográfica: conserva el vídeo visible sin generar la
          pantalla gris/blanca que aparecía cuando terminaba el clip. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

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
