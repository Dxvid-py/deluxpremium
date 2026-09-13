import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import ImageField from "@/components/ImageField";
import { settingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

const field = "w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary";

export default function HomeMediaPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const value = (key: string, fallback = "") => draft[key] ?? settings?.[key] ?? fallback;

  const save = async () => {
    const rows = Object.entries(draft).map(([key, value]) => ({ key, value }));
    if (!rows.length) { toast.info("No hay cambios"); return; }
    const { error } = await supabase.from("site_settings").upsert(rows);
    if (error) { toast.error(error.message); return; }
    setDraft({});
    await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
    toast.success("Contenido del inicio actualizado");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">Contenido del inicio</p>
        <h2 className="mt-2 font-display text-3xl">Imágenes que puedes cambiar sin código</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Las imágenes de cada colección se siguen administrando desde “Categorías”. Aquí controlas la pieza editorial del home y la imagen ambiental de la intro.</p>
      </div>
      <div className="space-y-7 border border-border p-6 md:p-8">
        <div>
          <p className="text-xs text-muted-foreground">Imagen editorial del home</p>
          <p className="mt-1 text-sm text-muted-foreground">Aparece junto al texto editorial de la portada.</p>
          <div className="mt-4"><ImageField value={value("home_editorial_image_url", "/img/hero-02.jpg")} folder="home" label="Imagen editorial" onChange={(url) => setDraft((d) => ({ ...d, home_editorial_image_url: url }))} /></div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Imagen de fondo de la intro</p>
          <p className="mt-1 text-sm text-muted-foreground">Se usa detrás del logo durante la intro cinematográfica.</p>
          <div className="mt-4"><ImageField value={value("intro_background_image_url", "/img/hero-01.jpg")} folder="intro" label="Imagen de intro" onChange={(url) => setDraft((d) => ({ ...d, intro_background_image_url: url }))} /></div>
        </div>
        <label className="block">
          <span className="text-xs text-muted-foreground">URL del audio de intro</span>
          <input className={`${field} mt-1.5`} value={value("intro_audio_url", "/audio/intro-deluxe.mp3")} onChange={(e) => setDraft((d) => ({ ...d, intro_audio_url: e.target.value }))} placeholder="/audio/intro-deluxe.mp3 o URL pública" />
        </label>
        <button type="button" onClick={() => void save()} className="press inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"><Save className="h-3.5 w-3.5" /> Guardar cambios</button>
      </div>
    </div>
  );
}
