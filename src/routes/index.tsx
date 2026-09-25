import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import HeroVideo from "@/components/HeroVideo";
import ProductCard from "@/components/ProductCard";
import CollectionsShowcase from "@/components/CollectionsShowcase";
import BenefitsMarquee from "@/components/BenefitsMarquee";
import GallerySection from "@/components/GallerySection";
import InstagramSection from "@/components/InstagramSection";
import { productsQuery, settingsQuery } from "@/lib/queries";
import { useParallax, useReveal } from "@/hooks/use-reveal";
import { useI18n } from "@/lib/i18n";

function EditorialImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-sm bg-secondary/55">
      <div className={`absolute inset-0 transition-opacity duration-300 ${loaded ? "opacity-0" : "opacity-100"}`} aria-hidden="true">
        <div className="h-full w-full animate-pulse bg-secondary/70" />
      </div>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={1600}
        height={1100}
        onLoad={() => setLoaded(true)}
        className={`aspect-[4/5] w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

export const Route = createFileRoute("/")({ head: () => ({ meta: [{ title: "Floristería Deluxury · Flores de lujo en Barranquilla" }, { name: "description", content: "Atelier floral premium en Barranquilla: rosas de tallo largo, cajas firmadas y arreglos de autor con entrega el mismo día." }, { property: "og:title", content: "Floristería Deluxury" }, { property: "og:description", content: "Arreglos florales de lujo hechos a mano, entregados el mismo día en Barranquilla." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Home });
function Home() {
  useReveal();
  useParallax();
  const { t } = useI18n();
  const { data: products } = useQuery(productsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const featured = (products ?? []).filter((p) => p.is_featured).slice(0, 6);
  const florencioImage = settings?.["florencio_profile_image_url"] || settings?.["florencio_intro_image_url"] || "/img/florencio.png";

  return <>
    <HeroVideo />
    <BenefitsMarquee />
    <CollectionsShowcase />

    <section className="border-y border-border px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-[#fbf6ed] px-4 py-3.5 shadow-[0_18px_55px_-42px_rgba(62,37,20,.35)] sm:px-5">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-[#e8d7be] sm:h-14 sm:w-14">
            <video
              src="/video/florencio-saludando.webm"
              muted
              autoPlay
              loop
              playsInline
              preload="metadata"
              poster={florencioImage}
              className="h-full w-full object-cover"
              aria-label="Florencio"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] tracking-[.2em] text-primary uppercase sm:text-[9px]">Florencio IA</p>
            <p className="mt-0.5 truncate font-display text-lg sm:text-xl">Hola, soy Florencio.</p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">Recomendaciones con productos reales de Deluxury.</p>
          </div>
          <Link
            to="/florencio"
            className="shrink-0 rounded-full bg-primary px-4 py-2.5 text-[9px] tracking-[.18em] text-primary-foreground uppercase sm:px-5"
          >
            Hablar
          </Link>
        </div>
      </div>
    </section>
  <section className="border-t border-border py-24 md:py-32"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow" data-anim="left">{t("home.featured.eyebrow")}</p><h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl" data-anim="clip">{t("home.featured.title1")} <span className="text-lux-gradient italic">{t("home.featured.title2")}</span></h2></div><Link to="/catalogo" data-anim="right" className="press group inline-flex items-center gap-2 text-[11px] tracking-[.26em] uppercase hover:text-primary">{t("cta.viewCatalog")}<ArrowUpRight className="h-3.5 w-3.5" /></Link></div><div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-14 md:mt-14 lg:grid-cols-3" data-stagger="120">{featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div></div></section>
  <section className="relative overflow-hidden border-t border-border"><div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 md:grid-cols-2 md:px-8 md:py-32"><div className="aura-glow rounded-sm" data-anim="fade-up"><EditorialImage src={settings?.["home_editorial_image_url"] ?? "/img/hero-02.jpg"} alt="Composición floral blanca del atelier" /></div><div><p className="eyebrow" data-anim="fade-up">{t("home.editorial.eyebrow")}</p><h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl" data-anim="letters">{t("home.editorial.title1")} <span className="text-lux-gradient italic">{t("home.editorial.title2")}</span></h2><p className="mt-6 text-base leading-relaxed text-muted-foreground" data-anim="fade-up">{t("home.editorial.p1")}</p><p className="mt-4 text-base leading-relaxed text-muted-foreground" data-anim="fade-up">{t("home.editorial.p2")}</p><div className="mt-10 flex flex-wrap gap-4"><Link to="/catalogo" className="press shine bg-primary px-8 py-4 text-[11px] tracking-[.26em] text-primary-foreground uppercase">{t("cta.shopNow")}</Link><Link to="/nosotros" className="press border border-border px-8 py-4 text-[11px] tracking-[.26em] uppercase hover:border-primary hover:text-primary">{t("cta.ourStory")}</Link></div></div></div></section>
  <GallerySection /><InstagramSection />
</>; }
