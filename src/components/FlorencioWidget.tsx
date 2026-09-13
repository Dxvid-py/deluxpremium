import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { settingsQuery } from "@/lib/queries";

const GREETINGS = ["¡Hola! Soy Florencio.", "¿Buscas un detalle especial?", "Estoy por aquí para ayudarte."];
const PRODUCT_MESSAGES = ["¡Excelente elección!", "Ese detalle se ve precioso.", "Elegiste algo muy especial."];

type ProductSelectedEvent = CustomEvent<{ name?: string }>;
const pick = (items: string[]) => items[Math.floor(Math.random() * items.length)] ?? items[0];

export default function FlorencioWidget() {
  const { pathname } = useLocation(); const { data: settings } = useQuery(settingsQuery);
  const [visible, setVisible] = useState(false); const [message, setMessage] = useState("");
  const profile = settings?.["florencio_profile_image_url"] || settings?.["florencio_intro_image_url"] || "/img/florencio.png";
  const show = useCallback((text: string) => { setMessage(text); setVisible(true); }, []);
  const openChat = () => { window.location.href = "/florencio"; };

  useEffect(() => { if (pathname === "/florencio") { setVisible(false); return; } const first = window.setTimeout(() => { if (!document.hidden) show(pick(GREETINGS)); }, 8500); const interval = window.setInterval(() => { if (!document.hidden && !visible) show(pick(GREETINGS)); }, 52000); return () => { window.clearTimeout(first); window.clearInterval(interval); }; }, [pathname, show, visible]);
  useEffect(() => { const handler = (event: Event) => { if (pathname === "/florencio") return; const e = event as ProductSelectedEvent; const name = e.detail?.name?.trim(); show(name ? `${pick(PRODUCT_MESSAGES)} ${name}` : pick(PRODUCT_MESSAGES)); }; window.addEventListener("florencio:product-selected", handler); return () => window.removeEventListener("florencio:product-selected", handler); }, [pathname, show]);
  if (pathname === "/florencio" || !message) return null;

  return <div className={`fixed bottom-[max(10px,env(safe-area-inset-bottom))] right-2 z-[60] w-[154px] select-none transition-all duration-500 sm:right-6 sm:w-[190px] ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`} aria-live="polite">
    <button type="button" onClick={openChat} className="block w-full text-left" aria-label="Abrir Florencio">
      <div className="relative mb-2 flex justify-end pr-1"><div className="relative max-w-[145px] rounded-2xl border border-primary/20 bg-white/95 px-3 py-2.5 text-[10px] leading-snug shadow-[0_18px_40px_-24px_rgba(58,35,18,.5)] backdrop-blur-md sm:max-w-[175px] sm:px-3.5 sm:py-3 sm:text-xs">{message}<span className="absolute -bottom-1.5 right-9 h-3 w-3 rotate-45 border-r border-b border-primary/20 bg-white" /></div></div>
      <div className="relative mx-auto w-[92px] sm:w-[128px]"><div className="aspect-square overflow-hidden rounded-full border border-primary/25 bg-[#efe0ca] p-1.5 shadow-[0_24px_55px_-24px_rgba(70,42,22,.58)] transition-transform duration-500 hover:scale-105"><div className="h-full w-full overflow-hidden rounded-full border border-white/70"><img src={profile} alt="Florencio" className="h-full w-full object-cover object-[50%_25%]" /></div></div><span className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-md"><MessageCircle className="h-4 w-4" /></span></div>
    </button>
    <button type="button" onClick={() => setVisible(false)} aria-label="Ocultar Florencio" className="absolute -top-1 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white/95 text-muted-foreground shadow-sm"><X className="h-3 w-3" /></button>
  </div>;
}
