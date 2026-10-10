/**
 * Entregas: horarios, reglas y hora real de Colombia.
 *
 * - Colombia es UTC-5 todo el año (no tiene horario de verano), así que la hora
 *   de Bogotá se calcula siempre desde la hora UTC, sin depender del reloj del
 *   dispositivo del cliente.
 * - Los horarios se editan en el admin (pestaña "Entregas") y se guardan en
 *   site_settings: delivery_schedule_json, delivery_lead_hours, delivery_blocked_dates.
 */

export type DeliveryConfig = {
  /** Horarios por día de la semana. 0 = domingo … 6 = sábado. Cada horario es un texto como "09:00" o "09:00 – 12:00". */
  schedule: Record<number, string[]>;
  /** Horas mínimas de anticipación entre ahora y la hora de entrega. */
  leadHours: number;
  /** Fechas (YYYY-MM-DD) en las que no se entrega. */
  blockedDates: string[];
  /** Hasta cuántos días hacia adelante se puede agendar. */
  maxDaysAhead: number;
};

export const DEFAULT_SCHEDULE: Record<number, string[]> = {
  0: ["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00"],
  1: ["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"],
  2: ["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"],
  3: ["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"],
  4: ["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"],
  5: ["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"],
  6: ["09:00 – 12:00", "12:00 – 15:00", "15:00 – 18:00", "18:00 – 20:00"],
};

export const DEFAULT_LEAD_HOURS = 6;
export const MAX_DAYS_AHEAD = 60;

export const WEEKDAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAY_SHORT = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
export const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** "Ahora" en Colombia, expresado como una fecha UTC cuyo reloj coincide con el de Bogotá. */
export function bogotaNow(nowMs = Date.now()): Date {
  return new Date(nowMs - BOGOTA_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** Lunes de la semana de la fecha dada. */
export function startOfWeekMonday(d: Date): Date {
  const day = d.getUTCDay(); // 0 domingo
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), diff);
}

/** Minutos desde medianoche del primer HH:MM del texto ("09:00 – 12:00" → 540). */
export function slotStartMinutes(slot: string): number | null {
  const m = slot.match(/(\d{1,2})\s*[:.h]\s*(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function normalizeSlot(raw: string): string {
  return raw.replace(/\s+/g, " ").replace(/\s*[-–—]\s*/g, " – ").trim();
}

function parseSlotList(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]/) : [];
  return list
    .filter((x): x is string => typeof x === "string")
    .map(normalizeSlot)
    .filter((x) => slotStartMinutes(x) !== null)
    .sort((a, b) => (slotStartMinutes(a) ?? 0) - (slotStartMinutes(b) ?? 0));
}

export function getDeliveryConfig(settings: Record<string, string> | null | undefined): DeliveryConfig {
  let schedule: Record<number, string[]> = { ...DEFAULT_SCHEDULE };
  const raw = settings?.["delivery_schedule_json"];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const next: Record<number, string[]> = {};
      for (let i = 0; i < 7; i++) next[i] = parseSlotList(parsed[String(i)]);
      schedule = next;
    } catch {
      /* JSON inválido: se usan los horarios por defecto */
    }
  }
  const lead = Number(settings?.["delivery_lead_hours"]);
  const blocked = (settings?.["delivery_blocked_dates"] ?? "")
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  return {
    schedule,
    leadHours: Number.isFinite(lead) && lead >= 0 ? lead : DEFAULT_LEAD_HOURS,
    blockedDates: blocked,
    maxDaysAhead: MAX_DAYS_AHEAD,
  };
}

export function serializeSchedule(schedule: Record<number, string[]>): string {
  const out: Record<string, string[]> = {};
  for (let i = 0; i < 7; i++) out[String(i)] = parseSlotList(schedule[i] ?? []);
  return JSON.stringify(out);
}

/**
 * Horarios realmente disponibles para una fecha: se descarta todo lo que
 * ya pasó o que no cumple las horas mínimas de anticipación.
 */
export function availableSlots(dateKey: string, config: DeliveryConfig, nowMs = Date.now()): string[] {
  if (config.blockedDates.includes(dateKey)) return [];
  const date = parseDateKey(dateKey);
  const slots = config.schedule[date.getUTCDay()] ?? [];
  const nowBogota = bogotaNow(nowMs).getTime();
  const earliest = nowBogota + config.leadHours * 3_600_000;
  return slots.filter((slot) => {
    const start = slotStartMinutes(slot);
    if (start === null) return false;
    return date.getTime() + start * 60_000 >= earliest;
  });
}

export function isSlotAvailable(dateKey: string, slot: string, config: DeliveryConfig, nowMs = Date.now()): boolean {
  return availableSlots(dateKey, config, nowMs).includes(slot);
}

export function formatDeliveryDate(dateKey: string | null | undefined): string {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return `${WEEKDAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTH_SHORT[d.getUTCMonth()]}`;
}

export function sameDayNotice(leadHours: number): string {
  return `Pedidos para hoy: deben hacerse en la mañana, con mínimo ${leadHours} horas de anticipación a la hora de entrega.`;
}
