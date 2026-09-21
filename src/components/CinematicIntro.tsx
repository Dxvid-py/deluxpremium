import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Globe2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PetalCanvas from "./PetalCanvas";
import { useI18n, type Lang } from "@/lib/i18n";
import { settingsQuery } from "@/lib/queries";
import { unlockFlorencioVoice } from "@/lib/florencio-voice";

const SEEN_KEY = "fdp-intro-seen";
const LANG_KEY = "fdp-lang-v1";
const DEFAULT_AUDIO = "/audio/intro-deluxe.mp3";

type IntroMode = "language" | "intro";

export default function CinematicIntro() {
  const { lang, setLang, t } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<IntroMode | null>(null);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showUnlock, setShowUnlock] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabled = settings?.["intro_audio_enabled"] !== "false";
  const audioSrc = settings?.["intro_audio_url"] || DEFAULT_AUDIO;
  const backgroundImage = settings?.["intro_background_image_url"] || "/img/hero-01.jpg";

  useEffect(() => {
    let seen = false;
    let savedLang: Lang | null = null;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      const raw = localStorage.getItem(LANG_KEY);
      if (raw === "es" || raw === "en") savedLang = raw;
    } catch {
      // Ignore unavailable storage.
    }

    if (seen) return undefined;
    setMounted(true);
    document.body.style.overflow = "hidden";
    setMode(savedLang ? "intro" : "language");
    if (savedLang && savedLang !== lang) setLang(savedLang);

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!mounted || mode !== "intro") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = "";
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
      }, 350);
      return undefined;
    }

    const timers = [
      window.setTimeout(() => setStage(1), 180),
      window.setTimeout(() => setStage(2), 900),
      window.setTimeout(() => setStage(3), 2100),
      window.setTimeout(() => setStage(4), 3600),
      window.setTimeout(() => setStage(5), 5200),
      window.setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = "";
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
      }, 6200),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [mounted, mode]);

  useEffect(() => {
    if (!mounted || mode !== "intro" || !enabled) return undefined;
    const el = audioRef.current;
    if (!el) return undefined;
    el.muted = true;
    el.volume = 0.6;
    void el.play().catch(() => undefined);
    setShowUnlock(true);

    const unlockFromGesture = () => {
      unlockFlorencioVoice();
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = false;
      audio.volume = 0.6;
      void audio.play().then(() => {
        setMuted(false);
        setShowUnlock(false);
      }).catch(() => undefined);
    };
    window.addEventListener("pointerdown", unlockFromGesture, { once: true, capture: true });
    window.addEventListener("keydown", unlockFromGesture, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlockFromGesture, true);
      window.removeEventListener("keydown", unlockFromGesture, true);
      el.pause();
    };
  }, [mounted, mode, enabled, audioSrc]);

  const chooseLanguage = async (next: Lang) => {
    setLang(next);
    unlockFlorencioVoice();
    try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
    setStage(0);
    setMode("intro");

    const audio = audioRef.current;
    if (!audio || !enabled) return;
    try {
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 0.6;
      await audio.play();
      setMuted(false);
      setShowUnlock(false);
    } catch {
      setShowUnlock(true);
    }
  };

  const activateAudio = async () => {
    const audio = audioRef.current;
    if (!audio || !enabled) return;
    try {
      unlockFlorencioVoice();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 0.6;
      await audio.play();
      setMuted(false);
      setShowUnlock(false);
    } catch {
      // Intro remains functional without audio.
    }
  };

  const close = () => {
    setStage(5);
    window.setTimeout(() => {
      setMounted(false);
      document.body.style.overflow = "";
      try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    }, 500);
  };

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden bg-background transition-opacity duration-700 ${mode === "intro" && stage >= 5 ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      {mode === "language" ? (
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="diffused-light pointer-events-none absolute inset-0" />
          <div className="relative max-w-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-white/55 text-primary shadow-[0_20px_55px_-35px_rgba(58,35,24,.5)]">
              <Globe2 className="h-5 w-5" />
            </div>
            <p className="eyebrow mt-8">Deluxury · Barranquilla</p>
            <h1 className="mt-4 font-display text-5xl leading-none sm:text-7xl">
              {"Elige tu idioma"}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {"Choose your language"}
            </p>
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void chooseLanguage("es")} className="group rounded-3xl border border-primary/20 bg-white/72 px-6 py-6 text-left shadow-[0_25px_60px_-40px_rgba(58,35,24,.5)] transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white">
                <span className="block text-[9px] tracking-[.22em] text-primary uppercase">ES</span>
                <span className="mt-2 block font-display text-3xl">Español</span>
                <span className="mt-1 block text-xs text-muted-foreground">Entrar en español</span>
              </button>
              <button type="button" onClick={() => void chooseLanguage("en")} className="group rounded-3xl border border-primary/20 bg-white/72 px-6 py-6 text-left shadow-[0_25px_60px_-40px_rgba(58,35,24,.5)] transition hover:-translate-y-1 hover:border-primary/50 hover:bg-white">
                <span className="block text-[9px] tracking-[.22em] text-primary uppercase">EN</span>
                <span className="mt-2 block font-display text-3xl">English</span>
                <span className="mt-1 block text-xs text-muted-foreground">Enter in English</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`absolute inset-0 bg-cover bg-center transition-all duration-[1800ms] ease-out ${stage >= 4 ? "scale-100 opacity-35" : "scale-110 opacity-0"}`} style={{ backgroundImage: `url(${backgroundImage})` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
          <div className="diffused-light absolute inset-0" />
          {stage >= 1 && <PetalCanvas density={36} speed={1.05} burst />}
          <div className="relative flex h-full flex-col items-center justify-center px-5 text-center sm:px-6">
            <div className={`relative transition-all duration-[1200ms] ease-out ${stage >= 2 ? "scale-100 opacity-100 blur-0" : "scale-90 opacity-0 blur-lg"}`}>
              <span className={`pointer-events-none absolute -inset-20 rounded-full bg-[radial-gradient(circle,var(--rose-glow),transparent_65%)] ${stage >= 2 ? "aura-ring" : "opacity-0"}`} />
              <img src="/logo.png" alt="Floristería Deluxury" className="relative h-28 w-auto sm:h-40 md:h-52" />
            </div>
            <p className={`eyebrow mt-8 transition-all duration-1000 sm:mt-10 ${stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>{t("intro.location")}</p>
            <h1 className={`mt-4 font-display text-4xl leading-[1.02] transition-all duration-[1200ms] sm:text-6xl md:text-7xl ${stage >= 3 ? "translate-y-0 opacity-100 blur-0" : "translate-y-6 opacity-0 blur-md"}`}>
              <span className="text-lux-gradient block">Floristería</span>
              <span className="text-lux-gradient mt-1 block tracking-[0.14em]">Deluxury</span>
            </h1>
            <div className={`hairline mt-7 transition-all duration-1000 ${stage >= 4 ? "w-48 opacity-100 sm:w-56" : "w-0 opacity-0"}`} />
            <p className={`mt-5 max-w-md text-sm font-light leading-relaxed text-muted-foreground transition-all duration-1000 ${stage >= 4 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>{t("intro.tagline")}</p>
          </div>
          {enabled && <audio ref={audioRef} src={audioSrc} preload="auto" playsInline loop />}
          {enabled && showUnlock && (
            <button type="button" onClick={() => void activateAudio()} className="press absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2.5 text-[10px] tracking-[0.24em] text-foreground uppercase shadow-sm backdrop-blur-md sm:bottom-6 sm:left-6">
              <Volume2 className="h-4 w-4" /> {lang === "en" ? "Enable sound" : "Activar sonido"}
            </button>
          )}
          {enabled && !showUnlock && (
            <button type="button" onClick={() => { const audio = audioRef.current; if (!audio) return; audio.muted = !audio.muted; setMuted(audio.muted); }} aria-label={t("cta.sound")} className="press absolute bottom-5 left-5 text-[10px] tracking-[0.24em] text-muted-foreground uppercase hover:text-primary sm:bottom-6 sm:left-6">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
          <button type="button" onClick={close} className="press absolute right-5 bottom-5 text-[10px] tracking-[0.24em] text-muted-foreground uppercase hover:text-primary sm:right-6 sm:bottom-6">{t("cta.skipIntro")}</button>
        </>
      )}
    </div>
  );
}
