export type HomePopup = {
  id: string;
  active: boolean;
  image: string;
  title: string;
  text: string;
  /** Si tiene link, la imagen y el botón lo abren. */
  link: string;
  buttonLabel: string;
  /** session = una vez por visita · daily = una vez al día · always = cada vez que entra al inicio */
  frequency: "session" | "daily" | "always";
  /** Fechas opcionales (AAAA-MM-DD) para programar la ventana. */
  startsAt: string;
  endsAt: string;
};

export function newPopup(): HomePopup {
  return {
    id: `popup-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    active: true,
    image: "",
    title: "",
    text: "",
    link: "",
    buttonLabel: "Ver más",
    frequency: "session",
    startsAt: "",
    endsAt: "",
  };
}

export function parsePopups(raw: string | undefined): HomePopup[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x, i) => ({
        id: typeof x["id"] === "string" && x["id"] ? x["id"] : `popup-${i}`,
        active: x["active"] !== false,
        image: typeof x["image"] === "string" ? x["image"] : "",
        title: typeof x["title"] === "string" ? x["title"] : "",
        text: typeof x["text"] === "string" ? x["text"] : "",
        link: typeof x["link"] === "string" ? x["link"] : "",
        buttonLabel: typeof x["buttonLabel"] === "string" ? x["buttonLabel"] : "Ver más",
        frequency: x["frequency"] === "daily" || x["frequency"] === "always" ? x["frequency"] : "session",
        startsAt: typeof x["startsAt"] === "string" ? x["startsAt"] : "",
        endsAt: typeof x["endsAt"] === "string" ? x["endsAt"] : "",
      }));
  } catch {
    return [];
  }
}

/** Fecha de hoy en Colombia (YYYY-MM-DD). */
function todayBogota() {
  return new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
}

export function isPopupLive(p: HomePopup): boolean {
  if (!p.active) return false;
  if (!p.image && !p.title && !p.text) return false;
  const today = todayBogota();
  if (p.startsAt && today < p.startsAt) return false;
  if (p.endsAt && today > p.endsAt) return false;
  return true;
}

const seenKey = (p: HomePopup) => `deluxury-popup:${p.id}`;

export function wasSeen(p: HomePopup): boolean {
  if (p.frequency === "always") return false;
  try {
    if (p.frequency === "session") return sessionStorage.getItem(seenKey(p)) === "1";
    return localStorage.getItem(seenKey(p)) === todayBogota();
  } catch {
    return false;
  }
}

export function markSeen(p: HomePopup) {
  try {
    if (p.frequency === "session") sessionStorage.setItem(seenKey(p), "1");
    else if (p.frequency === "daily") localStorage.setItem(seenKey(p), todayBogota());
  } catch {
    /* ignore */
  }
}
