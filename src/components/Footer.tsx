import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { categoriesQuery, settingsQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const phone = settings?.["whatsapp_number"] ?? "573006301123";

  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div className="diffused-light absolute inset-0 opacity-60" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2" data-anim="fade-up">
          <img src="/logo.png" alt="Floristería Deluxe Premium" className="h-14 w-auto" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t("footer.about")}
          </p>
          <div className="mt-7 flex items-center gap-4">
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noreferrer"
              className="press rounded-full border border-border p-2.5 transition-colors hover:border-primary/60 hover:bg-primary/10"
              aria-label="WhatsApp"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={settings?.["instagram"] ?? "https://instagram.com/floristeriadeluxe"}
              target="_blank"
              rel="noreferrer"
              className="press rounded-full border border-border p-2.5 transition-colors hover:border-primary/60 hover:bg-primary/10"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <span className="text-xs text-muted-foreground">
              {settings?.["instagram_handle"] ?? "@floristeriadeluxe"}
            </span>
          </div>
        </div>

        <div data-anim="fade-up">
          <p className="eyebrow">{t("footer.collections")}</p>
          <ul className="mt-5 space-y-2.5">
            {(categories ?? []).map((c) => (
              <li key={c.id}>
                <Link
                  to="/coleccion/$slug"
                  params={{ slug: c.slug }}
                  className="text-sm text-muted-foreground transition-all duration-500 hover:translate-x-1 hover:text-primary"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div data-anim="fade-up">
          <p className="eyebrow">{t("footer.contact")}</p>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <a
                href={settings?.["maps_url"] ?? "https://maps.app.goo.gl/iP9B2jxw3JVnETTe7"}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                {settings?.["address"] ??
                  "Carrera 43 #79-226, Local 1, Barranquilla, Colombia"}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <a
                href={`mailto:${settings?.["email"] ?? "floristeriadeluxe@gmail.com"}`}
                className="hover:text-primary"
              >
                {settings?.["email"] ?? "floristeriadeluxe@gmail.com"}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <a href={`https://wa.me/${phone}`} className="hover:text-primary">
                300 630 1123
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {settings?.["hours_weekdays"] ?? "Lunes a sábado 8:00 – 20:00"}
                <br />
                {settings?.["hours_sunday"] ?? "Domingo 9:00 – 18:00"}
                <br />
                {settings?.["hours_whatsapp"] ?? "Pedidos por WhatsApp 24/7"}
              </span>
            </li>
          </ul>
          <Link
            to="/admin"
            className="mt-6 inline-block text-[10px] tracking-[0.24em] uppercase hover:text-primary"
          >
            {t("nav.panel")}
          </Link>
        </div>
      </div>
      <div className="hairline" />
      <p className="py-6 text-center text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
        © {new Date().getFullYear()} Floristería Deluxe Premium · Barranquilla
      </p>
    </footer>
  );
}
