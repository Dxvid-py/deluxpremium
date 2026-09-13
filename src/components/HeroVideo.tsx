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
 * Hero boomerang estable:
 * forward → reverse → forward → …
 *
 * Cada clip es un archivo independiente. Preparamos y empezamos a decodificar
 * el siguiente clip antes de cambiar la opacidad, y usamos requestVideoFrameCallback
 * cuando está disponible para esperar a que el primer frame ya haya sido pintado.
 * Esto elimina el flash negro que aparecía al reiniciar el vídeo.
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

    const waitForCanPlay = (video: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve();
          return;
        }
        const done = () => {
          video.removeEventListener("canplay", done);
          video.removeEventListener("loadeddata", done);
          resolve();
        };
        video.addEventListener("canplay", done, { once: true });
        video.addEventListener("loadeddata", done, { once: true });
        video.load();
      });

    const waitForPaint = (video: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        const rvfc = video.requestVideoFrameCallback;
        if (rvfc) {
          rvfc.call(video, () => resolve());
          return;
        }
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

    const prepare = async (video: HTMLVideoElement) => {
      video.muted = true;
      video.playsInline = true;
      video.pause();
      video.currentTime = 0;
      await waitForCanPlay(video);
      if (cancelled) return;
      try {
        await video.play();
        await waitForPaint(video);
      } catch {
        // El autoplay está silenciado; si el navegador aún lo bloquea, el
        // siguiente ciclo volverá a intentarlo sin dejar un fondo negro.
      }
    };

    const switchTo = async (next: "forward" | "reverse") => {
      if (cancelled) return;
      const nextVideo = next === "forward" ? forward : reverse;
      const oldVideo = next === "forward" ? reverse : forward;

      try {
        await prepare(nextVideo);
        if (cancelled) return;
        oldVideo.pause();
        setPhase(next);
      } catch {
        if (!cancelled) setPhase(next);
      }
    };

    const onForwardEnded = () => void switchTo("reverse");
    const onReverseEnded = () => void switchTo("forward");

    forward.addEventListener("ended", onForwardEnded);
    reverse.addEventListener("ended", onReverseEnded);

    // Precalentamos ambos elementos para reducir al mínimo los huecos entre clips.
    forward.load();
    reverse.load();
    void prepare(forward);
    void prepare(reverse).then(() => reverse.pause());

    return () => {
      cancelled = true;
      forward.pause();
      reverse.pause();
      forward.removeEventListener("ended", onForwardEnded);
      reverse.removeEventListener("ended", onReverseEnded);
    };
  }, [src.forward, src.reverse]);

  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-foreground">
      {/* Imagen de respaldo: el usuario nunca llega a ver negro mientras el navegador decodifica. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/img/hero-01.jpg)" }}
      />

      <video
        ref={forwardRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[220ms] ease-out will-change-[opacity] ${
          phase === "forward" ? "opacity-100" : "opacity-0"
        }`}
        src={src.forward}
        muted
        playsInline
        preload="auto"
        aria-hidden={phase !== "forward"}
      />

      <video
        ref={reverseRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[220ms] ease-out will-change-[opacity] ${
          phase === "reverse" ? "opacity-100" : "opacity-0"
        }`}
        src={src.reverse}
        muted
        playsInline
        preload="auto"
        aria-hidden={phase !== "reverse"}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/18 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,transparent_0%,rgba(0,0,0,0.08)_55%,rgba(0,0,0,0.35)_100%)]" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-16 md:px-8 md:pb-20">
        <div className="max-w-xl">
          <p className="eyebrow reveal is-in text-[oklch(0.86_0.02_80)]">Floristería de lujo · Barranquilla</p>
          <p className="reveal is-in mt-4 max-w-md text-sm leading-relaxed text-[oklch(0.86_0.02_80/0.85)] sm:text-base">
            Composiciones de autor, entrega el mismo día.
          </p>

          <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <Link
              to="/catalogo"
              className="group inline-flex w-full items-center justify-center gap-3 bg-primary px-7 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase transition-opacity hover:opacity-90 sm:w-auto"
            >
              Ver colecciones
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/contacto"
              className="inline-flex w-full items-center justify-center border border-[oklch(0.86_0.02_80/0.4)] px-7 py-4 text-[11px] tracking-[0.26em] text-[oklch(0.86_0.02_80)] uppercase transition-colors hover:border-primary hover:text-primary sm:w-auto"
            >
              Pedido a medida
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
