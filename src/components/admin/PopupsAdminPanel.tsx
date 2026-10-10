import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ImageField from "@/components/ImageField";
import { PopupView } from "@/components/HomePopups";
import { settingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { newPopup, parsePopups, type HomePopup } from "@/lib/popups";

const field = "w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary";

export default function PopupsAdminPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [popups, setPopups] = useState<HomePopup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<HomePopup | null>(null);

  useEffect(() => {
    if (!settings || loaded) return;
    setPopups(parsePopups(settings["home_popups_json"]));
    setLoaded(true);
  }, [settings, loaded]);

  const patch = (id: string, values: Partial<HomePopup>) =>
    setPopups((list) => list.map((p) => (p.id === id ? { ...p, ...values } : p)));

  const save = async () => {
    const { error } = await supabase.from("site_settings").upsert([{ key: "home_popups_json", value: JSON.stringify(popups) }]);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
    toast.success("Ventanas emergentes guardadas");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="eyebrow">Ventanas emergentes</p>
        <h2 className="mt-2 font-display text-3xl">Avisos del inicio</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Aparecen solo en la página de inicio, después de la intro. Puedes poner una foto, un título, un texto y un link: si lo agregas, la imagen y el botón llevan allí
          (una ruta del sitio como <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/catalogo</code> o un enlace completo). Si hay varias activas, se muestran una tras otra.
        </p>
      </div>

      {popups.length === 0 && <p className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Todavía no hay ventanas. Crea la primera.</p>}

      {popups.map((p, index) => (
        <div key={p.id} className="space-y-5 border border-border p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={p.active} onChange={(e) => patch(p.id, { active: e.target.checked })} />
              <span>
                Ventana {index + 1} · <strong className="font-medium">{p.active ? "Activa" : "Desactivada"}</strong>
              </span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPreview(p)} className="inline-flex items-center gap-2 border border-border px-3.5 py-2 text-[10px] tracking-[0.18em] uppercase hover:border-primary">
                <Eye className="h-3.5 w-3.5" /> Vista previa
              </button>
              <button
                type="button"
                onClick={() => setPopups((list) => list.filter((x) => x.id !== p.id))}
                className="inline-flex items-center gap-2 border border-border px-3.5 py-2 text-[10px] tracking-[0.18em] uppercase hover:border-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Foto</p>
            <ImageField value={p.image} folder="popups" label="Foto de la ventana" onChange={(url) => patch(p.id, { image: url })} />
          </div>

          <label className="block">
            <span className="text-xs text-muted-foreground">Título (opcional)</span>
            <input className={`${field} mt-1.5`} value={p.title} onChange={(e) => patch(p.id, { title: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Texto (opcional)</span>
            <textarea className={`${field} mt-1.5 min-h-24`} value={p.text} onChange={(e) => patch(p.id, { text: e.target.value })} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs text-muted-foreground">Link al hacer clic (opcional)</span>
              <input className={`${field} mt-1.5`} value={p.link} placeholder="/catalogo o https://…" onChange={(e) => patch(p.id, { link: e.target.value.trim() })} />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Texto del botón</span>
              <input className={`${field} mt-1.5`} value={p.buttonLabel} onChange={(e) => patch(p.id, { buttonLabel: e.target.value })} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Cuándo se muestra</span>
              <select className={`${field} mt-1.5 bg-card`} value={p.frequency} onChange={(e) => patch(p.id, { frequency: e.target.value as HomePopup["frequency"] })}>
                <option value="session">Una vez por visita</option>
                <option value="daily">Una vez al día</option>
                <option value="always">Cada vez que entre al inicio</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Desde (opcional)</span>
              <input className={`${field} mt-1.5`} type="date" value={p.startsAt} onChange={(e) => patch(p.id, { startsAt: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Hasta (opcional)</span>
              <input className={`${field} mt-1.5`} type="date" value={p.endsAt} onChange={(e) => patch(p.id, { endsAt: e.target.value })} />
            </label>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setPopups((list) => [...list, newPopup()])} className="inline-flex items-center gap-2 border border-border px-6 py-3.5 text-[11px] tracking-[0.22em] uppercase hover:border-primary">
          <Plus className="h-3.5 w-3.5" /> Nueva ventana
        </button>
        <button type="button" onClick={() => void save()} className="press inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase">
          <Save className="h-3.5 w-3.5" /> Guardar cambios
        </button>
      </div>

      {preview && <PopupView popup={preview} onClose={() => setPreview(null)} preview />}
    </div>
  );
}
