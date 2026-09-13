import { useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, MessageCircle, Sparkles, Truck } from "lucide-react";
import { productsQuery, settingsQuery } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { useStore } from "@/lib/store";
import ProductCard from "@/components/ProductCard";
import FlorencioChat from "@/components/FlorencioChat";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      { name: "description", content: "Habla con Florencio y encuentra el detalle ideal dentro del catálogo real de Deluxury." },
    ],
  }),
  component: FlorencioPage,
});

function FlorencioPage() {
  const { data: settings } = useQuery(settingsQuery);
  const { data: products = [] } = useQuery(productsQuery);
  const { currency } = useStore();
  const enabled = settings?.["florencio_delivery_enabled"] !== "false";
  const price = Number(settings?.["florencio_delivery_price_cop"] ?? 0);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const whatsapp = settings?.["whatsapp_number"] ?? "573006301123";
  const serviceCopy = settings?.["florencio_delivery_description"] || "Haz que la entrega sea parte de la sorpresa y solicita el domicilio especial con Florencio.";
  const suggested = useMemo(() => products.filter((p) => p.is_active && Number(p.stock) !== 0).slice(0, 4), [products]);

  useEffect(() => {
    document.body.classList.add("florencio-page");
    const html = document.documentElement.style.overflowY;
    const body = document.body.style.overflowY;
    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";
    return () => {
      document.body.classList.remove("florencio-page");
      document.documentElement.style.overflowY = html;
      document.body.style.overflowY = body;
    };
  }, []);

  return (
    <div className="overflow-x-clip pt-24 md:pt-28">
      <section className="relative isolate overflow-hidden text-white">
        <img src="/video/florencio-section/florencio-ai-poster.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center" />
        <div className="pointer-events-none absolute inset-0 bg-[#120c10]/35" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(240,190,135,.18),transparent_40%),linear-gradient(180deg,rgba(10,7,8,.08),rgba(10,7,8,.76)_96%)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 border border-white/15 bg-black/20 px-4 py-2 text-[9px] tracking-[0.22em] text-white/70 uppercase backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Florencio · Asistente floral
            </div>
            <h1 className="mt-6 font-display text-5xl leading-[0.92] sm:text-6xl md:text-7xl">Encuentra el detalle <span className="italic text-primary">perfecto.</span></h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">Háblame como lo harías con una persona. Yo cruzo lo que me cuentes con el catálogo real de Deluxury y te muestro las piezas que mejor encajan.</p>
          </div>

          <div className="relative z-10 mx-auto mt-8 w-full max-w-5xl sm:mt-10">
            <FlorencioChat embedded />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">Una conversación que termina en <span className="text-lux-gradient italic">una elección.</span></h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Puedes escribir con tus propias palabras. Florencio interpreta la ocasión, la persona, el estilo y el presupuesto, y después conecta esa intención con productos reales de Deluxury.</p>
          </div>
          <div className="mt-10 grid gap-px border border-border bg-border md:grid-cols-3">
            {[["01","Cuéntame","Dime para quién es, qué ocasión tienes o qué quieres transmitir."],["02","Te recomiendo","Florencio cruza esas pistas con el catálogo real."],["03","Añade y compra","Puedes agregar la pieza al mismo carrito de Deluxury."]].map(([number,title,copy]) => <article key={number} className="bg-background p-6 md:p-8"><p className="text-[10px] tracking-[0.22em] text-primary">{number}</p><h3 className="mt-5 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p></article>)}
          </div>
        </div>
      </section>

      {enabled && <section className="border-b border-border bg-secondary/35 py-16 md:py-24"><div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_.75fr] md:items-center md:px-8"><div><p className="eyebrow">Servicio especial</p><h2 className="mt-4 font-display text-4xl md:text-5xl">Domicilio <span className="italic text-lux-gradient">con Florencio.</span></h2><p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">{serviceCopy}</p><div className="mt-7 flex flex-wrap gap-5 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />Entrega especial</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Opción en el producto</span><span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Parte de la sorpresa</span></div></div><div className="surface-glass p-7"><p className="eyebrow">Tarifa</p><p className="mt-3 font-display text-4xl text-primary">{price > 0 ? formatMoney(price, currency, trm) : "Consultar"}</p><p className="mt-3 text-sm text-muted-foreground">También puedes coordinar el servicio por WhatsApp.</p><a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero solicitar el domicilio especial con Florencio.")}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-[10px] tracking-[0.2em] text-primary-foreground uppercase"><MessageCircle className="h-4 w-4" />Coordinar por WhatsApp</a></div></div></section>}

      {suggested.length > 0 && <section className="border-b border-border py-16 md:py-24"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Selección Deluxury</p><h2 className="mt-4 font-display text-4xl md:text-5xl">Algunas piezas para empezar.</h2></div><Link to="/catalogo" className="inline-flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase hover:text-primary">Ver catálogo<ArrowRight className="h-3.5 w-3.5" /></Link></div><div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">{suggested.map((product,index)=><ProductCard key={product.id} product={product} index={index}/>)}</div></div></section>}
    </div>
  );
}
