import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ImageField from "@/components/ImageField";
import { settingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

type MediaItem = { type: "image" | "reel"; url: string; caption: string; link: string };
const field = "w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary";
function parseMedia(raw?: string): MediaItem[] { try { const arr = JSON.parse(raw || "[]"); return Array.isArray(arr) ? arr.map((x) => ({ type: x?.type === "reel" ? "reel" : "image", url: typeof x?.url === "string" ? x.url : "", caption: typeof x?.caption === "string" ? x.caption : "", link: typeof x?.link === "string" ? x.link : "" })) : []; } catch { return []; } }

export default function FlorencioAdminPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [mediaDraft, setMediaDraft] = useState<MediaItem[] | null>(null);
  const value = (key: string, fallback = "") => draft[key] ?? settings?.[key] ?? fallback;
  const media = mediaDraft ?? parseMedia(settings?.florencio_media_json);
  const save = async () => {
    const rows = Object.entries(draft).map(([key, value]) => ({ key, value }));
    if (mediaDraft) rows.push({ key: "florencio_media_json", value: JSON.stringify(mediaDraft) });
    if (!rows.length) { toast.info("No hay cambios"); return; }
    const { error } = await supabase.from("site_settings").upsert(rows);
    if (error) { toast.error(error.message); return; }
    setDraft({}); setMediaDraft(null); await qc.invalidateQueries({ queryKey: settingsQuery.queryKey }); toast.success("Florencio actualizado");
  };
  const setMedia = (index: number, patch: Partial<MediaItem>) => setMediaDraft(media.map((item, i) => i === index ? { ...item, ...patch } : item));
  return <div className="max-w-5xl space-y-7">
    <div><p className="eyebrow">Mascota y asistente</p><h2 className="mt-2 font-display text-3xl">Florencio</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Gestiona por separado su foto de perfil, la imagen principal y el contenido de su experiencia.</p></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border border-border bg-background p-6 md:p-8"><p className="eyebrow">Foto de perfil</p><h3 className="mt-2 font-display text-2xl">Solo su rostro</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Esta imagen se usa como avatar circular en la conversación. El sitio recorta automáticamente la parte superior del retrato.</p><div className="mt-6"><ImageField value={value("florencio_profile_image_url", "/img/florencio.png")} folder="florencio/profile" label="Foto de perfil" onChange={(url) => setDraft(d => ({ ...d, florencio_profile_image_url: url }))} /></div></div>
      <div className="border border-border bg-background p-6 md:p-8"><p className="eyebrow">Imagen principal</p><h3 className="mt-2 font-display text-2xl">Presentación visual</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Se mantiene independiente del avatar para que puedas cambiar la identidad visual sin alterar la foto del chat.</p><div className="mt-6"><ImageField value={value("florencio_intro_image_url", "/img/florencio.png")} folder="florencio" label="Imagen principal" onChange={(url) => setDraft(d => ({ ...d, florencio_intro_image_url: url }))} /></div></div>
    </div>
    <div className="grid gap-5 border border-border bg-background p-6 md:grid-cols-2 md:p-8">
      <label><span className="text-xs text-muted-foreground">Servicio de entrega con Florencio</span><select className={`${field} mt-1.5 bg-card`} value={value("florencio_delivery_enabled", "true")} onChange={e => setDraft(d => ({ ...d, florencio_delivery_enabled: e.target.value }))}><option value="true">Activo</option><option value="false">Oculto</option></select></label>
      <label><span className="text-xs text-muted-foreground">Precio extra (COP)</span><input className={`${field} mt-1.5`} type="number" value={value("florencio_delivery_price_cop")} onChange={e => setDraft(d => ({ ...d, florencio_delivery_price_cop: e.target.value }))} placeholder="Ej. 25000" /></label>
      <label className="md:col-span-2"><span className="text-xs text-muted-foreground">Descripción del servicio</span><textarea className={`${field} mt-1.5`} rows={4} value={value("florencio_delivery_description")} onChange={e => setDraft(d => ({ ...d, florencio_delivery_description: e.target.value }))} placeholder="Qué incluye la entrega especial…" /></label>
    </div>
    <div className="border border-border bg-background p-6 md:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Contenido exclusivo</p><h3 className="mt-2 font-display text-2xl">Fotos y reels de Florencio</h3></div><button type="button" onClick={() => setMediaDraft([...media, { type: "image", url: "", caption: "", link: "" }])} className="press inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[10px] tracking-[.22em] uppercase hover:border-primary"><Plus className="h-3.5 w-3.5" />Añadir</button></div>
      <div className="mt-6 space-y-5">{media.map((item, index) => <article key={`${index}-${item.url}`} className="rounded-2xl border border-border p-5"><div className="grid gap-4 md:grid-cols-[180px_1fr]">{item.type === "image" ? <ImageField value={item.url} folder="florencio/media" label={`Foto ${index + 1}`} onChange={url => setMedia(index, { url })} /> : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">Reel externo de Instagram</div>}<div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><select className={`${field} bg-card`} value={item.type} onChange={e => setMedia(index, { type: e.target.value === "reel" ? "reel" : "image" })}><option value="image">Foto</option><option value="reel">Reel de Instagram</option></select><input className={field} value={item.caption} onChange={e => setMedia(index, { caption: e.target.value })} placeholder="Título o descripción" /></div><input className={field} value={item.url} onChange={e => setMedia(index, { url: e.target.value })} placeholder="URL" /><div className="flex items-center gap-3"><input className={`${field} flex-1`} value={item.link} onChange={e => setMedia(index, { link: e.target.value })} placeholder="Enlace a Instagram (opcional)" /><button type="button" onClick={() => setMediaDraft(media.filter((_, i) => i !== index))} className="flex h-11 w-11 shrink-0 items-center justify-center border border-border text-muted-foreground hover:border-accent hover:text-accent" aria-label="Eliminar"><Trash2 className="h-4 w-4" /></button></div></div></div></article>)}{media.length === 0 && <p className="border border-dashed border-border p-7 text-center text-sm text-muted-foreground">Todavía no has añadido contenido exclusivo para Florencio.</p>}</div>
    </div>
    <button type="button" onClick={() => void save()} className="press inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[.24em] text-primary-foreground uppercase"><Save className="h-3.5 w-3.5" />Guardar Florencio</button>
  </div>;
}
