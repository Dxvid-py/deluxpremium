import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { categoriesQuery, productsQuery } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo de flores premium · Floristería Deluxe Premium" },
      {
        name: "description",
        content:
          "Explora ramos, cajas y arreglos de lujo por colección, precio y ocasión. Entrega el mismo día en Barranquilla.",
      },
      { property: "og:title", content: "Catálogo · Floristería Deluxe Premium" },
      {
        property: "og:description",
        content: "Ramos, cajas y arreglos florales de lujo con entrega el mismo día en Barranquilla.",
      },
    ],
  }),
  component: Catalog,
});

type Sort = "destacados" | "precio-asc" | "precio-desc" | "nuevos";

function Catalog() {
  useReveal();
  const { data: categories } = useQuery(categoriesQuery);
  const { data: products, isLoading } = useQuery(productsQuery);
  const [category, setCategory] = useState<string>("todos");
  const [sort, setSort] = useState<Sort>("destacados");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = (products ?? []).filter((p) => p.is_active);
    if (category !== "todos") list = list.filter((p) => p.category_id === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const sorted = [...list];
    if (sort === "precio-asc") sorted.sort((a, b) => Number(a.price_cop) - Number(b.price_cop));
    if (sort === "precio-desc") sorted.sort((a, b) => Number(b.price_cop) - Number(a.price_cop));
    if (sort === "destacados")
      sorted.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    return sorted;
  }, [products, category, sort, query]);

  return (
    <div className="pt-32 pb-24 md:pt-40">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="eyebrow">Catálogo</p>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
          Toda la <span className="text-lux-gradient italic">colección</span>
        </h1>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setCategory("todos")}
            className={`border px-5 py-2.5 text-[10px] tracking-[0.24em] uppercase transition-colors ${
              category === "todos"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/60"
            }`}
          >
            Todos
          </button>
          {(categories ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`border px-5 py-2.5 text-[10px] tracking-[0.24em] uppercase transition-colors ${
                category === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/60"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar rosas, cajas, orquídeas…"
            className="w-full max-w-xs border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          >
            <option value="destacados">Destacados primero</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>
        </div>

        {isLoading ? (
          <p className="mt-16 text-sm text-muted-foreground">Cargando colección…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-16 font-display text-2xl text-muted-foreground">
            No encontramos piezas con esos filtros.
          </p>
        ) : (
          <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-14 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
