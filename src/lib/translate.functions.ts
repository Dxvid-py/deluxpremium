import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  texts: z.array(z.string()).max(120),
  target: z.enum(["en"]).default("en"),
});

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Traduce automáticamente el contenido dinámico del catálogo (nombres,
 * descripciones, etiquetas) al idioma solicitado y guarda el resultado en la
 * tabla `translations` para que la siguiente visita sea instantánea.
 */
export const translateTexts = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    const unique = Array.from(
      new Set(data.texts.map((t) => t.trim()).filter((t) => t.length > 0)),
    ).slice(0, 120);
    if (unique.length === 0) return { map: {} as Record<string, string> };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const hashes = await Promise.all(unique.map((t) => sha256(`${data.target}:${t}`)));
    const byHash = new Map(hashes.map((h, i) => [h, unique[i] as string]));

    const { data: cached } = await supabaseAdmin
      .from("translations")
      .select("source_hash, translated_text")
      .eq("target_lang", data.target)
      .in("source_hash", hashes);

    const map: Record<string, string> = {};
    const cachedHashes = new Set<string>();
    for (const row of cached ?? []) {
      const source = byHash.get(row.source_hash);
      if (source) {
        map[source] = row.translated_text;
        cachedHashes.add(row.source_hash);
      }
    }

    const missing = hashes
      .map((h, i) => ({ hash: h, text: unique[i] as string }))
      .filter((item) => !cachedHashes.has(item.hash));

    if (missing.length === 0) return { map };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { map };

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You translate luxury florist e-commerce copy from Spanish to English. Keep the elegant editorial tone, keep proper nouns and brand names untouched. Reply ONLY with a JSON array of translated strings, same length and order as the input array.",
            },
            {
              role: "user",
              content: JSON.stringify(missing.map((m) => m.text)),
            },
          ],
        }),
      });

      if (!response.ok) {
        // 402/403 = creditos o politica; 429/5xx = temporal. Devolvemos el original.
        return { map, error: `ai_${response.status}` };
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const jsonText = raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1);
      const translated = JSON.parse(jsonText) as unknown;
      if (!Array.isArray(translated)) return { map, error: "ai_shape" };

      const rows: {
        source_hash: string;
        source_text: string;
        target_lang: string;
        translated_text: string;
      }[] = [];

      missing.forEach((item, i) => {
        const value = translated[i];
        if (typeof value !== "string" || value.trim().length === 0) return;
        map[item.text] = value;
        rows.push({
          source_hash: item.hash,
          source_text: item.text,
          target_lang: data.target,
          translated_text: value,
        });
      });

      if (rows.length > 0) {
        await supabaseAdmin
          .from("translations")
          .upsert(rows, { onConflict: "source_hash" });
      }

      return { map };
    } catch {
      return { map, error: "ai_exception" };
    }
  });
