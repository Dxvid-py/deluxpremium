import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import HeroVideo from "@/components/HeroVideo";
import ProductCard from "@/components/ProductCard";
import CollectionsShowcase from "@/components/CollectionsShowcase";
import GallerySection from "@/components/GallerySection";
import InstagramSection from "@/components/InstagramSection";
import { productsQuery, settingsQuery } from "@/lib/queries";
import { useParallax, useReveal } from "@/hooks/use-reveal";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Floristería Deluxury · Flores de lujo en Barranquilla" },
      {
        name: "description",
        content:
          "Atelier floral premium en Barranquilla: rosas de tallo largo, cajas firmadas y arreglos de autor con entrega el mismo día.",
      },
      { property: "og:title", content: "Floristería Deluxury" },
      {
        property: "og:description",
        content:
          "Arreglos florales de lujo hechos a mano, entregados el mismo día en Barranquilla.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const BENEFITS = ["b1", "b2", "b3", "b4"] as const;

function Home() {
  useReveal();
  useParallax();

  const { t } = useI18n();
  const { data: products } = useQuery(productsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const featured = (products ?? []).filter((p) => p.is_featured).slice(0, 6);

  return (
    <>
      <HeroVideo />

      {/* Franja editorial: conserva los cuatro beneficios sin ocupar
          un bloque alto en móvil. */}
      <section className="relative overflow-hidden border-y border-border bg-background py-3.5 sm:py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent sm:w-16" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent sm:w-16" />

        <div className="flex w-max animate-[deluxury-marquee_28s_linear_infinite] items-center">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex items-center"
            >
              {BENEFITS.map((key, index) => (
                <div key={`${copy}-${key}`} className="flex items-center">
                  <span className="px-5 text-center text-[9px] tracking-[0.2em] text-muted-foreground uppercase sm:px-8 sm:text-[10px]">
                    <span className="text-primary">✦</span>{" "}
                    {t(`home.${key}.title`)}
                    <span className="mx-2 hidden text-muted-foreground/60 sm:inline">
                      ·
                    </span>
                    <span className="ml-2 hidden tracking-[0.05em] normal-case text-muted-foreground/70 sm:inline">
                      {t(`home.${key}.copy`)}
                    </span>
                  </span>
                  {index < BENEFITS.length - 1 && (
                    <span className="text-primary/35">/</span>
                  )}
                </div>
              ))}
              <span className="px-5 text-primary/50 sm:px-8">✦</span>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes deluxury-marquee {
            from { transform: translate3d(0,0,0); }
            to { transform: translate3d(-50%,0,0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .animate-\\[deluxury-marquee_28s_linear_infinite\\] {
              animation-play-state: paused;
            }
          }
        `}</style>
      </section>

      <CollectionsShowcase />

      <section className="border-t border-border py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow" data-anim="left">
                {t("home.featured.eyebrow")}
              </p>
              <h2
                className="mt-4 font-display text-4xl leading-tight md:text-5xl"
                data-anim="clip"
              >
                {t("home.featured.title1")}{" "}
                <span className="text-lux-gradient italic">
                  {t("home.featured.title2")}
                </span>
              </h2>
            </div>

            <Link
              to="/catalogo"
              data-anim="right"
              className="press group inline-flex items-center gap-2 text-[11px] tracking-[0.26em] uppercase hover:text-primary"
            >
              {t("cta.viewCatalog")}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div
            className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-14 md:mt-14 lg:grid-cols-3"
            data-stagger="120"
          >
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 md:grid-cols-2 md:px-8 md:py-32">
          <div
            className="aura-glow rounded-sm"
            data-anim="clip"
            data-parallax="0.08"
          >
            <img
              src={settings?.["home_editorial_image_url"] ?? "/img/hero-02.jpg"}
              alt="Composición floral blanca del atelier"
              loading="lazy"
              width={1600}
              height={1100}
              className="aspect-4/5 w-full rounded-sm object-cover"
            />
          </div>

          <div>
            <p className="eyebrow" data-anim="fade-up">
              {t("home.editorial.eyebrow")}
            </p>
            <h2
              className="mt-4 font-display text-4xl leading-tight md:text-5xl"
              data-anim="letters"
            >
              {t("home.editorial.title1")}{" "}
              <span className="text-lux-gradient italic">
                {t("home.editorial.title2")}
              </span>
            </h2>
            <p
              className="mt-6 text-base leading-relaxed text-muted-foreground"
              data-anim="fade-up"
            >
              {t("home.editorial.p1")}
            </p>
            <p
              className="mt-4 text-base leading-relaxed text-muted-foreground"
              data-anim="fade-up"
            >
              {t("home.editorial.p2")}
            </p>
            <div className="mt-10 flex flex-wrap gap-4" data-stagger="120">
              <Link
                to="/catalogo"
                data-anim="zoom"
                className="press shine bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
              >
                {t("cta.shopNow")}
              </Link>
              <Link
                to="/nosotros"
                data-anim="zoom"
                className="press border border-border px-8 py-4 text-[11px] tracking-[0.26em] uppercase hover:border-primary hover:text-primary"
              >
                {t("cta.ourStory")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GallerySection />
      <InstagramSection />
    </>
  );
}
