import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Minus, Plus, Truck } from "lucide-react";
import { productsQuery, settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/producto/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} · Floristería Deluxe Premium` },
      {
        name: "description",
        content:
          "Arreglo floral de lujo hecho a mano en nuestro atelier de Barranquilla, con entrega el mismo día.",
      },
      { property: "og:title", content: "Pieza del atelier · Deluxe Premium" },
      {
        property: "og:description",
        content: "Arreglo floral de lujo hecho a mano con entrega el mismo día en Barranquilla.",
      },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  useReveal();
  const { slug } = Route.useParams();
  const { data: products } = useQuery(productsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { add, currency } = useStore();
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);

  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const product = (products ?? []).find((p) => p.slug === slug);
  const related = (products ?? [])
    .filter((p) => p.id !== product?.id && p.category_id === product?.category_id)
    .slice(0, 3);

  if (!products) {
    return <div className="px-6 py-40 text-center text-sm text-muted-foreground">Cargando…</div>;
  }

  if (!product) {
    return (
      <div className="px-6 py-40 text-center">
        <h1 className="font-display text-3xl">Pieza no disponible</h1>
        <Link to="/catalogo" className="eyebrow mt-6 inline-block">
          Ver catálogo
        </Link>
      </div>
    );
  }

  const images = product.images.length > 0 ? product.images : ["/img/prod-01.jpg"];

  return (
    <div className="pt-28 pb-24 md:pt-36">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 md:grid-cols-2 md:px-8">
        <div data-anim="clip">
          <div className="overflow-hidden rounded-sm bg-secondary">
            <img
              src={images[imgIndex]}
              alt={product.name}
              width={900}
              height={1125}
              className="aspect-4/5 w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-3">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setImgIndex(i)}
                  className={`h-20 w-16 overflow-hidden rounded-sm border transition-colors ${
                    i === imgIndex ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div data-anim="right">
          <Link to="/catalogo" className="eyebrow hover:text-cream">
            ← Catálogo
          </Link>
          <h1 className="mt-5 font-display text-4xl leading-tight md:text-5xl">{product.name}</h1>
          <div className="mt-5 flex items-baseline gap-4">
            <span className="font-display text-3xl text-primary">
              {formatMoney(Number(product.price_cop), currency, trm)}
            </span>
            {product.compare_price_cop ? (
              <span className="text-sm text-muted-foreground line-through">
                {formatMoney(Number(product.compare_price_cop), currency, trm)}
              </span>
            ) : null}
          </div>
          <div className="hairline my-8" />
          <p className="text-base leading-relaxed text-muted-foreground">{product.description}</p>

          <ul className="mt-8 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" /> Flor fresca del día, garantizada 5 días
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" /> Tarjeta con dedicatoria escrita a mano
            </li>
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Entrega el mismo día en Barranquilla
            </li>
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-full border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Menos"
                className="px-4 py-3"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-8 text-center text-sm">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="Más"
                className="px-4 py-3"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => add(product, qty)}
              className="flex-1 bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase transition-opacity hover:opacity-90 sm:flex-none"
            >
              Añadir al carrito
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {product.stock > 0 ? `${product.stock} unidades disponibles` : "Bajo pedido"}
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-28 max-w-7xl px-5 md:px-8">
          <p className="eyebrow">También podría gustarte</p>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-7 sm:gap-y-14 lg:grid-cols-3">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
