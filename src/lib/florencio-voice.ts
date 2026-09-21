export type FlorencioAudioKind =
  | "greeting"
  | "looking"
  | "ask"
  | "choice"
  | "added"
  | "recommend"
  | "budget";

export type FlorencioLang = "es" | "en";

const AUDIO_KEY = "deluxury_audio_enabled_v1";
const DEFAULT_ENABLED = true;

const FILES: Record<FlorencioAudioKind, Record<FlorencioLang, string>> = {
  greeting: {
    es: "/audio/florencio/florencio-greeting.es.mp3",
    en: "/audio/florencio/florencio-greeting.en.mp3",
  },
  looking: {
    es: "/audio/florencio/florencio-looking.es.mp3",
    en: "/audio/florencio/florencio-looking.en.mp3",
  },
  ask: {
    es: "/audio/florencio/florencio-ask.es.mp3",
    en: "/audio/florencio/florencio-ask.en.mp3",
  },
  choice: {
    es: "/audio/florencio/florencio-choice.es.mp3",
    en: "/audio/florencio/florencio-choice.en.mp3",
  },
  added: {
    es: "/audio/florencio/florencio-added.es.mp3",
    en: "/audio/florencio/florencio-added.en.mp3",
  },
  recommend: {
    es: "/audio/florencio/florencio-recommend.es.mp3",
    en: "/audio/florencio/florencio-recommend.en.mp3",
  },
  budget: {
    es: "/audio/florencio/florencio-budget.es.mp3",
    en: "/audio/florencio/florencio-budget.en.mp3",
  },
};

let sharedAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
    sharedAudio.volume = 0.75;
    sharedAudio.setAttribute("playsinline", "true");
  }
  return sharedAudio;
}

export function getFlorencioAudioEnabled() {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  try {
    const saved = localStorage.getItem(AUDIO_KEY);
    return saved === null ? DEFAULT_ENABLED : saved === "true";
  } catch {
    return DEFAULT_ENABLED;
  }
}

export function setFlorencioAudioEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUDIO_KEY, String(enabled));
  } catch {
    /* ignore storage errors */
  }
  window.dispatchEvent(
    new CustomEvent("deluxury:audio-changed", { detail: { enabled } }),
  );
  if (!enabled) {
    sharedAudio?.pause();
  }
}

export async function unlockFlorencioAudio() {
  if (typeof window === "undefined" || !getFlorencioAudioEnabled()) return false;
  const audio = getAudio();
  if (!audio) return false;

  try {
    // Use the actual first phrase during the user's language-selection gesture.
    audio.src = FILES.greeting.es;
    audio.currentTime = 0;
    audio.muted = false;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
    return true;
  } catch {
    // The caller can retry from the same user gesture with another audio element.
    return false;
  }
}

export async function playFlorencioAudio(
  kind: FlorencioAudioKind,
  lang: FlorencioLang,
) {
  if (typeof window === "undefined" || !getFlorencioAudioEnabled()) return;
  const audio = getAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.src = FILES[kind][lang];
    audio.currentTime = 0;
    audio.muted = false;
    await audio.play();
    audioUnlocked = true;
  } catch {
    // Do not break the chat if a browser blocks playback.
  }
}


export async function unlockSiteAudio(src: string) {
  if (typeof window === "undefined" || !getFlorencioAudioEnabled()) return false;
  const audio = getAudio();
  if (!audio) return false;

  try {
    audio.pause();
    audio.src = src;
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = 0.6;
    await audio.play();
    audioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

export function stopFlorencioAudio() {
  sharedAudio?.pause();
}

export function isFlorencioAudioUnlocked() {
  return audioUnlocked;
}
