import { useQuery } from "@tanstack/react-query";
import { Instagram } from "lucide-react";
import { instagramQuery, settingsQuery } from "@/lib/queries";
import { useContentTranslator, useI18n } from "@/lib/i18n";

/** Reels y publicaciones de Instagram: al tocar abren la app o el sitio de Instagram. */
export default function InstagramSection() {
  const { t } = useI18n();
  const { data: settings } = useQuery(settingsQuery);
  const { data: posts } = useQuery(instagramQuery);

  const enabled = settings?.["instagram_enabled"] !== "false";
  const list = (posts ?? []).filter((p) => p.is_active);
  const tc = useContentTranslator(list.map((p) => p.caption));

  if (!enabled || list.length === 0) return null;

  return (
    <section className="border-t border-border py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow" data-anim="left">
              {t("home.instagram.eyebrow")}
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl" data-anim="clip">
              {t("home.instagram.title1")}{" "}
              <span className="text-lux-gradient italic">{t("home.instagram.title2")}</span>
            </h2>
          </div>
          <a
            href={settings?.["instagram"] ?? "https://instagram.com/floristeriadeluxe"}
            target="_blank"
            rel="noreferrer"
            data-anim="right"
            className="press inline-flex items-center gap-2 text-[11px] tracking-[0.26em] uppercase hover:text-primary"
          >
            <Instagram className="h-4 w-4" />
            {settings?.["instagram_handle"] ?? "@floristeriadeluxe"}
          </a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground" data-anim="fade-up">
          {t("home.instagram.copy")}
        </p>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" data-stagger="110">
          {list.map((p) => (
            <a
              key={p.id}
              href={p.post_url}
              target="_blank"
              rel="noreferrer"
              data-anim="zoom"
              className="press group relative block overflow-hidden rounded-sm"
            >
              <img
                src={p.image_url}
                alt={tc(p.caption) || "Publicación de Instagram"}
                loading="lazy"
                className="aspect-square w-full object-cover transition-transform duration-1000 group-hover:scale-108"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-95" />
              <span className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all duration-500 group-hover:opacity-100">
                <Instagram className="h-4 w-4" />
              </span>
              {p.caption ? (
                <span className="absolute inset-x-0 bottom-0 line-clamp-2 p-3 pr-14 text-[11px] leading-snug text-foreground">
                  {tc(p.caption)}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
