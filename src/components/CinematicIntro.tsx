import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PetalCanvas from "./PetalCanvas";
import { useI18n } from "@/lib/i18n";
import { settingsQuery } from "@/lib/queries";

const SEEN_KEY = "fdp-intro-seen";
const DEFAULT_AUDIO = "/audio/intro-deluxe.mp3";

export default function CinematicIntro() {
  const { t } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const [stage, setStage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const enabled = settings?.["intro_audio_enabled"] !== "false";
  const audioSrc = settings?.["intro_audio_url"] || DEFAULT_AUDIO;
  const backgroundImage = settings?.["intro_background_image_url"] || "/img/hero-01.jpg";

  useEffect(() => {
    let skip = false;
    try { skip = sessionStorage.getItem(SEEN_KEY) === "1"; } catch {}
    if (skip || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Intentamos reproducir inmediatamente. Si el navegador bloquea el audio,
  // la primera interacción del usuario con CUALQUIER parte de la página lo
  // desbloquea y hace que la pista continúe desde el principio.
  useEffect(() => {
    if (!mounted || !enabled || !audioRef.current) return;
    const audio = audioRef.current;
    let unlocked = false;

    audio.currentTime = 0;
    audio.volume = 0.6;
    audio.muted = false;

    const startAudio = () => {
      if (unlocked) return;
      unlocked = true;
      audio.currentTime = 0;
      audio.muted = false;
      void audio.play().catch(() => {});
      window.removeEventListener("pointerdown", startAudio, true);
      window.removeEventListener("keydown", startAudio, true);
      window.removeEventListener("touchstart", startAudio, true);
    };

    // Primer intento: sin interacción. Puede funcionar en navegadores que
    // ya permiten audio en este dominio.
    void audio.play().catch(() => {});

    // Si fue bloqueado, cualquier click/tap/tecla de la página sirve como
    // gesto válido del usuario. No mostramos botones ni overlays.
    window.addEventListener("pointerdown", startAudio, true);
    window.addEventListener("keydown", startAudio, true);
    window.addEventListener("touchstart", startAudio, true);

    return () => {
      window.removeEventListener("pointerdown", startAudio, true);
      window.removeEventListener("keydown", startAudio, true);
      window.removeEventListener("touchstart", startAudio, true);
      audio.pause();
    };
  }, [mounted, enabled]);

  // Pre-carga la imagen editable de fondo para que empiece a descargarse
  // cuanto antes, sin cambiar la duración de la intro.
  useEffect(() => {
    if (!mounted || !backgroundImage) return;
    const image = new Image();
    image.decoding = "async";
    image.src = backgroundImage;
  }, [mounted, backgroundImage]);

  useEffect(() => {
    if (!mounted) return;
    const timers = [
      window.setTimeout(() => setStage(1), 180),
      window.setTimeout(() => setStage(2), 900),
      window.setTimeout(() => setStage(3), 2100),
      window.setTimeout(() => setStage(4), 3600),
      window.setTimeout(() => setStage(5), 5200),
      window.setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = "";
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
      }, 6200),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-[100] overflow-hidden bg-background transition-opacity duration-700 ${stage >= 5 ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        decoding="async"
        className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-[1800ms] ease-out ${stage >= 4 ? "scale-100 opacity-45" : "scale-110 opacity-0"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      <div className="diffused-light absolute inset-0" />
      <PetalCanvas density={36} speed={1.05} burst />

      <div className="relative flex h-full flex-col items-center justify-center px-5 text-center sm:px-6">
        <div className={`relative transition-all duration-[1200ms] ease-out ${stage >= 2 ? "scale-100 opacity-100 blur-0" : "scale-90 opacity-0 blur-lg"}`}>
          <span className={`pointer-events-none absolute -inset-20 rounded-full bg-[radial-gradient(circle,var(--rose-glow),transparent_65%)] ${stage >= 2 ? "aura-ring" : "opacity-0"}`} />
          <img src="/logo.png" alt="Floristería Deluxury" className="relative h-28 w-auto sm:h-40 md:h-52" />
        </div>

        <p className={`eyebrow mt-8 transition-all duration-1000 sm:mt-10 ${stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {t("intro.location")}
        </p>

        <h1 className={`mt-4 font-display text-4xl leading-[1.02] transition-all duration-[1200ms] sm:text-6xl md:text-7xl ${stage >= 3 ? "translate-y-0 opacity-100 blur-0" : "translate-y-6 opacity-0 blur-md"}`}>
          <span className="text-lux-gradient block">Floristería</span>
          <span className="text-lux-gradient mt-1 block tracking-[0.14em]">Deluxury</span>
        </h1>

        <div className={`hairline mt-7 transition-all duration-1000 ${stage >= 4 ? "w-48 opacity-100 sm:w-56" : "w-0 opacity-0"}`} />
        <p className={`mt-5 max-w-md text-sm font-light leading-relaxed text-muted-foreground transition-all duration-1000 ${stage >= 4 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {t("intro.tagline")}
        </p>
      </div>

      {enabled && <audio ref={audioRef} src={audioSrc} preload="auto" playsInline />}
    </div>
  );
}
