import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const GREETING_VIDEO = "/video/florencio-saludando.webm";
const PRODUCT_VIDEO = "/video/florencio-con-ramo.webm";

const GREETING_MESSAGES = [
  "¡Hola! Soy Florencio 🧸",
  "Bienvenido a Deluxury ✨",
  "Qué bonito tenerte por aquí 🌷",
];

const PRODUCT_MESSAGES = [
  "¡Excelente elección! 🌹",
  "Ese detalle se ve precioso ✨",
  "Elegiste algo muy especial 💐",
];

type FlorencioMode = "greeting" | "product";

type ProductSelectedEvent = CustomEvent<{ name?: string }>;

function randomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)] ?? messages[0];
}

export default function FlorencioWidget() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const greetingTimerRef = useRef<number | null>(null);
  const lastProductRef = useRef("");

  const [mode, setMode] = useState<FlorencioMode | null>(null);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    setVisible(false);
  }, [clearHideTimer]);

  const show = useCallback(
    (nextMode: FlorencioMode, nextMessage: string) => {
      clearHideTimer();
      setMode(nextMode);
      setMessage(nextMessage);
      setVisible(true);
    },
    [clearHideTimer],
  );

  const playCurrentVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {
      // Autoplay is muted, but some browsers may still defer playback.
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onProductSelected = (event: Event) => {
      const customEvent = event as ProductSelectedEvent;
      const productName = customEvent.detail?.name?.trim() ?? "";
      lastProductRef.current = productName;

      const selected = PRODUCT_MESSAGES[Math.floor(Math.random() * PRODUCT_MESSAGES.length)] ?? PRODUCT_MESSAGES[0];
      const contextualMessage = productName
        ? `${selected} ${productName}`
        : selected;

      show("product", contextualMessage);
    };

    window.addEventListener("florencio:product-selected", onProductSelected);
    return () => window.removeEventListener("florencio:product-selected", onProductSelected);
  }, [show]);

  useEffect(() => {
    if (reducedMotion) return;

    const initialDelay = window.setTimeout(() => {
      if (!document.hidden) {
        show("greeting", randomMessage(GREETING_MESSAGES));
      }
    }, 9000);

    const schedule = () => {
      greetingTimerRef.current = window.setTimeout(() => {
        if (!document.hidden && !visible) {
          show("greeting", randomMessage(GREETING_MESSAGES));
        }
        schedule();
      }, 45000 + Math.floor(Math.random() * 20000));
    };

    schedule();

    return () => {
      window.clearTimeout(initialDelay);
      if (greetingTimerRef.current !== null) {
        window.clearTimeout(greetingTimerRef.current);
      }
    };
  }, [reducedMotion, show, visible]);

  useEffect(() => {
    if (!visible || !mode) return;
    playCurrentVideo();
  }, [mode, visible, playCurrentVideo]);

  useEffect(() => {
    return () => {
      clearHideTimer();
      if (greetingTimerRef.current !== null) {
        window.clearTimeout(greetingTimerRef.current);
      }
    };
  }, [clearHideTimer]);

  if (!mode) return null;

  const videoSrc = mode === "product" ? PRODUCT_VIDEO : GREETING_VIDEO;

  return (
    <div
      className={`fixed right-3 bottom-4 z-40 w-[164px] select-none transition-all duration-500 sm:right-6 sm:bottom-6 sm:w-[186px] ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative mb-2 flex justify-end pr-2 sm:pr-3">
        <div className="relative max-w-[150px] rounded-2xl border border-primary/20 bg-background/95 px-3 py-2.5 text-[11px] leading-snug text-foreground shadow-[0_12px_32px_-16px_rgba(0,0,0,0.45)] backdrop-blur-md sm:max-w-[168px] sm:px-3.5 sm:py-3 sm:text-xs">
          {message}
          <span className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-r border-b border-primary/20 bg-background/95" />
        </div>
      </div>

      <div className="relative mx-auto w-[124px] sm:w-[142px]">
        <div className="aspect-square overflow-hidden rounded-full border border-primary/25 bg-[radial-gradient(circle_at_50%_35%,rgba(255,245,228,0.92),rgba(164,124,86,0.92))] p-1.5 shadow-[0_18px_45px_-20px_rgba(0,0,0,0.6)] sm:p-2">
          <div className="h-full w-full overflow-hidden rounded-full border border-white/45 bg-black/5">
            <video
              key={videoSrc}
              ref={videoRef}
              src={videoSrc}
              muted
              autoPlay
              playsInline
              preload="metadata"
              onEnded={() => {
                hideTimerRef.current = window.setTimeout(hide, 350);
              }}
              className="h-full w-full object-cover"
              aria-label={mode === "product" ? "Florencio mostrando un ramo" : "Florencio saludando"}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={hide}
          aria-label="Ocultar a Florencio"
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background/95 text-muted-foreground shadow-sm transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
