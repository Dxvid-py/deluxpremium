import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { categoriesQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

const NAV = [
  { to: "/", key: "nav.home" },
  { to: "/catalogo", key: "nav.catalog" },
  { to: "/nosotros", key: "nav.atelier" },
  { to: "/contacto", key: "nav.contact" },
] as const;

export default function Header() {
  const { count, setCartOpen, currency, setCurrency } = useStore();
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState(false);
  const prevCount = useRef(count);
  const { data: categories } = useQuery(categoriesQuery);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const grew = count > prevCount.current;
    prevCount.current = count;
    if (!grew) return undefined;
    setPop(true);
    const id = window.setTimeout(() => setPop(false), 600);
    return () => window.clearTimeout(id);
  }, [count]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "surface-glass py-3" : "py-6"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="press group flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Floristería Deluxe Premium"
            className="h-10 w-auto transition-transform duration-700 group-hover:scale-105"
          />
          <span className="hidden font-display text-lg leading-none tracking-[0.2em] text-cream sm:block">
            DELUXE
            <span className="block text-[9px] tracking-[0.42em] text-primary">PREMIUM</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="relative text-[11px] tracking-[0.24em] text-muted-foreground uppercase transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-500 hover:text-primary hover:after:origin-left hover:after:scale-x-100"
              activeProps={{ className: "text-primary" }}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center rounded-full border border-border p-0.5 md:flex">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`press rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase transition-colors ${
                  lang === l
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="hidden items-center rounded-full border border-border p-0.5 sm:flex">
            {(["COP", "USD"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`press rounded-full px-3 py-1 text-[10px] tracking-[0.2em] transition-colors ${
                  currency === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCartOpen(true)}
            aria-label={t("cta.cart")}
            className="press relative rounded-full border border-border p-2.5 transition-colors hover:border-primary/60 hover:bg-primary/10"
          >
            <ShoppingBag className={`h-4 w-4 text-cream ${pop ? "animate-cart-pop" : ""}`} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
                {count}
              </span>
            )}
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t("cta.menu")}
            className="press rounded-full border border-border p-2.5 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="surface-glass mt-3 animate-[anim-fade-down_0.5s_cubic-bezier(0.16,1,0.3,1)] lg:hidden">
          <div className="flex flex-col gap-1 px-6 py-5">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="press py-2 text-sm tracking-[0.2em] uppercase"
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="hairline my-3" />
            <div className="flex gap-2 pb-2">
              {(["es", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`press rounded-full border border-border px-3 py-1 text-[10px] tracking-[0.2em] uppercase ${
                    lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {(categories ?? []).map((c) => (
              <Link
                key={c.id}
                to="/coleccion/$slug"
                params={{ slug: c.slug }}
                onClick={() => setOpen(false)}
                className="press py-1.5 font-display text-lg text-muted-foreground"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
