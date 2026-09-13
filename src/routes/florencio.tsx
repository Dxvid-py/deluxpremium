import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, MessageCircle, Truck } from "lucide-react";
import { settingsQuery } from "@/lib/queries";
import FlorencioCatalogAssistant from "@/components/FlorencioCatalogAssistant";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente floral de Deluxury" },
      { name: "description", content: "Habla con Florencio y encuentra un detalle pensado para tu momento." },
    ],
  }),
  component: FlorencioPage,
});

function FlorencioPage() {
  const { data: settings } = useQuery(settingsQuery);
  const enabled = settings?.florencio_delivery_enabled !== "false";
  const price = Number(settings?.florencio_delivery_price_cop ?? 0);
  const whatsapp = settings?.whatsapp_number ?? "573006301123";
  const service = settings?.florencio_delivery_description || "Un servicio opcional para acompañar tu sorpresa con la atención especial de Deluxury.";

  return <div className="overflow-hidden pt-24 md:pt-28">
    <section className="border-b border-border bg-[#fbf7f0]"><div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20"><div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(142,108,69,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(142,108,69,.045)_1px,transparent_1px)] [background-size:46px_46px]" /><div className="relative max-w-4xl"><p className="eyebrow">El asistente floral de Deluxury</p><h1 className="mt-4 font-display text-5xl leading-[.92] md:text-7xl">Habla con <span className="text-lux-gradient italic">Florencio.</span></h1><p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">Cuéntale para quién es el regalo, qué quieres celebrar o cuánto quieres invertir. Florencio transforma esas pistas en una selección visual del catálogo real de Deluxury.</p></div></div></section>
    <section id="florencio-chat" className="border-b border-border bg-[#f5ede4] py-8 md:py-12"><div className="mx-auto max-w-7xl px-4 md:px-8"><FlorencioCatalogAssistant /></div></section>
    {enabled && <section className="border-b border-border bg-[#f9f3ec] py-16 md:py-20"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><p className="eyebrow">Servicio especial</p><h2 className="mt-3 font-display text-4xl md:text-5xl">Entrega especial con <span className="text-lux-gradient italic">Florencio.</span></h2><p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">{service}</p><div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-4 py-2.5 text-sm"><Truck className="h-4 w-4 text-primary" />Tarifa {price > 0 ? <strong>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(price)}</strong> : <strong>consultar</strong>}</div><a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hola, quiero conocer el servicio de entrega especial con Florencio.")}`} target="_blank" rel="noreferrer" className="press mt-7 inline-flex items-center gap-2 bg-foreground px-7 py-3.5 text-[10px] tracking-[.2em] text-cream-hi uppercase hover:bg-primary"><MessageCircle className="h-4 w-4" />Consultar disponibilidad</a></div><div className="grid gap-3 sm:grid-cols-3">{["Acompañamiento de la sorpresa","Coordinación por WhatsApp","Servicio opcional de Deluxury"].map((item) => <div key={item} className="rounded-2xl border border-primary/10 bg-white/70 p-6 shadow-[0_18px_48px_-35px_rgba(72,45,28,.24)]"><Check className="h-4 w-4 text-primary" /><p className="mt-5 font-display text-xl">{item}</p></div>)}</div></div></div></section>}
    <section className="bg-background py-12 md:py-16"><div className="mx-auto max-w-7xl px-5 md:px-8"><a href="#florencio-chat" className="inline-flex items-center gap-2 text-[10px] tracking-[.18em] uppercase hover:text-primary">Volver a Florencio <ArrowRight className="h-3.5 w-3.5" /></a></div></section>
  </div>;
}
