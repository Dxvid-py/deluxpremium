import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";
import { findLanding, LANDINGS } from "@/lib/seo-landings";
import { breadcrumbJsonLd, canonicalLinks, faqJsonLd, jsonLd, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/flores/$tema")({
  loader: async ({ params, context }) => {
    const landing = findLanding(params.tema);
    if (!landing) throw notFound();
    try {
      await Promise.all([context.queryClient.ensureQueryData(productsQuery), context.queryClient.ensureQueryData(categoriesQuery)]);
    } catch {
      /* si falla la lectura en servidor, la página carga igual en el navegador */
    }
    return { slug: landing.slug };
  },
  head: ({ params }) => {
    const landing = findLanding(params.tema);
    if (!landing) return {};
    const path = `/flores/${landing.slug}`;
    return {
      meta: pageMeta({ title: landing.title, description: landing.description, path }),
      links: canonicalLinks(path),
      scripts: [
        jsonLd(faqJsonLd(landing.faq)),
        jsonLd(breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: landing.h1, path }])),
      ],
    };
  },
  component: Landing,
});

function Landing() {
  useReveal();
  const { tema } = Route.useParams();
  const landing = findLanding(tema)!;
  const { data: products } = useQuery(productsQuery);
  const { data: categories } = useQuery(categoriesQuery);

  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const active = (products ?? []).filter((p) => p.is_active);
  const matched = active.filter((p) => landing.match.test(`${categoryName.get(p.category_id ?? "") ?? ""} ${p.name} ${p.description} ${(p.tags ?? []).join(" ")}`));
  const list = (matched.length ? matched : active).slice(0, 9);

  return (
    <div className="pt-28 pb-24 md:pt-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <nav aria-label="Ruta" className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          <Link to="/" className="hover:text-primary">Inicio</Link> <span className="mx-2">/</span> <span>{landing.h1}</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <h1 className="font-display text-4xl leading-tight md:text-6xl">{landing.h1}</h1>
          {landing.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="mt-5 text-base leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </header>

        {list.length > 0 && (
          <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-14 lg:grid-cols-3">
            {list.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}

        <div className="mt-12">
          <Link to="/catalogo" className="inline-flex bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase">
            {landing.cta}
          </Link>
        </div>

        <section className="mt-20 max-w-3xl" aria-labelledby="faq-title">
          <h2 id="faq-title" className="font-display text-3xl">Preguntas frecuentes</h2>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {landing.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">{item.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <nav aria-label="Más categorías" className="mt-16 border-t border-border pt-8">
          <p className="eyebrow">También te puede interesar</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {LANDINGS.filter((l) => l.slug !== landing.slug).map((l) => (
              <li key={l.slug}>
                <Link to="/flores/$tema" params={{ tema: l.slug }} className="hover:text-primary">
                  {l.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
