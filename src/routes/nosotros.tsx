import { createFileRoute, Link } from "@tanstack/react-router";
import PetalCanvas from "@/components/PetalCanvas";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "El atelier · Floristería Deluxe Premium" },
      {
        name: "description",
        content:
          "Conoce el atelier floral Deluxe Premium en Barranquilla: flor de grado premium, diseño de autor y entregas cuidadas.",
      },
      { property: "og:title", content: "El atelier · Deluxe Premium" },
      {
        property: "og:description",
        content: "Diseño floral de autor con flor premium, hecho a mano en Barranquilla.",
      },
    ],
  }),
  component: About,
});

const STEPS = [
  { n: "01", t: "Selección", c: "Cada mañana revisamos tallo por tallo: apertura, color y firmeza." },
  { n: "02", t: "Composición", c: "Proporción, textura y peso del papel se deciden pieza por pieza." },
  { n: "03", t: "Acabado", c: "Sellado, tarjeta manuscrita y cinta anudada a mano." },
  { n: "04", t: "Entrega", c: "Transporte cuidado y confirmación fotográfica al llegar." },
];

function About() {
  useReveal();
  return (
    <div className="pt-32 pb-24 md:pt-40">
      <section className="relative overflow-hidden">
        <PetalCanvas density={12} speed={0.6} />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <p className="eyebrow" data-anim="left">El atelier</p>
          <h1 data-anim="letters" className="mt-4 max-w-3xl font-display text-5xl leading-[1.02] md:text-7xl">
            Cultivamos <span className="text-lux-gradient italic">momentos</span>, no sólo flores
          </h1>
          <p data-anim="fade-up" className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Floristería Deluxe Premium nació en Barranquilla con una idea simple: si una flor va a
            representar algo importante, debe estar a la altura. Trabajamos con cultivos
            colombianos y flor importada, en cantidades pequeñas y controladas, para que cada pieza
            sea irrepetible.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-10 px-5 md:grid-cols-2 md:px-8">
        <img
          src="/img/prod-06.jpg"
          alt="Ramo insignia del atelier"
          loading="lazy"
          width={900}
          height={900}
          data-parallax="0.06" data-anim="clip" className="aspect-square w-full rounded-sm object-cover"
        />
        <div className="self-center">
          <h2 data-anim="clip" className="font-display text-3xl md:text-4xl">Cómo trabajamos</h2>
          <div className="mt-8 space-y-7" data-stagger="120">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-5" data-anim="left">
                <span className="font-display text-xl text-primary">{s.n}</span>
                <div>
                  <h3 className="font-display text-xl">{s.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.c}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            to="/catalogo"
            data-anim="zoom" className="press shine mt-10 inline-block bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
          >
            Ver el catálogo
          </Link>
        </div>
      </section>
    </div>
  );
}
