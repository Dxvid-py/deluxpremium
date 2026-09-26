import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";

export default function WhatsAppFloating() {
  const { pathname } = useLocation();
  const { data: settings } = useQuery(settingsQuery);
  const [florencioVisible, setFlorencioVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const onWidget = (event: Event) => {
      setFlorencioVisible(Boolean((event as CustomEvent<{ visible?: boolean }>).detail?.visible));
    };
    const onChat = (event: Event) => {
      setChatOpen(Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open));
    };
    window.addEventListener("florencio:widget-visibility", onWidget);
    window.addEventListener("florencio:chat-visibility", onChat);
    return () => {
      window.removeEventListener("florencio:widget-visibility", onWidget);
      window.removeEventListener("florencio:chat-visibility", onChat);
    };
  }, []);

  if (pathname === "/florencio" || florencioVisible || chatOpen) return null;

  const phone = settings?.["whatsapp_number"] ?? "573006301123";
  const message = "Hola, quisiera ayuda con un arreglo de Deluxury.";
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Contactar a Deluxury por WhatsApp"
      className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] left-4 z-[55] flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-[#25D366] text-white shadow-[0_16px_40px_-18px_rgba(0,0,0,.5)] transition duration-300 hover:scale-105 sm:left-6 sm:h-14 sm:w-14"
    >
      <MessageCircle className="h-6 w-6" fill="currentColor" />
    </a>
  );
}
