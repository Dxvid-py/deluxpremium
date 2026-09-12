import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { supabase, type Session } from "@/integrations/supabase/client";
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
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [pop, setPop] = useState(false);
  const prevCount = useRef(count);
  const { data: categories } = useQuery(categoriesQuery);
  const [session, setSession] = useState<Session | null>(null);

  // Sólo el home tiene un hero de video oscuro debajo del header; en el
  // resto de páginas el contenido bajo el header siempre es claro. Mientras
  // no se ha hecho scroll ahí, el header es transparente sobre ese video,
  // así que necesita texto/iconos claros en vez de los tonos oscuros que
  // usa sobre el fondo champagne del resto del sitio.
  const overDark = pathname === "/" && !scrolled;

  // Sesión del visitante: se lee al montar y se mantiene al día con los
  // cambios de autenticación (entrar / salir).
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const initial = session?.user.email?.[0]?.toUpperCase() ?? "";

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

  // Cierra el menú móvil al cambiar de ruta o al pasar a estado "scrolled",
  // para que nunca quede abierto con los estilos del estado equivocado.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const iconText = overDark ? "text-[oklch(0.94_0.01_84)]" : "text-foreground";
  const mutedText = overDark ? "text-[oklch(0.94_0.01_84/0.75)]" : "text-muted-foreground";
  const hairBorder = overDark ? "border-[oklch(0.94_0.01_84/0.35)]" : "border-border";
  const hoverPrimary = "hover:text-primary";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "surface-glass py-3" : "py-6"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="press group flex items-center">
          <img
            src="/logo.png"
            alt="Floristería Deluxury"
            className="h-11 w-auto transition-transform duration-700 group-hover:scale-105 sm:h-14"
          />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className={`relative text-[11px] tracking-[0.24em] uppercase transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100 ${mutedText} ${hoverPrimary}`}
              activeProps={{ className: "text-primary" }}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className={`hidden items-center rounded-full border p-0.5 md:flex ${hairBorder}`}>
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`press rounded-full px-3 py-1 text-[10px] tracking-[0.2em] uppercase transition-colors ${
                  lang === l ? "bg-primary text-primary-foreground" : `${mutedText} ${hoverPrimary}`
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className={`hidden items-center rounded-full border p-0.5 sm:flex ${hairBorder}`}>
            {(["COP", "USD"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`press rounded-full px-3 py-1 text-[10px] tracking-[0.2em] transition-colors ${
                  currency === c
                    ? "bg-primary text-primary-foreground"
                    : `${mutedText} ${hoverPrimary}`
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <Link
            to="/cuenta"
            aria-label={session ? t("nav.account") : t("auth.signIn")}
            title={session ? session.user.email : t("auth.signIn")}
            className={`press relative flex h-9 items-center gap-2 rounded-full border px-3 transition-colors hover:border-primary/60 hover:bg-primary/10 ${hairBorder} ${iconText}`}
            activeProps={{ className: "border-primary text-primary" }}
          >
            {session ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {initial}
              </span>
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="hidden text-[10px] tracking-[0.2em] uppercase md:inline">
              {session ? t("nav.account") : t("auth.signIn")}
            </span>
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            aria-label={t("cta.cart")}
            className={`press relative rounded-full border p-2.5 transition-colors hover:border-primary/60 hover:bg-primary/10 ${hairBorder}`}
          >
            <ShoppingBag className={`h-4 w-4 ${iconText} ${pop ? "animate-cart-pop" : ""}`} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">
                {count}
              </span>
            )}
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t("cta.menu")}
            className={`press rounded-full border p-2.5 lg:hidden ${hairBorder} ${iconText}`}
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
            <Link
              to="/cuenta"
              onClick={() => setOpen(false)}
              className="press inline-flex items-center gap-2 py-2 text-sm tracking-[0.2em] uppercase"
            >
              <User className="h-4 w-4" />
              {session ? t("nav.account") : t("auth.signIn")}
            </Link>
            {session && (
              <button
                onClick={() => {
                  void supabase.auth.signOut();
                  setOpen(false);
                }}
                className="press inline-flex items-center gap-2 py-2 text-left text-sm tracking-[0.2em] text-muted-foreground uppercase"
              >
                <LogOut className="h-4 w-4" />
                {t("auth.signOut")}
              </button>
            )}
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
