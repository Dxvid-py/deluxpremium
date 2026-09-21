import { createFileRoute } from "@tanstack/react-router";
import FlorencioCatalogAssistant from "@/components/FlorencioCatalogAssistant";

export const Route = createFileRoute("/florencio")({
  head: () => ({
    meta: [
      { title: "Florencio · Asistente de Deluxury" },
      {
        name: "description",
        content:
          "Habla con Florencio, el asistente floral de Deluxury, y descubre productos reales según ocasión, estilo y presupuesto.",
      },
    ],
  }),
  component: FlorencioPage,
});

function FlorencioPage() {
  return (
    <div className="pt-24 md:pt-28">
      <div className="mx-auto w-full max-w-[1400px] px-3 pb-10 sm:px-5 md:px-8">
        <FlorencioCatalogAssistant />
      </div>
    </div>
  );
}
