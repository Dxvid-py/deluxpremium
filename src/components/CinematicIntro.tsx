import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PetalCanvas from "./PetalCanvas";
import { useI18n, type Lang } from "@/lib/i18n";
import { settingsQuery } from "@/lib/queries";
import { getFlorencioAudioEnabled, setFlorencioAudioEnabled } from "@/lib/florencio-voice";

const SEEN_KEY = "fdp-intro-seen";
const LANG_KEY = "fdp-lang-v1";
const DEFAULT_AUDIO = "/audio/intro-deluxe.mp3";

export default function CinematicIntro() {
  const { lang, setLang, t } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const [stage, setStage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [languageGate, setLanguageGate] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(getFlorencioAudioEnabled());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedByGestureRef = useRef(false);

  const enabled = settings?.["intro_audio_enabled"] !== "false";
  const audioSrc = settings?.["intro_audio_url"] || DEFAULT_AUDIO;
  const backgroundImage = settings?.["intro_background_image_url"] || "/img/hero-01.jpg";

  useEffect(() => {
    let savedLang: Lang | null = null;
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "es" || saved === "en") savedLang = saved;
    } catch {
      /* ignore */
    }

    setLanguageGate(!savedLang);
  }, []);

  useEffect(() => {
    const onAudioChanged = (event: Event) => {
      const enabled = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled);
      setAudioEnabled(enabled);
    };
    window.addEventListener("deluxury:audio-changed", onAudioChanged);
    return () => window.removeEventListener("deluxury:audio-changed", onAudioChanged);
  }, []);

  const startIntro = async (selectedLang?: Lang) => {
    const chosen = selectedLang ?? lang;
    if (selectedLang) setLang(selectedLang);

    // Choosing the language is the explicit user gesture that grants site audio.
    setFlorencioAudioEnabled(true);
    setAudioEnabled(true);
    setLanguageGate(false);
    startedByGestureRef.current = true;

    const audio = audioRef.current;
    if (audio && enabled) {
      try {
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = 0.6;
        await audio.play();
      } catch {
        // Some browsers can still reject playback; the experience continues silently.
      }
    }

    void chosen;
  };

  useEffect(() => {
    if (languageGate) return undefined;

    let skip = false;
    try {
      skip = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }

    if (skip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    setMounted(true);
    document.body.style.overflow = "hidden";

    const timers = [
      window.setTimeout(() => setStage(1), 180),
      window.setTimeout(() => setStage(2), 900),
      window.setTimeout(() => setStage(3), 2100),
      window.setTimeout(() => setStage(4), 3600),
      window.setTimeout(() => setStage(5), 5200),
      window.setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = "";
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
      }, 6200),
    ];

    // If a saved language exists, browsers that allow autoplay can start it here.
    if (audioEnabled && enabled && audioRef.current && !startedByGestureRef.current) {
      audioRef.current.muted = false;
      audioRef.current.volume = 0.6;
      void audioRef.current.play().catch(() => undefined);
    }
    startedByGestureRef.current = false;

    return () => {
      timers.forEach(window.clearTimeout);
      document.body.style.overflow = "";
    };
  }, [languageGate]);

  const close = () => {
    const audio = audioRef.current;
    audio?.pause();

    setStage(5);
    window.setTimeout(() => {
      setMounted(false);
      document.body.style.overflow = "";
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 500);
  };

  return (
    <>
      {enabled && (
        <audio ref={audioRef} src={audioSrc} preload="auto" playsInline />
      )}

      {languageGate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background px-5">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[32px] border border-primary/15 bg-white/90 p-7 text-center shadow-[0_35px_100px_-55px_rgba(70,40,20,.5)] backdrop-blur-xl sm:p-10">
            <div className="diffused-light pointer-events-none absolute inset-0 opacity-50" />
            <img src="/logo.png" alt="Floristería Deluxury" className="relative mx-auto h-20 w-auto sm:h-24" />
            <p className="relative mt-7 text-[9px] tracking-[.24em] text-primary uppercase">
              Deluxury
            </p>
            <h1 className="relative mt-3 font-display text-4xl sm:text-5xl">
              Elige tu idioma
            </h1>
            <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Tu elección también habilitará el sonido de la experiencia.
            </p>
            <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void startIntro("es")}
                className="press rounded-2xl bg-primary px-6 py-4 text-[10px] tracking-[.22em] text-primary-foreground uppercase"
              >
                Español
              </button>
              <button
                type="button"
                onClick={() => void startIntro("en")}
                className="press rounded-2xl border border-border bg-background px-6 py-4 text-[10px] tracking-[.22em] uppercase hover:border-primary hover:text-primary"
              >
                English
              </button>
            </div>
            <p className="relative mt-5 text-[9px] text-muted-foreground">
              Puedes silenciarlo después desde Mi cuenta.
            </p>
          </div>
        </div>
      )}

      {mounted && (
        <div
          className={`fixed inset-0 z-[100] overflow-hidden bg-background transition-opacity duration-700 ${
            stage >= 5 ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div
            className={`absolute inset-0 bg-cover bg-center transition-all duration-[1800ms] ease-out ${
              stage >= 4 ? "scale-100 opacity-35" : "scale-110 opacity-0"
            }`}
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
          <div className="diffused-light absolute inset-0" />
          {stage >= 1 && <PetalCanvas density={36} speed={1.05} burst />}

          <div className="relative flex h-full flex-col items-center justify-center px-5 text-center sm:px-6">
            <div
              className={`relative transition-all duration-[1200ms] ease-out ${
                stage >= 2
                  ? "scale-100 opacity-100 blur-0"
                  : "scale-90 opacity-0 blur-lg"
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
                className="relative h-28 w-auto sm:h-40 md:h-52"
              />
            </div>

            <p
              className={`eyebrow mt-8 transition-all duration-1000 sm:mt-10 ${
                stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              {t("intro.location")}
            </p>

            <h1
              className={`mt-4 font-display text-4xl leading-[1.02] transition-all duration-[1200ms] sm:text-6xl md:text-7xl ${
                stage >= 3
                  ? "translate-y-0 opacity-100 blur-0"
                  : "translate-y-6 opacity-0 blur-md"
              }`}
            >
              <span className="text-lux-gradient block">Floristería</span>
              <span className="text-lux-gradient mt-1 block tracking-[0.14em]">
                Deluxury
              </span>
            </h1>

            <div
              className={`hairline mt-7 transition-all duration-1000 ${
                stage >= 4 ? "w-48 opacity-100 sm:w-56" : "w-0 opacity-0"
              }`}
            />

            <p
              className={`mt-5 max-w-md text-sm font-light leading-relaxed text-muted-foreground transition-all duration-1000 ${
                stage >= 4 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              {t("intro.tagline")}
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="press absolute right-5 bottom-5 text-[10px] tracking-[0.24em] text-muted-foreground uppercase hover:text-primary sm:right-6"
          >
            {t("cta.skipIntro")}
          </button>
        </div>
      )}
    </>
  );
}
