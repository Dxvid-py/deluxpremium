import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/queries";
import { settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useContentTranslator, useI18n } from "@/lib/i18n";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add, currency } = useStore();
  const { t } = useI18n();
  const tc = useContentTranslator([product.name]);
  const { data: settings } = useQuery(settingsQuery);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    add(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 600);
  };

  return (
    <article
      className="group relative"
      data-anim="fade-up"
      style={{ "--delay": `${Math.min(index, 8) * 90}ms` } as React.CSSProperties}
    >
      <Link
        to="/producto/$slug"
        params={{ slug: product.slug }}
        className="aura-glow press block rounded-sm bg-secondary"
      >
        <div className="relative z-1 aspect-4/5 overflow-hidden rounded-sm">
          <img
            src={product.images?.[0] ?? "/img/prod-01.jpg"}
            alt={tc(product.name)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-35 transition-opacity duration-700 group-hover:opacity-80" />
          {product.compare_price_cop ? (
            <span className="absolute top-3 left-3 bg-accent px-2.5 py-1 text-[8px] tracking-[0.22em] text-accent-foreground uppercase sm:top-4 sm:left-4 sm:px-3 sm:text-[9px]">
              {t("product.sale")}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex items-start justify-between gap-2 px-1 pt-4 sm:gap-4 sm:pt-5">
        <div className="min-w-0">
          <Link to="/producto/$slug" params={{ slug: product.slug }}>
            <h3 className="font-display text-base leading-tight transition-colors group-hover:text-primary sm:text-xl">
              {tc(product.name)}
            </h3>
          </Link>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2 sm:mt-2 sm:gap-3">
            <span className="text-xs text-primary sm:text-sm">
              {formatMoney(Number(product.price_cop), currency, trm)}
            </span>
            {product.compare_price_cop ? (
              <span className="text-[11px] text-muted-foreground line-through sm:text-xs">
                {formatMoney(Number(product.compare_price_cop), currency, trm)}
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={onAdd}
          aria-label={`${t("product.addToCart")}: ${product.name}`}
          className="press mt-0.5 shrink-0 rounded-full border border-border p-2 transition-all duration-500 hover:border-primary hover:bg-primary hover:text-primary-foreground sm:mt-1 sm:p-2.5"
        >
          <ShoppingBag className={`h-4 w-4 ${added ? "animate-cart-pop" : ""}`} />
        </button>
      </div>
    </article>
  );
}
