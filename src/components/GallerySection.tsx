import { useQuery } from "@tanstack/react-query";
import { galleryQuery, settingsQuery } from "@/lib/queries";
import { useContentTranslator, useI18n } from "@/lib/i18n";

/** Apartado "clientes felices". Se activa o desactiva desde el panel del atelier. */
export default function GallerySection() {
  const { t } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const { data: photos } = useQuery(galleryQuery);

  const enabled = settings?.["gallery_enabled"] === "true";
  const list = (photos ?? []).filter((p) => p.is_active);
  const tc = useContentTranslator(list.flatMap((p) => [p.caption, p.customer_name]));

  if (!enabled) return null;

  return (
    <section className="relative overflow-hidden border-t border-border py-24 md:py-32">
      <div className="diffused-light absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <p className="eyebrow" data-anim="left">
          {t("home.gallery.eyebrow")}
        </p>
        <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl" data-anim="letters">
          {t("home.gallery.title1")}{" "}
          <span className="text-lux-gradient italic">{t("home.gallery.title2")}</span>
        </h2>
        <p className="mt-4 max-w-lg text-sm text-muted-foreground" data-anim="fade-up">
          {t("home.gallery.copy")}
        </p>

        {list.length === 0 ? null : (
          <div
            className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
            data-stagger="110"
          >
            {list.map((p) => (
              <figure key={p.id} className="aura-glow rounded-sm" data-anim="zoom">
                <div className="relative z-1 overflow-hidden rounded-sm">
                  <img
                    src={p.image_url}
                    alt={tc(p.caption) || "Cliente Deluxe Premium"}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-1000 hover:scale-105"
                  />
                </div>
                {p.caption || p.customer_name ? (
                  <figcaption className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
                    {tc(p.caption)}
                    {p.customer_name ? (
                      <span className="mt-1 block text-primary">— {tc(p.customer_name)}</span>
                    ) : null}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
