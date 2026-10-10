import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LANDINGS } from "@/lib/seo-landings";

const STATIC = ["/", "/catalogo", "/nosotros", "/contacto", "/florencio"];

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const origin = new URL(request.url).origin;
        const urls: Array<{ loc: string; lastmod?: string; priority: string }> = [
          ...STATIC.map((p) => ({ loc: p, priority: p === "/" ? "1.0" : "0.8" })),
          ...LANDINGS.map((l) => ({ loc: `/flores/${l.slug}`, priority: "0.9" })),
        ];

        try {
          const [{ data: categories }, { data: products }] = await Promise.all([
            supabase.from("categories").select("slug,updated_at").eq("is_active", true),
            supabase.from("products").select("slug,updated_at").eq("is_active", true),
          ]);
          for (const c of categories ?? []) urls.push({ loc: `/coleccion/${c.slug}`, lastmod: c.updated_at, priority: "0.8" });
          for (const p of products ?? []) urls.push({ loc: `/producto/${p.slug}`, lastmod: p.updated_at, priority: "0.7" });
        } catch {
          /* si la base no responde, el sitemap sale con las páginas fijas */
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map(
            (u) =>
              `  <url><loc>${escapeXml(origin + u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}<priority>${u.priority}</priority></url>`,
          )
          .join("\n")}\n</urlset>\n`;

        return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
