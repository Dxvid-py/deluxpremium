import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/ProductCard";
import PetalCanvas from "@/components/PetalCanvas";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";
import { breadcrumbJsonLd, canonicalLinks, clip, jsonLd, pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/coleccion/$slug")({
  loader: async ({ params, context }) => {
    try {
      const categories = await context.queryClient.ensureQueryData(categoriesQuery);
      await context.queryClient.ensureQueryData(productsQuery);
      const category = categories.find((c) => c.slug === params.slug) ?? null;
      return { name: category?.name ?? null, description: category?.description ?? "", image: category?.image_url ?? undefined };
    } catch {
      return { name: null, description: "", image: undefined };
    }
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.name ?? params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
    const path = `/coleccion/${params.slug}`;
    const description = clip(
      `${loaderData?.description ? `${loaderData.description} ` : ""}Flores de ${name} en Barranquilla: arreglos de lujo hechos a mano con entrega a domicilio.`,
    );
    return {
      meta: pageMeta({ title: `Flores de ${name} en Barranquilla · Deluxury`, description, path, image: loaderData?.image }),
      links: canonicalLinks(path),
      scripts: [jsonLd(breadcrumbJsonLd([{ name: "Inicio", path: "/" }, { name: "Catálogo", path: "/catalogo" }, { name, path }]))],
    };
  },
  component: Collection,
});

function Collection() {
  useReveal();
  const { slug } = Route.useParams();
  const { data: categories } = useQuery(categoriesQuery);
  const { data: products } = useQuery(productsQuery);
  const category = (categories ?? []).find((c) => c.slug === slug);
  const list = (products ?? []).filter((p) => p.is_active && p.category_id === category?.id);

  const slugAndName = `${slug} ${category?.name ?? ""}`.toLowerCase();
  const petalType =
    slugAndName.includes("condol")
      ? "white"
      : slugAndName.includes("evento") || slugAndName.includes("boda")
        ? "mixed"
        : "red";

  return (
    <div>
      <section className="relative h-[62svh] min-h-[420px] overflow-hidden">
        <img
          src={category?.image_url ?? "/img/cat-amor.jpg"}
          alt={category?.name ?? "Colección"}
          width={900}
          height={1200}
          className="ken-burns h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/40" />
        <PetalCanvas density={14} speed={0.7} petalType={petalType} />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-5 pb-16 md:px-8">
            <Link to="/catalogo" className="eyebrow hover:text-cream">
              ← Catálogo
            </Link>
            <h1 className="mt-4 font-display text-5xl leading-tight md:text-7xl">
              <span className="text-lux-gradient italic">{category?.name ?? slug}</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              {category?.description}
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        {list.length === 0 ? (
          <p className="font-display text-2xl text-muted-foreground">
            Estamos preparando nuevas piezas para esta colección.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-14 lg:grid-cols-3">
            {list.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
