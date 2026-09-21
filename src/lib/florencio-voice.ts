import type { Lang } from "@/lib/i18n";

export type FlorencioVoiceKey =
  | "greeting"
  | "looking"
  | "ask"
  | "choice"
  | "added"
  | "recommend"
  | "budget";

const BASE = "/audio/florencio";

export const FLORENCIO_VOICE_PATHS: Record<FlorencioVoiceKey, Record<Lang, string>> = {
  greeting: { es: `${BASE}/florencio-greeting.es.mp3`, en: `${BASE}/florencio-greeting.en.mp3` },
  looking: { es: `${BASE}/florencio-looking.es.mp3`, en: `${BASE}/florencio-looking.en.mp3` },
  ask: { es: `${BASE}/florencio-ask.es.mp3`, en: `${BASE}/florencio-ask.en.mp3` },
  choice: { es: `${BASE}/florencio-choice.es.mp3`, en: `${BASE}/florencio-choice.en.mp3` },
  added: { es: `${BASE}/florencio-added.es.mp3`, en: `${BASE}/florencio-added.en.mp3` },
  recommend: { es: `${BASE}/florencio-recommend.es.mp3`, en: `${BASE}/florencio-recommend.en.mp3` },
  budget: { es: `${BASE}/florencio-budget.es.mp3`, en: `${BASE}/florencio-budget.en.mp3` },
};

let voiceUnlocked = false;
let activeAudio: HTMLAudioElement | null = null;

export function unlockFlorencioVoice() {
  voiceUnlocked = true;
}

export function playFlorencioVoice(key: FlorencioVoiceKey, lang: Lang) {
  if (typeof window === "undefined") return;
  const src = FLORENCIO_VOICE_PATHS[key]?.[lang];
  if (!src) return;

  activeAudio?.pause();
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.9;
  activeAudio = audio;

  const play = () => {
    void audio.play().catch(() => {
      // Browser autoplay policies may block periodic voice until a gesture occurs.
    });
  };

  if (voiceUnlocked) play();
  else {
    // We still attempt once; if blocked, the next user gesture can unlock later.
    play();
  }
}
