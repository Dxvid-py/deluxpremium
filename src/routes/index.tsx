import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock, Flower2, Gem, Truck } from "lucide-react";
import HeroAtelier from "@/components/HeroAtelier";
import CollectionsShowcase from "@/components/CollectionsShowcase";

import ProductCard from "@/components/ProductCard";
import GallerySection from "@/components/GallerySection";
import InstagramSection from "@/components/InstagramSection";
import { productsQuery } from "@/lib/queries";
import { useParallax, useReveal } from "@/hooks/use-reveal";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Floristería Deluxe Premium · Flores de lujo en Barranquilla" },
      {
        name: "description",
        content:
          "Atelier floral premium en Barranquilla: rosas de tallo largo, cajas firmadas y arreglos de autor con entrega el mismo día.",
      },
      { property: "og:title", content: "Floristería Deluxe Premium" },
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

const BENEFITS = [
  { icon: Flower2, key: "b1" },
  { icon: Clock, key: "b2" },
  { icon: Gem, key: "b3" },
  { icon: Truck, key: "b4" },
] as const;

function Home() {
  useReveal();
  useParallax();
  const { t } = useI18n();
  const { data: products } = useQuery(productsQuery);
  const featured = (products ?? []).filter((p) => p.is_featured).slice(0, 6);

  return (
    <>
      <HeroAtelier />

      <CollectionsShowcase />

      {/* Beneficios */}
      <section className="border-y border-border">

        <div
          className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:grid-cols-2 md:px-8 lg:grid-cols-4"
          data-stagger="110"
        >
          {BENEFITS.map((b) => (
            <div key={b.key} className="flex gap-4" data-anim="fade-up">
              <b.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-display text-lg">{t(`home.${b.key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`home.${b.key}.copy`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Destacados */}
      <section className="border-t border-border py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow" data-anim="left">
                {t("home.featured.eyebrow")}
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl" data-anim="clip">
                {t("home.featured.title1")}{" "}
                <span className="text-lux-gradient italic">{t("home.featured.title2")}</span>
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

      {/* Editorial */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 md:grid-cols-2 md:px-8 md:py-32">
          <div className="aura-glow rounded-sm" data-anim="clip" data-parallax="0.08">
            <img
              src="/img/hero-02.jpg"
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
              <span className="text-lux-gradient italic">{t("home.editorial.title2")}</span>
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
