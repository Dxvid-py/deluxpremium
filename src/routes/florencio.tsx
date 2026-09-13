import { createFileRoute } from "@tanstack/react-router";
import FlorencioCatalogAssistant from "@/components/FlorencioCatalogAssistant";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente floral de Deluxury" },
      {
        name: "description",
        content:
          "Habla con Florencio, el asistente floral de Deluxury, y encuentra piezas del catálogo pensadas para tu momento.",
      },
    ],
  }),
  component: FlorencioPage,
});

function FlorencioPage() {
  return (
    <div className="overflow-hidden pt-24 md:pt-28">
      <section className="relative overflow-hidden border-b border-border bg-[#fbf7f0]">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(137,100,56,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(137,100,56,0.045)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#e3c8a2]/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-0 h-96 w-96 rounded-full bg-[#7c2736]/8 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-18">
          <p className="eyebrow">El asistente floral de Deluxury</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.92] md:text-7xl">
            Habla con{" "}
            <span className="text-lux-gradient italic">Florencio.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Cuéntale qué quieres regalar y deja que la conversación te lleve a
            una selección del catálogo real de Deluxury.
          </p>
        </div>
      </section>

      <section
        id="florencio-chat"
        className="border-b border-border bg-[#f5ede4] py-8 md:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <FlorencioCatalogAssistant />
        </div>
      </section>
    </div>
  );
}
