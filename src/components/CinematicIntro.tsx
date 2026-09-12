import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import PetalCanvas from "./PetalCanvas";
import { useI18n } from "@/lib/i18n";
import introAudio from "@/assets/intro-deluxe.mp3.asset.json";

const SEEN_KEY = "fdp-intro-seen";

/**
 * Intro cinematográfica en tono claro: marfil → lluvia de pétalos →
 * aparición del logo → revelación de la marca → salida suave.
 * El audio arranca en silencio (política del navegador) y se activa solo.
 */
export default function CinematicIntro() {
  const { t } = useI18n();
  const [stage, setStage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showUnlock, setShowUnlock] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reproducción con desbloqueo: el navegador bloquea el sonido automático,
  // pero SÍ permite el autoplay silenciado. Arrancamos en silencio y lo
  // activamos al primer gesto del visitante (un clic/tap en cualquier parte
  // o en el botón de sonido). Así el audio siempre se escucha cuando hay
  // interacción, sin depender del formato del archivo.
  useEffect(() => {
    if (!mounted) return undefined;
    const el = audioRef.current;
    if (!el) return undefined;

    // Arranca silenciado: autoplay permitido por la política del navegador.
    el.muted = true;
    el.volume = 0.55;
    void el.play().then(() => setShowUnlock(true)).catch(() => {
      // Si incluso silenciado bloquea, esperamos al primer gesto.
      setShowUnlock(true);
    });

    const fadeIn = () => {
      const id = window.setInterval(() => {
        if (!audioRef.current) return window.clearInterval(id);
        const next = Math.min(0.55, audioRef.current.volume + 0.05);
        audioRef.current.volume = next;
        if (next >= 0.55) window.clearInterval(id);
        return undefined;
      }, 90);
    };

    const unlock = () => {
      const a = audioRef.current;
      if (!a) return;
      a.muted = false;
      a.volume = 0;
      void a.play().then(() => {
        setMuted(false);
        fadeIn();
      }).catch(() => undefined);
      setShowUnlock(false);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      window.setTimeout(() => setStage(1), 250),
      window.setTimeout(() => setStage(2), 1000),
      window.setTimeout(() => setStage(3), 2300),
      window.setTimeout(() => setStage(4), 3900),
      window.setTimeout(() => setStage(5), 5600),
      window.setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = "";
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* ignorar */
        }
      }, 6500),
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
      className={`fixed inset-0 z-100 overflow-hidden bg-background transition-opacity duration-1000 ${
        stage >= 5 ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Fotografía floral que emerge del marfil */}
      <div
        className={`absolute inset-0 transition-all duration-[2000ms] ease-out ${
          stage >= 4 ? "scale-100 opacity-35" : "scale-110 opacity-0"
        }`}
        style={{
          backgroundImage: "url(/img/hero-01.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      <div className="diffused-light absolute inset-0" />

      {stage >= 1 && <PetalCanvas density={40} speed={1.2} burst />}

      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div
          className={`relative transition-all duration-[1500ms] ease-out ${
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
            alt="Floristería Deluxury"
            className="relative h-36 w-auto sm:h-48 md:h-56"
          />
        </div>

        <p
          className={`eyebrow mt-10 transition-all duration-1000 ${
            stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {t("intro.location")}
        </p>
        <h1
          className={`mt-5 font-display text-4xl leading-[1.05] transition-all duration-[1400ms] sm:text-6xl md:text-7xl ${
            stage >= 3 ? "translate-y-0 opacity-100 blur-0" : "translate-y-6 opacity-0 blur-md"
          }`}
        >
          <span className="text-lux-gradient block">Floristería</span>
          <span className="text-lux-gradient mt-1 block tracking-[0.16em]">Deluxury</span>
        </h1>
        <div
          className={`hairline mt-8 transition-all duration-1000 ${
            stage >= 4 ? "w-56 opacity-100" : "w-0 opacity-0"
          }`}
        />
        <p
          className={`mt-6 max-w-md text-sm font-light text-muted-foreground transition-all duration-1000 ${
            stage >= 4 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {t("intro.tagline")}
        </p>
      </div>

      <audio ref={audioRef} src={introAudio.url} preload="auto" playsInline loop />

      {/* Aviso para activar el sonido al primer gesto */}
      {showUnlock && (
        <button
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            a.muted = false;
            a.volume = 0;
            void a.play().then(() => {
              setMuted(false);
              setShowUnlock(false);
              const id = window.setInterval(() => {
                if (!audioRef.current) return window.clearInterval(id);
                const next = Math.min(0.55, audioRef.current.volume + 0.05);
                audioRef.current.volume = next;
                if (next >= 0.55) window.clearInterval(id);
                return undefined;
              }, 90);
            }).catch(() => undefined);
          }}
          className="press absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-[10px] tracking-[0.3em] text-foreground uppercase backdrop-blur transition-colors hover:border-primary hover:text-primary"
        >
          <Volume2 className="h-4 w-4 animate-pulse" />
          {t("cta.sound")}
        </button>
      )}

      {!showUnlock && (
        <button
          onClick={() => {
            setMuted((m) => {
              const next = !m;
              if (audioRef.current) {
                audioRef.current.muted = next;
                if (!next) void audioRef.current.play().catch(() => undefined);
              }
              return next;
            });
          }}
          aria-label={t("cta.sound")}
          className="press absolute bottom-6 left-6 inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-muted-foreground uppercase transition-colors hover:text-primary"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {t("cta.sound")}
        </button>
      )}

      <button
        onClick={close}
        className="press absolute right-6 bottom-6 text-[10px] tracking-[0.3em] text-muted-foreground uppercase transition-colors hover:text-primary"
      >
        {t("cta.skipIntro")}
      </button>
    </div>
  );
}
