import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type Sources = {
  forward: string;
  reverse: string;
  bridgeForward: string;
  bridgeReverse: string;
};

const MOBILE: Sources = {
  forward: "/video/hero-mobile.mp4",
  reverse: "/video/hero-mobile-reverse.mp4",
  bridgeForward: "/video/hero-mobile-transition-forward.jpg",
  bridgeReverse: "/video/hero-mobile-transition-reverse.jpg",
};

const DESKTOP: Sources = {
  forward: "/video/hero-desktop.mp4",
  reverse: "/video/hero-desktop-reverse.mp4",
  bridgeForward: "/video/hero-desktop-transition-forward.jpg",
  bridgeReverse: "/video/hero-desktop-transition-reverse.jpg",
};

/**
 * Seamless visual loop: forward → reverse → forward → …
 *
 * The transition stills are real frames extracted from the corresponding
 * hero clips. They sit above both <video> elements while the incoming clip
 * is primed, preventing the decoder/visibility flash that can appear when
 * swapping videos on mobile and desktop browsers.
 */
export default function HeroVideo() {
  const isMobile = useIsMobile();
  const src = isMobile ? MOBILE : DESKTOP;
  const forwardRef = useRef<HTMLVideoElement>(null);
  const reverseRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"forward" | "reverse">("forward");
  const [bridgeVisible, setBridgeVisible] = useState(true);
  const [bridgeSrc, setBridgeSrc] = useState(src.bridgeForward);

  useEffect(() => {
    setPhase("forward");
    setBridgeSrc(src.bridgeForward);
    setBridgeVisible(true);
  }, [src.forward, src.reverse, src.bridgeForward, src.bridgeReverse]);

  useEffect(() => {
    const forward = forwardRef.current;
    const reverse = reverseRef.current;
    if (!forward || !reverse) return undefined;

    let cancelled = false;
    let switching = false;

    const waitForReady = (video: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          resolve();
          return;
        }
        const done = () => {
          video.removeEventListener("loadeddata", done);
          video.removeEventListener("canplay", done);
          resolve();
        };
        video.addEventListener("loadeddata", done, { once: true });
        video.addEventListener("canplay", done, { once: true });
        video.load();
      });

    const waitForFirstPaint = (video: HTMLVideoElement) =>
      new Promise<void>((resolve) => {
        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback(() => resolve());
          return;
        }
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

    const prime = async (video: HTMLVideoElement, startAt = 0) => {
      video.muted = true;
      video.playsInline = true;
      video.pause();
      try {
        video.currentTime = startAt;
      } catch {
        // Browser may not have seekable metadata yet; load below will handle it.
      }
      await waitForReady(video);
      if (cancelled) return false;

      try {
        await video.play();
        await waitForFirstPaint(video);
        video.pause();
        return true;
      } catch {
        return false;
      }
    };

    const finishInitialLoad = async () => {
      const ready = await prime(forward, 0);
      if (cancelled) return;
      if (ready) {
        await forward.play().catch(() => undefined);
        await waitForFirstPaint(forward);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        if (!cancelled) setBridgeVisible(false);
      } else {
        // Keep the real first-frame image visible if autoplay cannot start.
        // A later user interaction can still start the video naturally.
        setBridgeVisible(false);
      }
    };

    const switchTo = async (next: "forward" | "reverse") => {
      if (cancelled || switching) return;
      switching = true;

      const nextVideo = next === "forward" ? forward : reverse;
      const oldVideo = next === "forward" ? reverse : forward;
      const nextBridge = next === "forward" ? src.bridgeForward : src.bridgeReverse;

      setBridgeSrc(nextBridge);
      setBridgeVisible(true);

      const ready = await prime(nextVideo, 0);
      if (cancelled) return;

      oldVideo.pause();
      setPhase(next);

      try {
        await nextVideo.play();
        await waitForFirstPaint(nextVideo);
      } catch {
        // Keep the bridge frame visible until the browser allows playback.
      }

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      if (!cancelled) setBridgeVisible(false);

      if (!ready) {
        window.setTimeout(() => {
          void nextVideo.play().catch(() => undefined);
        }, 180);
      }

      switching = false;
    };

    const onForwardEnded = () => void switchTo("reverse");
    const onReverseEnded = () => void switchTo("forward");

    forward.addEventListener("ended", onForwardEnded);
    reverse.addEventListener("ended", onReverseEnded);

    forward.load();
    reverse.load();
    void finishInitialLoad();

    return () => {
      cancelled = true;
      forward.pause();
      reverse.pause();
      forward.removeEventListener("ended", onForwardEnded);
      reverse.removeEventListener("ended", onReverseEnded);
    };
  }, [src.forward, src.reverse, src.bridgeForward, src.bridgeReverse]);

  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-foreground">
      <img
        src={src.bridgeForward}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 z-20 h-full w-full object-cover transition-opacity duration-150 ${
          bridgeVisible && bridgeSrc === src.bridgeForward ? "opacity-100" : "opacity-0"
        }`}
      />
      <img
        src={src.bridgeReverse}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 z-20 h-full w-full object-cover transition-opacity duration-150 ${
          bridgeVisible && bridgeSrc === src.bridgeReverse ? "opacity-100" : "opacity-0"
        }`}
      />

      <video
        ref={forwardRef}
        className={`absolute inset-0 z-10 h-full w-full object-cover will-change-[opacity] transition-opacity duration-75 ease-linear ${
          phase === "forward" ? "opacity-100" : "opacity-0"
        }`}
        src={src.forward}
        muted
        playsInline
        preload="auto"
        poster={src.bridgeForward}
        aria-hidden={phase !== "forward"}
      />
      <video
        ref={reverseRef}
        className={`absolute inset-0 z-10 h-full w-full object-cover will-change-[opacity] transition-opacity duration-75 ease-linear ${
          phase === "reverse" ? "opacity-100" : "opacity-0"
        }`}
        src={src.reverse}
        muted
        playsInline
        preload="auto"
        poster={src.bridgeReverse}
        aria-hidden={phase !== "reverse"}
      />

      <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-t from-black/85 via-black/18 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle_at_50%_15%,transparent_0%,rgba(0,0,0,0.08)_55%,rgba(0,0,0,0.35)_100%)]" />

      <div className="relative z-40 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-16 md:px-8 md:pb-20">
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
