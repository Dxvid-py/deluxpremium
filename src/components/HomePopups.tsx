import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { settingsQuery } from "@/lib/queries";
import { isPopupLive, markSeen, parsePopups, wasSeen, type HomePopup } from "@/lib/popups";

const INTRO_SEEN_KEY = "fdp-intro-seen"; // la intro cinematográfica lo marca al terminar

export function PopupView({ popup, onClose, preview = false }: { popup: HomePopup; onClose: () => void; preview?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const external = /^https?:\/\//i.test(popup.link);
  const open = (e: React.MouseEvent) => {
    if (preview) {
      e.preventDefault();
      return;
    }
    if (!popup.link) return;
    if (!external) {
      e.preventDefault();
      onClose();
      router.history.push(popup.link);
    }
  };

  const linkProps = popup.link
    ? { href: popup.link, onClick: open, ...(external ? { target: "_blank", rel: "noreferrer" } : {}) }
    : null;

  const image = popup.image ? <img src={popup.image} alt={popup.title || "Aviso de Deluxury"} className="max-h-[52vh] w-full object-cover" /> : null;

  return (
    <div
      className={`${preview ? "fixed" : "fixed"} inset-0 z-[120] flex items-center justify-center bg-[#2d1914]/45 p-4 backdrop-blur-[3px]`}
      role="dialog"
      aria-modal="true"
      aria-label={popup.title || "Aviso"}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-primary/20 bg-[#fffaf2] shadow-[0_40px_120px_-40px_rgba(42,24,12,.6)] animate-[popup-in_.45s_cubic-bezier(.16,1,.3,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 shadow transition hover:border-primary"
        >
          <X className="h-4 w-4" />
        </button>

        {image && (linkProps ? <a {...linkProps} className="block">{image}</a> : image)}

        {(popup.title || popup.text || linkProps) && (
          <div className="px-6 pt-5 pb-6 text-center">
            {popup.title && <h2 className="font-display text-3xl leading-tight">{popup.title}</h2>}
            {popup.text && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{popup.text}</p>}
            {linkProps && (
              <a
                {...linkProps}
                className="mt-5 inline-flex rounded-full bg-primary px-8 py-3.5 text-[10px] tracking-[0.22em] text-primary-foreground uppercase transition hover:opacity-90"
              >
                {popup.buttonLabel || "Ver más"}
              </a>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes popup-in{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

/** Ventanas emergentes del inicio, controladas desde el admin. */
export default function HomePopups() {
  const { data: settings } = useQuery(settingsQuery);
  const [queue, setQueue] = useState<HomePopup[]>([]);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);

  // Esperamos a que termine la intro cinematográfica para no taparla.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const check = () => {
      try {
        return reduced || sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
      } catch {
        return true;
      }
    };
    if (check()) {
      const id = window.setTimeout(() => setReady(true), 1200);
      return () => window.clearTimeout(id);
    }
    const poll = window.setInterval(() => {
      if (check()) {
        window.clearInterval(poll);
        window.setTimeout(() => setReady(true), 1200);
      }
    }, 600);
    return () => window.clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!ready || started || !settings) return;
    setStarted(true);
    const live = parsePopups(settings["home_popups_json"]).filter((p) => isPopupLive(p) && !wasSeen(p));
    if (live.length) {
      markSeen(live[0]!);
      setQueue(live);
    }
  }, [ready, started, settings]);

  const current = queue[0];
  if (!current) return null;

  const close = () => {
    setQueue((q) => {
      const rest = q.slice(1);
      if (rest[0]) markSeen(rest[0]);
      return rest;
    });
  };

  return <PopupView key={current.id} popup={current} onClose={close} />;
}
