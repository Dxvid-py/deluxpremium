import { createFileRoute } from "@tanstack/react-router";
import FlorencioCatalogAssistant from "@/components/FlorencioCatalogAssistant";

export const Route = createFileRoute("/florencio")({
  head: () => ({ meta: [{ title: "Florencio IA · Deluxury" }, { name: "description", content: "Florencio, el asistente floral de Deluxury para recomendaciones, pedidos y cuenta." }] }),
  component: FlorencioPage,
});

function FlorencioPage() {
  return <div className="pt-24 sm:pt-28"><section className="mx-auto max-w-[1500px] px-3 pb-12 sm:px-5 md:px-8 md:pb-16"><FlorencioCatalogAssistant /></section></div>;
}
