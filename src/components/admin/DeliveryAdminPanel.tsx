import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Save } from "lucide-react";
import { toast } from "sonner";
import DeliveryPicker, { type DeliveryChoice } from "@/components/DeliveryPicker";
import { settingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_LEAD_HOURS,
  getDeliveryConfig,
  normalizeSlot,
  serializeSchedule,
  slotStartMinutes,
  WEEKDAY_NAMES,
  type DeliveryConfig,
} from "@/lib/delivery";

const field = "w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary";
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes → domingo

const parseLine = (text: string) =>
  text
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

export default function DeliveryAdminPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [text, setText] = useState<Record<number, string>>({});
  const [lead, setLead] = useState<string>(String(DEFAULT_LEAD_HOURS));
  const [blocked, setBlocked] = useState("");
  const [preview, setPreview] = useState<DeliveryChoice>(null);
  const [loaded, setLoaded] = useState(false);

  // Carga inicial desde los ajustes guardados.
  useEffect(() => {
    if (!settings || loaded) return;
    const cfg = getDeliveryConfig(settings);
    const t: Record<number, string> = {};
    for (let i = 0; i < 7; i++) t[i] = (cfg.schedule[i] ?? []).join(", ");
    setText(t);
    setLead(String(cfg.leadHours));
    setBlocked(cfg.blockedDates.join(", "));
    setLoaded(true);
  }, [settings, loaded]);

  const invalid = useMemo(() => {
    const bad: string[] = [];
    for (const day of ORDER) for (const slot of parseLine(text[day] ?? "")) if (slotStartMinutes(slot) === null) bad.push(`${WEEKDAY_NAMES[day]}: "${slot}"`);
    return bad;
  }, [text]);

  const draftConfig: DeliveryConfig = useMemo(() => {
    const schedule: Record<number, string[]> = {};
    for (let i = 0; i < 7; i++) {
      schedule[i] = parseLine(text[i] ?? "")
        .map(normalizeSlot)
        .filter((s) => slotStartMinutes(s) !== null)
        .sort((a, b) => (slotStartMinutes(a) ?? 0) - (slotStartMinutes(b) ?? 0));
    }
    const leadNum = Number(lead);
    return {
      schedule,
      leadHours: Number.isFinite(leadNum) && leadNum >= 0 ? leadNum : DEFAULT_LEAD_HOURS,
      blockedDates: parseLine(blocked).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
      maxDaysAhead: 60,
    };
  }, [text, lead, blocked]);

  const save = async () => {
    if (invalid.length) {
      toast.error("Hay horarios con formato inválido. Usa por ejemplo 09:00 o 09:00 – 12:00.");
      return;
    }
    const rows = [
      { key: "delivery_schedule_json", value: serializeSchedule(draftConfig.schedule) },
      { key: "delivery_lead_hours", value: String(draftConfig.leadHours) },
      { key: "delivery_blocked_dates", value: draftConfig.blockedDates.join(", ") },
    ];
    const { error } = await supabase.from("site_settings").upsert(rows);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
    toast.success("Horarios de entrega guardados");
  };

  const copyMondayToAll = () => {
    const monday = text[1] ?? "";
    setText(Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, monday])) as Record<number, string>);
  };

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_1fr]">
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="eyebrow">Entregas</p>
          <h2 className="mt-2 font-display text-3xl">Horarios de entrega</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            El cliente solo ve los horarios que escribas aquí, y únicamente los que todavía son posibles con la hora real de Colombia y las horas mínimas de anticipación.
            Escribe cada horario separado por comas, por ejemplo <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">09:00 – 12:00, 12:00 – 15:00</code> o solo la hora <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">09:00, 10:00, 11:00</code>. Deja un día vacío si ese día no se entrega.
          </p>
        </div>

        <div className="space-y-4 border border-border p-6">
          {ORDER.map((day) => (
            <label key={day} className="block">
              <span className="text-xs text-muted-foreground">{WEEKDAY_NAMES[day]}</span>
              <input
                className={`${field} mt-1.5`}
                value={text[day] ?? ""}
                placeholder="Sin entregas este día"
                onChange={(e) => setText((t) => ({ ...t, [day]: e.target.value }))}
              />
            </label>
          ))}
          <button type="button" onClick={copyMondayToAll} className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[10px] tracking-[0.18em] uppercase hover:border-primary">
            <Copy className="h-3.5 w-3.5" /> Copiar los horarios del lunes a todos los días
          </button>
          {invalid.length > 0 && <p className="text-xs text-destructive">Formato inválido en: {invalid.join(" · ")}</p>}
        </div>

        <div className="space-y-5 border border-border p-6">
          <label className="block">
            <span className="text-xs text-muted-foreground">Horas mínimas de anticipación (entre que el cliente pide y la hora de entrega)</span>
            <input className={`${field} mt-1.5 max-w-[140px]`} type="number" min={0} max={72} value={lead} onChange={(e) => setLead(e.target.value)} />
            <span className="mt-1.5 block text-xs text-muted-foreground">Con {draftConfig.leadHours} h: si son las 8:00 a. m., el primer horario de hoy será desde las {String((8 + draftConfig.leadHours) % 24).padStart(2, "0")}:00.</span>
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Fechas sin entregas (festivos, cierres). Formato AAAA-MM-DD separado por comas</span>
            <textarea className={`${field} mt-1.5 min-h-20`} value={blocked} onChange={(e) => setBlocked(e.target.value)} placeholder="2026-12-25, 2027-01-01" />
          </label>
        </div>

        <button type="button" onClick={() => void save()} className="press inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase">
          <Save className="h-3.5 w-3.5" /> Guardar horarios
        </button>
      </div>

      <div>
        <p className="eyebrow">Vista previa</p>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">Así lo verá el cliente en el checkout, con la hora actual de Colombia.</p>
        <DeliveryPicker config={draftConfig} value={preview} onChange={setPreview} />
      </div>
    </div>
  );
}
