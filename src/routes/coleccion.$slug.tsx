import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/ProductCard";
import PetalCanvas from "@/components/PetalCanvas";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/coleccion/$slug")({
  head: ({ params }) => {
    const name = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
    return {
      meta: [
        { title: `Colección ${name} · Floristería Deluxe Premium` },
        {
          name: "description",
          content: `Arreglos florales de lujo de la colección ${name}, hechos a mano en Barranquilla con entrega el mismo día.`,
        },
        { property: "og:title", content: `Colección ${name} · Deluxe Premium` },
        {
          property: "og:description",
          content: `Descubre la colección ${name} del atelier floral Deluxe Premium.`,
        },
      ],
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
        <PetalCanvas density={14} speed={0.7} />
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
