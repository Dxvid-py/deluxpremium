import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X, Volume2 } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { playFlorencioVoice, unlockFlorencioVoice, type FlorencioVoiceKey } from "@/lib/florencio-voice";

const SALUDANDO_VIDEO = "/video/florencio-saludando.webm";
const RAMO_VIDEO = "/video/florencio-con-ramo.webm";
const GREETING_EVERY_MS = 15_000;
const DISPLAY_MS = 5_500;
const PRODUCT_DISPLAY_MS = 6_500;

type FlorencioMode = "greeting" | "product";
type ProductSelectedEvent = CustomEvent<{ name?: string }>;

type VoiceMessage = { text: string; voice: FlorencioVoiceKey };

const GREETING_MESSAGES: Record<"es" | "en", VoiceMessage[]> = {
  es: [
    { text: "Hola, soy Florencio. Bienvenido a Deluxury.", voice: "greeting" },
    { text: "¿Buscas un detalle especial?", voice: "looking" },
    { text: "Cuéntame qué ocasión tienes en mente.", voice: "ask" },
  ],
  en: [
    { text: "Hi, I'm Florencio. Welcome to Deluxury.", voice: "greeting" },
    { text: "Looking for something special?", voice: "looking" },
    { text: "Tell me what occasion you have in mind.", voice: "ask" },
  ],
};

const PRODUCT_MESSAGES: Record<"es" | "en", VoiceMessage[]> = {
  es: [
    { text: "¡Excelente elección!", voice: "choice" },
    { text: "Ese detalle se ve precioso.", voice: "choice" },
    { text: "Elegiste algo muy especial.", voice: "choice" },
  ],
  en: [
    { text: "Beautiful choice!", voice: "choice" },
    { text: "That looks lovely.", voice: "choice" },
    { text: "You chose something special.", voice: "choice" },
  ],
};

function randomMessage(messages: VoiceMessage[]) {
  return messages[Math.floor(Math.random() * messages.length)] ?? messages[0];
}

export default function FlorencioWidget() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const [mode, setMode] = useState<FlorencioMode | null>(null);
  const [message, setMessage] = useState("");
  const [voice, setVoice] = useState<FlorencioVoiceKey | null>(null);
  const [visible, setVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const hideTimer = useRef<number | null>(null);
  const greetingTimer = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const clearGreetingTimer = useCallback(() => {
    if (greetingTimer.current !== null) {
      window.clearTimeout(greetingTimer.current);
      greetingTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    setVisible(false);
  }, [clearHideTimer]);

  const scheduleGreeting = useCallback(() => {
    clearGreetingTimer();
    greetingTimer.current = window.setTimeout(() => {
      if (pathname === "/florencio") return scheduleGreeting();
      if (document.hidden) return scheduleGreeting();
      const next = randomMessage(GREETING_MESSAGES[lang]);
      setMode("greeting");
      setMessage(next.text);
      setVoice(next.voice);
      setAnimationKey((value) => value + 1);
      setVisible(true);
      playFlorencioVoice(next.voice, lang);
      clearHideTimer();
      hideTimer.current = window.setTimeout(() => {
        setVisible(false);
        scheduleGreeting();
      }, DISPLAY_MS);
    }, GREETING_EVERY_MS);
  }, [clearGreetingTimer, clearHideTimer, lang, pathname]);

  const show = useCallback((nextMode: FlorencioMode, next: VoiceMessage, suffix = "") => {
    clearGreetingTimer();
    clearHideTimer();
    setMode(nextMode);
    setMessage(`${next.text}${suffix ? ` ${suffix}` : ""}`);
    setVoice(next.voice);
    setAnimationKey((value) => value + 1);
    setVisible(true);
    playFlorencioVoice(next.voice, lang);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      scheduleGreeting();
    }, nextMode === "product" ? PRODUCT_DISPLAY_MS : DISPLAY_MS);
  }, [clearGreetingTimer, clearHideTimer, lang, scheduleGreeting]);

  const openFlorencio = () => {
    unlockFlorencioVoice();
    if (pathname === "/florencio") return;
    hide();
    clearGreetingTimer();
    window.location.assign("/florencio");
  };

  useEffect(() => {
    const unlock = () => unlockFlorencioVoice();
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  useEffect(() => {
    if (pathname === "/florencio") {
      hide();
      clearGreetingTimer();
      setMode(null);
      return undefined;
    }
    scheduleGreeting();
    return () => {
      clearGreetingTimer();
      clearHideTimer();
    };
  }, [clearGreetingTimer, clearHideTimer, hide, pathname, scheduleGreeting]);

  useEffect(() => {
    const onProductSelected = (event: Event) => {
      if (pathname === "/florencio") return;
      const customEvent = event as ProductSelectedEvent;
      const name = customEvent.detail?.name?.trim() ?? "";
      show("product", randomMessage(PRODUCT_MESSAGES[lang]), name);
    };
    window.addEventListener("florencio:product-selected", onProductSelected);
    return () => window.removeEventListener("florencio:product-selected", onProductSelected);
  }, [lang, pathname, show]);

  if (pathname === "/florencio" || !mode) return null;

  const videoSrc = mode === "product" ? RAMO_VIDEO : SALUDANDO_VIDEO;
  return (
    <div className={`fixed right-2 z-[60] w-[150px] select-none transition-[opacity,transform] duration-500 [bottom:max(12px,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6 sm:w-[190px] ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} aria-live="polite">
      <button type="button" onClick={openFlorencio} className="block w-full cursor-pointer text-left" aria-label={lang === "en" ? "Open Florencio" : "Abrir Florencio"}>
        <div className="relative mb-2 flex justify-end pr-1">
          <div className="relative max-w-[142px] rounded-2xl border border-primary/20 bg-white/95 px-3 py-2.5 text-[10px] leading-snug shadow-[0_16px_36px_-20px_rgba(65,40,21,0.4)] backdrop-blur-md sm:max-w-[174px] sm:px-3.5 sm:py-3 sm:text-xs">
            <span className="mr-1 inline-flex align-middle"><Volume2 className="h-3 w-3 text-primary" /></span>
            {message}
            <span className="absolute -bottom-1.5 right-9 h-3 w-3 rotate-45 border-r border-b border-primary/20 bg-white" />
          </div>
        </div>
        <div className="relative mx-auto w-[108px] sm:w-[142px]">
          <div className="aspect-square overflow-hidden rounded-full border border-primary/25 bg-[radial-gradient(circle_at_50%_30%,#fff8eb,#dbbf9d)] p-1.5 shadow-[0_22px_45px_-20px_rgba(70,42,22,0.55)] transition-transform duration-500 hover:scale-105">
            <div className="h-full w-full overflow-hidden rounded-full border border-white/70 bg-white/25">
              <video key={`${videoSrc}-${animationKey}`} src={videoSrc} muted autoPlay playsInline preload="auto" onEnded={hide} className="h-full w-full object-cover object-center" />
            </div>
          </div>
          <span className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-md"><MessageCircle className="h-4 w-4" /></span>
        </div>
      </button>
      <button type="button" onClick={() => { hide(); scheduleGreeting(); }} aria-label={lang === "en" ? "Hide Florencio" : "Ocultar a Florencio"} className="absolute -top-1 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white/95 text-muted-foreground shadow-sm transition hover:text-foreground"><X className="h-3 w-3" /></button>
    </div>
  );
}
