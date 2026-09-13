import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";

const SALUDANDO_VIDEO = "/video/florencio-saludando.mp4";
const RAMO_VIDEO = "/video/florencio-con-ramo.mp4";
const REAPPEAR_EVERY_MS = 15_000;
const FALLBACK_HIDE_MS = 8_000;

type FlorencioMode = "greeting" | "product";
type ProductSelectedEvent = CustomEvent<{ name?: string }>;

const GREETING_MESSAGES = [
  "¡Hola! Soy Florencio.",
  "¿Buscas un detalle especial?",
  "Estoy por aquí para ayudarte.",
];

const PRODUCT_MESSAGES = [
  "¡Excelente elección!",
  "Ese detalle se ve precioso.",
  "Elegiste algo muy especial.",
];

function randomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)] ?? messages[0];
}

export default function FlorencioWidget() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<FlorencioMode | null>(null);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const hideTimer = useRef<number | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
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
      setAnimationKey((value) => value + 1);
      setVisible(true);
      hideTimer.current = window.setTimeout(hide, FALLBACK_HIDE_MS);
    },
    [clearHideTimer, hide],
  );

  const openFlorencio = () => {
    if (pathname === "/florencio") return;
    hide();
    void navigate({ to: "/florencio" });
  };

  useEffect(() => {
    if (pathname === "/florencio") {
      hide();
    }
  }, [hide, pathname]);

  useEffect(() => {
    const onProductSelected = (event: Event) => {
      if (pathname === "/florencio") return;

      const customEvent = event as ProductSelectedEvent;
      const name = customEvent.detail?.name?.trim() ?? "";
      const base = randomMessage(PRODUCT_MESSAGES);
      show("product", name ? `${base} ${name}` : base);
    };

    window.addEventListener("florencio:product-selected", onProductSelected);
    return () =>
      window.removeEventListener("florencio:product-selected", onProductSelected);
  }, [pathname, show]);

  useEffect(() => {
    if (pathname === "/florencio") return undefined;

    // Florencio reaparece cada 15 segundos mientras no esté visible.
    const interval = window.setInterval(() => {
      if (!document.hidden && !visible) {
        show("greeting", randomMessage(GREETING_MESSAGES));
      }
    }, REAPPEAR_EVERY_MS);

    return () => window.clearInterval(interval);
  }, [pathname, show, visible]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  if (pathname === "/florencio" || !mode) return null;

  const videoSrc = mode === "product" ? RAMO_VIDEO : SALUDANDO_VIDEO;

  return (
    <div
      className={`fixed right-2 z-[60] w-[150px] select-none transition-[opacity,transform] duration-500 [bottom:max(12px,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6 sm:w-[190px] ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      aria-live="polite"
    >
      <button
        type="button"
        onClick={openFlorencio}
        className="block w-full cursor-pointer text-left"
        aria-label="Abrir Florencio"
      >
        <div className="relative mb-2 flex justify-end pr-1">
          <div className="relative max-w-[142px] rounded-2xl border border-primary/20 bg-white/95 px-3 py-2.5 text-[10px] leading-snug shadow-[0_16px_36px_-20px_rgba(65,40,21,0.4)] backdrop-blur-md sm:max-w-[174px] sm:px-3.5 sm:py-3 sm:text-xs">
            {message}
            <span className="absolute -bottom-1.5 right-9 h-3 w-3 rotate-45 border-r border-b border-primary/20 bg-white" />
          </div>
        </div>

        <div className="relative mx-auto w-[108px] sm:w-[142px]">
          <div className="aspect-square overflow-hidden rounded-full border border-primary/25 bg-[radial-gradient(circle_at_50%_30%,#fff8eb,#dbbf9d)] p-1.5 shadow-[0_22px_45px_-20px_rgba(70,42,22,0.55)] transition-transform duration-500 hover:scale-105">
            <div className="h-full w-full overflow-hidden rounded-full border border-white/70 bg-white/25">
              <video
                key={`${videoSrc}-${animationKey}`}
                src={videoSrc}
                muted
                autoPlay
                playsInline
                preload="auto"
                onEnded={hide}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
          <span className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-md">
            <MessageCircle className="h-4 w-4" />
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={hide}
        aria-label="Ocultar a Florencio"
        className="absolute -top-1 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white/95 text-muted-foreground shadow-sm transition hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
