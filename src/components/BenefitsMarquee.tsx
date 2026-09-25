import { Clock, Flower2, Gem, Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ITEMS = [
  { icon: Flower2, key: "b1" },
  { icon: Clock, key: "b2" },
  { icon: Gem, key: "b3" },
  { icon: Truck, key: "b4" },
] as const;

function BenefitItem({ item }: { item: (typeof ITEMS)[number] }) {
  const { t } = useI18n();
  const Icon = item.icon;
  return (
    <article className="flex min-w-[250px] items-center gap-3 border-r border-primary/15 pr-8 sm:min-w-[290px]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-white/55">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-base leading-none">{t(`home.${item.key}.title`)}</h3>
        <p className="mt-1.5 truncate text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
          {t(`home.${item.key}.copy`)}
        </p>
      </div>
    </article>
  );
}

export default function BenefitsMarquee() {
  return (
    <section
      className="overflow-hidden border-y border-border bg-[#fbf7ef]"
      aria-label="Beneficios de Deluxury"
    >
      <div className="home-benefits-track flex items-center px-5 py-4 sm:py-5 md:px-8">
        <div className="flex items-center gap-7 sm:gap-9">
          {ITEMS.map((item) => (
            <BenefitItem key={item.key} item={item} />
          ))}
        </div>
        <div aria-hidden="true" className="flex items-center gap-7 sm:gap-9">
          {ITEMS.map((item) => (
            <BenefitItem key={`copy-${item.key}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
