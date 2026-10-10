import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Info } from "lucide-react";
import {
  addDays,
  availableSlots,
  bogotaNow,
  formatDeliveryDate,
  MONTH_SHORT,
  parseDateKey,
  sameDayNotice,
  startOfWeekMonday,
  toDateKey,
  WEEKDAY_SHORT,
  type DeliveryConfig,
} from "@/lib/delivery";

export type DeliveryChoice = { date: string; slot: string } | null;

/**
 * Calendario semanal de entrega. Solo muestra horarios que existen de verdad:
 * lo que ya pasó en Colombia, lo que no cumple las horas mínimas de anticipación
 * y los días bloqueados quedan fuera. Se actualiza solo cada minuto.
 */
export default function DeliveryPicker({
  config,
  value,
  onChange,
}: {
  config: DeliveryConfig;
  value: DeliveryChoice;
  onChange: (choice: DeliveryChoice) => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const today = bogotaNow(nowMs);
  const todayKey = toDateKey(today);
  const currentWeek = startOfWeekMonday(today);
  const [weekStart, setWeekStart] = useState<Date>(() => (value ? startOfWeekMonday(parseDateKey(value.date)) : currentWeek));
  const [activeDay, setActiveDay] = useState<string | null>(value?.date ?? null);

  // Reloj: se refresca cada minuto para que un horario que ya no aplica desaparezca solo.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of days) {
      const key = toDateKey(d);
      const beyond = parseDateKey(key).getTime() - parseDateKey(todayKey).getTime() > config.maxDaysAhead * 86_400_000;
      map.set(key, beyond ? [] : availableSlots(key, config, nowMs));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, config, nowMs, todayKey]);

  // Si lo elegido deja de ser válido (pasó la hora), se limpia.
  useEffect(() => {
    if (!value) return;
    if (!availableSlots(value.date, config, nowMs).includes(value.slot)) onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMs, config]);

  // En móvil, el día activo por defecto es el primero con horarios.
  useEffect(() => {
    if (activeDay && slotsByDay.has(activeDay)) return;
    const first = days.map((d) => toDateKey(d)).find((k) => (slotsByDay.get(k) ?? []).length > 0);
    setActiveDay(first ?? toDateKey(days[0]!));
  }, [days, slotsByDay, activeDay]);

  const canGoBack = weekStart.getTime() > currentWeek.getTime();
  const maxWeek = startOfWeekMonday(addDays(today, config.maxDaysAhead));
  const canGoNext = weekStart.getTime() < maxWeek.getTime();

  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = `${weekStart.getUTCDate()} ${MONTH_SHORT[weekStart.getUTCMonth()]} – ${weekEnd.getUTCDate()} ${MONTH_SHORT[weekEnd.getUTCMonth()]}`;
  const noSlotsToday = (slotsByDay.get(todayKey) ?? availableSlots(todayKey, config, nowMs)).length === 0;

  const choose = (date: string, slot: string) => {
    const same = value?.date === date && value.slot === slot;
    onChange(same ? null : { date, slot });
  };

  const slotButton = (date: string, slot: string, compact = false) => {
    const selected = value?.date === date && value.slot === slot;
    return (
      <button
        key={slot}
        type="button"
        onClick={() => choose(date, slot)}
        aria-pressed={selected}
        className={`w-full rounded-xl border px-2 py-2.5 text-center text-[11px] font-medium tracking-[0.02em] transition ${
          selected
            ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_rgba(138,101,59,.9)]"
            : "border-primary/25 bg-white text-foreground hover:border-primary hover:bg-primary/5"
        } ${compact ? "" : "sm:text-xs"}`}
      >
        {slot}
      </button>
    );
  };

  return (
    <div>
      <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-primary/[.05] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          <strong className="font-medium text-foreground">{sameDayNotice(config.leadHours)}</strong>{" "}
          {noSlotsToday ? "Para hoy ya no hay horarios disponibles; elige otro día." : "Si prefieres, también puedes agendar para otro día."}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_-45px_rgba(62,37,20,.45)]">
        <div className="flex items-center justify-between border-b border-border bg-[#fbf6ed] px-3 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            disabled={!canGoBack}
            aria-label="Semana anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" /> {rangeLabel}
          </p>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            disabled={!canGoNext}
            aria-label="Semana siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Escritorio: semana completa */}
        <div className="hidden grid-cols-7 md:grid">
          {days.map((d, i) => {
            const key = toDateKey(d);
            const slots = slotsByDay.get(key) ?? [];
            const past = key < todayKey;
            const isToday = key === todayKey;
            return (
              <div key={key} className={`min-w-0 ${i < 6 ? "border-r border-border" : ""}`}>
                <div className={`border-b border-border px-1 py-3 text-center ${past ? "opacity-40" : ""}`}>
                  <p className="text-[9px] tracking-[0.18em] text-muted-foreground">{WEEKDAY_SHORT[d.getUTCDay()]}</p>
                  <p className={`mt-1 text-lg font-semibold ${isToday ? "text-primary" : ""}`}>{d.getUTCDate()}</p>
                  <p className="text-[9px] text-muted-foreground">{isToday ? "hoy" : MONTH_SHORT[d.getUTCMonth()]}</p>
                </div>
                <div className="min-h-[120px] space-y-2 p-2">
                  {slots.length ? (
                    slots.map((slot) => slotButton(key, slot, true))
                  ) : (
                    <p className="pt-4 text-center text-muted-foreground/60">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Móvil: días como chips + horarios del día elegido */}
        <div className="md:hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {days.map((d) => {
              const key = toDateKey(d);
              const slots = slotsByDay.get(key) ?? [];
              const disabled = slots.length === 0;
              const active = activeDay === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setActiveDay(key)}
                  className={`flex flex-col items-center gap-0.5 px-0.5 py-2.5 text-center transition ${
                    active ? "bg-primary/10" : ""
                  } ${disabled ? "opacity-35" : ""}`}
                >
                  <span className="text-[8px] tracking-[0.12em] text-muted-foreground">{WEEKDAY_SHORT[d.getUTCDay()]}</span>
                  <span className={`text-base font-semibold ${active ? "text-primary" : ""}`}>{d.getUTCDate()}</span>
                  <span className={`h-1 w-1 rounded-full ${slots.length ? "bg-primary" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
          <div className="space-y-2 p-3">
            {activeDay && (slotsByDay.get(activeDay) ?? []).length ? (
              (slotsByDay.get(activeDay) ?? []).map((slot) => slotButton(activeDay, slot))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay horarios disponibles esta semana para ese día.</p>
            )}
          </div>
        </div>
      </div>

      <div
        className={`mt-3 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
          value ? "border-emerald-200 bg-emerald-50/70 text-emerald-900" : "border-border bg-secondary/30 text-muted-foreground"
        }`}
        aria-live="polite"
      >
        <Clock className="h-4 w-4 shrink-0" />
        {value ? (
          <span>
            Entrega: <strong className="font-medium">{formatDeliveryDate(value.date)}</strong> · {value.slot}
          </span>
        ) : (
          <span>Elige el día y la hora de entrega para continuar.</span>
        )}
      </div>
    </div>
  );
}
