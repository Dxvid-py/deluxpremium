import type { Product } from "@/lib/queries";

/**
 * SEO técnico. Define VITE_SITE_URL (por ejemplo https://tudominio.com) en las variables de
 * entorno del hosting para que canonical, Open Graph y los datos estructurados salgan con
 * URL absoluta. Si no está definida, esas piezas simplemente se omiten.
 */
export const SITE_URL = ((import.meta.env["VITE_SITE_URL"] as string | undefined) ?? "").trim().replace(/\/$/, "");

export const BUSINESS = {
  name: "Floristería Deluxury",
  shortName: "Deluxury",
  phone: "+573006301123",
  city: "Barranquilla",
  region: "Atlántico",
  country: "CO",
};

export const absoluteUrl = (path: string) => (SITE_URL ? `${SITE_URL}${path}` : path);

export function canonicalLinks(path: string) {
  return SITE_URL ? [{ rel: "canonical", href: `${SITE_URL}${path}` }] : [];
}

export const jsonLd = (data: unknown) => ({ type: "application/ld+json", children: JSON.stringify(data) });

/** Metadatos sociales + descripción para una página. */
export function pageMeta(opts: { title: string; description: string; path: string; image?: string | undefined; noindex?: boolean }) {
  const image = opts.image ? (opts.image.startsWith("http") ? opts.image : absoluteUrl(opts.image)) : SITE_URL ? `${SITE_URL}/logo.png` : undefined;
  return [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "es_CO" },
    { property: "og:site_name", content: BUSINESS.name },
    ...(SITE_URL ? [{ property: "og:url", content: `${SITE_URL}${opts.path}` }] : []),
    ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
    ...(opts.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
  ];
}

export function floristJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Florist",
    name: BUSINESS.name,
    description:
      "Floristería de lujo en Barranquilla: rosas, ramos, cajas y arreglos florales hechos a mano, con entrega a domicilio y envío de flores en Barranquilla.",
    telephone: BUSINESS.phone,
    priceRange: "$$$",
    currenciesAccepted: "COP",
    address: { "@type": "PostalAddress", addressLocality: BUSINESS.city, addressRegion: BUSINESS.region, addressCountry: BUSINESS.country },
    areaServed: { "@type": "City", name: BUSINESS.city },
    ...(SITE_URL ? { url: SITE_URL, logo: `${SITE_URL}/logo.png`, image: `${SITE_URL}/logo.png` } : {}),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(SITE_URL ? { item: `${SITE_URL}${item.path}` } : {}),
    })),
  };
}

export function faqJsonLd(faq: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

export function productJsonLd(product: Product, categoryName?: string) {
  const images = (product.images ?? []).map(absoluteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name}, arreglo floral de ${BUSINESS.name} en ${BUSINESS.city}.`,
    sku: product.slug,
    ...(images.length ? { image: images } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    brand: { "@type": "Brand", name: BUSINESS.shortName },
    offers: {
      "@type": "Offer",
      priceCurrency: "COP",
      price: String(Math.round(Number(product.price_cop))),
      availability: product.is_active ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(SITE_URL ? { url: `${SITE_URL}/producto/${product.slug}` } : {}),
    },
  };
}

export const clip = (text: string, max = 155) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
};
