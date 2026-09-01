import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
import { settingsQuery } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: "Contacto y pedidos a medida · Floristería Deluxe Premium" },
      {
        name: "description",
        content:
          "Escríbenos por WhatsApp para pedidos corporativos, eventos o arreglos florales a medida en Barranquilla.",
      },
      { property: "og:title", content: "Contacto · Deluxe Premium" },
      {
        property: "og:description",
        content: "Pedidos a medida, eventos y arreglos corporativos en Barranquilla.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  useReveal();
  const { t } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const phone = settings?.["whatsapp_number"] ?? "573006301123";
  const maps = settings?.["maps_url"] ?? "https://maps.app.goo.gl/iP9B2jxw3JVnETTe7";
  const [message, setMessage] = useState("");

  const field =
    "w-full border border-input bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

  return (
    <div className="pt-32 pb-24 md:pt-40">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:grid-cols-2 md:px-8">
        <div>
          <p className="eyebrow" data-anim="left">
            {t("footer.contact")}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl" data-anim="letters">
            Hablemos de tu <span className="text-lux-gradient italic">pieza</span>
          </h1>
          <p
            className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground"
            data-anim="fade-up"
          >
            Diseñamos arreglos a medida para bodas, eventos corporativos, hoteles y regalos
            especiales. Cuéntanos qué necesitas y te respondemos el mismo día.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-muted-foreground" data-stagger="90">
            <li className="flex items-center gap-3" data-anim="fade-up">
              <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
              <a href={`https://wa.me/${phone}`} className="hover:text-primary">
                WhatsApp 300 630 1123
              </a>
            </li>
            <li className="flex items-center gap-3" data-anim="fade-up">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <a
                href={`mailto:${settings?.["email"] ?? "floristeriadeluxe@gmail.com"}`}
                className="hover:text-primary"
              >
                {settings?.["email"] ?? "floristeriadeluxe@gmail.com"}
              </a>
            </li>
            <li className="flex items-center gap-3" data-anim="fade-up">
              <Instagram className="h-4 w-4 shrink-0 text-primary" />
              <a
                href={settings?.["instagram"] ?? "https://instagram.com/floristeriadeluxe"}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                {settings?.["instagram_handle"] ?? "@floristeriadeluxe"}
              </a>
            </li>
            <li className="flex items-start gap-3" data-anim="fade-up">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {settings?.["address"] ?? "Carrera 43 #79-226, Local 1, Barranquilla, Colombia"}
                <a
                  href={maps}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-[10px] tracking-[0.24em] text-primary uppercase"
                >
                  {t("contact.maps")}
                </a>
              </span>
            </li>
            <li className="flex items-start gap-3" data-anim="fade-up">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {t("contact.hours.weekdays")}: 8:00 – 20:00
                <br />
                {t("contact.hours.sunday")}: 9:00 – 18:00
                <br />
                {t("contact.hours.whatsapp")}: 24/7
              </span>
            </li>
          </ul>
        </div>

        <div className="surface-glass aura-glow rounded-sm p-8" data-anim="right">
          <p className="eyebrow">Pedido a medida</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Cuéntanos ocasión, presupuesto, fecha y ciudad de entrega…"
            className={`${field} mt-6 min-h-40`}
          />
          <a
            href={`https://wa.me/${phone}?text=${encodeURIComponent(message || "Hola, quiero un arreglo a medida.")}`}
            target="_blank"
            rel="noreferrer"
            className="press shine mt-6 block w-full bg-primary py-4 text-center text-[11px] tracking-[0.28em] text-primary-foreground uppercase"
          >
            {t("cta.whatsapp")}
          </a>
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-7xl px-5 md:px-8">
        <div className="aura-glow overflow-hidden rounded-sm" data-anim="clip">
          <iframe
            title="Mapa Floristería Deluxe Premium"
            src="https://www.google.com/maps?q=Carrera%2043%20%2379-226%20Barranquilla%20Colombia&output=embed"
            loading="lazy"
            className="relative z-1 h-80 w-full border-0 grayscale-[0.4] transition-all duration-1000 hover:grayscale-0"
          />
        </div>
      </div>
    </div>
  );
}
