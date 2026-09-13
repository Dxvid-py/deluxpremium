import { supabase } from "@/integrations/supabase/client";
import type { FlorencioFilters } from "@/lib/florencio-recommendations";

export type FlorencioAIResult = {
  reply: string;
  filters: FlorencioFilters;
  keywords: string[];
};

export async function askFlorencioAI(input: {
  message: string;
  history: Array<{ role: "user" | "florencio"; text: string }>;
  currentFilters: FlorencioFilters;
}): Promise<FlorencioAIResult> {
  const { data, error } = await supabase.functions.invoke("florencio-ai", {
    body: input,
  });

  if (error) throw new Error(error.message || "No se pudo conectar con Florencio");
  if (!data || typeof data.reply !== "string") throw new Error("Respuesta inválida de Florencio");

  return {
    reply: data.reply,
    filters: data.filters ?? { keywords: [] },
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
  };
}
