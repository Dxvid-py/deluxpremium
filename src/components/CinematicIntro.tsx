import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import PetalCanvas from "./PetalCanvas";
import { useI18n } from "@/lib/i18n";
import introAudio from "@/assets/intro-deluxe.mp3.asset.json";

const SEEN_KEY = "fdp-intro-seen";

/**
 * Intro cinematográfica: negro absoluto → lluvia de pétalos (canvas) →
 * aparición del logo → revelación de la marca → fotografía floral → salida.
 */
export default function CinematicIntro() {
  const { t } = useI18n();
  const [stage, setStage] = useState(0); // 0 negro, 1 pétalos, 2 logo, 3 marca, 4 foto, 5 salida
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Intenta reproducir el audio de la intro; si el navegador lo bloquea,
  // el primer toque en la pantalla lo activa.
  useEffect(() => {
    if (!mounted) return undefined;
    const el = audioRef.current;
    if (!el) return undefined;
    el.volume = 0.55;
    const play = () => {
      void el.play().catch(() => {
        /* el navegador exige interacción */
      });
    };
    play();
    window.addEventListener("pointerdown", play, { once: true });
    return () => {
      window.removeEventListener("pointerdown", play);
      el.pause();
    };
  }, [mounted]);

  useEffect(() => {
    let skip = false;
    try {
      skip = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignorar */
    }
    if (skip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    setMounted(true);
    document.body.style.overflow = "hidden";

    const timers = [
      window.setTimeout(() => setStage(1), 300),
      window.setTimeout(() => setStage(2), 1200),
      window.setTimeout(() => setStage(3), 2600),
      window.setTimeout(() => setStage(4), 4400),
      window.setTimeout(() => setStage(5), 6200),
      window.setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = "";
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* ignorar */
        }
      }, 7100),
    ];

    return () => {
      timers.forEach((tm) => window.clearTimeout(tm));
      document.body.style.overflow = "";
    };
  }, []);

  const close = () => {
    setStage(5);
    window.setTimeout(() => {
      setMounted(false);
      document.body.style.overflow = "";
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignorar */
      }
    }, 700);
  };

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-100 overflow-hidden bg-[oklch(0.15_0.012_330)] transition-opacity duration-800 ${
        stage >= 5 ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Fotografía floral que emerge de la oscuridad */}
      <div
        className={`absolute inset-0 transition-all duration-2000 ease-out ${
          stage >= 4 ? "scale-100 opacity-55" : "scale-110 opacity-0"
        }`}
        style={{
          backgroundImage: "url(/img/hero-01.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.15_0.012_330/0.88)] via-[oklch(0.15_0.012_330/0.62)] to-[oklch(0.15_0.012_330)]" />
      <div className="diffused-light absolute inset-0" />

      {stage >= 1 && <PetalCanvas density={44} speed={1.35} burst />}

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        {/* Aparición del logo con halo dorado */}
        <div
          className={`relative transition-all duration-1500 ease-out ${
            stage >= 2 ? "scale-100 opacity-100 blur-0" : "scale-90 opacity-0 blur-lg"
          }`}
        >
          <span
            className={`pointer-events-none absolute -inset-20 rounded-full bg-[radial-gradient(circle,var(--rose-glow),transparent_65%)] ${
              stage >= 2 ? "aura-ring" : "opacity-0"
            }`}
          />
          <img
            src="/logo.png"
            alt="Floristería Deluxe Premium"
            className="relative h-40 w-auto sm:h-52 md:h-60"
          />
        </div>

        <p
          className={`eyebrow mt-10 transition-all duration-1200 ${
            stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {t("intro.location")}
        </p>
        <h1
          className={`mt-5 font-display text-4xl leading-[1.05] transition-all duration-1500 sm:text-6xl md:text-7xl ${
            stage >= 3 ? "translate-y-0 opacity-100 blur-0" : "translate-y-6 opacity-0 blur-md"
          }`}
        >
          <span className="text-lux-gradient block">Floristería</span>
          <span className="text-lux-gradient mt-1 block tracking-[0.16em]">Deluxe Premium</span>
        </h1>
        <div
          className={`hairline mt-8 transition-all duration-1200 ${
            stage >= 4 ? "w-56 opacity-100" : "w-0 opacity-0"
          }`}
        />
        <p
          className={`mt-6 max-w-md text-sm font-light text-[oklch(0.86_0.02_80)] transition-all duration-1200 ${
            stage >= 4 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {t("intro.tagline")}
        </p>
      </div>

      <audio ref={audioRef} src={introAudio.url} preload="auto" muted={muted} />

      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={t("cta.sound")}
        className="press absolute bottom-6 left-6 inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[oklch(0.78_0.02_80)] uppercase transition-colors hover:text-primary"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {t("cta.sound")}
      </button>

      <button
        onClick={close}
        className="press absolute right-6 bottom-6 text-[10px] tracking-[0.3em] text-[oklch(0.78_0.02_80)] uppercase transition-colors hover:text-primary"
      >
        {t("cta.skipIntro")}
      </button>
    </div>
  );
}
