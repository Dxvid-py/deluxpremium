/**
 * Traducción ES→EN del contenido dinámico (nombres y descripciones de la base
 * local). Sin servidor: se resuelve con un diccionario del atelier y una capa
 * de reemplazo palabra por palabra, con caché en memoria.
 */

const PHRASES: Record<string, string> = {
  "Amor & Romance": "Love & Romance",
  Cumpleaños: "Birthdays",
  Elegancia: "Elegance",
  Condolencias: "Condolences",
  "Arreglos intensos para declarar lo que las palabras no alcanzan.":
    "Intense arrangements to say what words cannot reach.",
  "Color, luz y celebración en cada tallo seleccionado.":
    "Colour, light and celebration in every selected stem.",
  "Composiciones minimalistas de alta gama para espacios únicos.":
    "High-end minimalist compositions for singular spaces.",
  "Homenajes serenos y respetuosos, entregados con delicadeza.":
    "Serene, respectful tributes delivered with care.",
  "Rouge Éternel · 24 Rosas": "Rouge Éternel · 24 Roses",
  "Veinticuatro rosas rojas premium de tallo largo envueltas en papel seda blush y cinta de satín. Una declaración clásica, ejecutada con precisión editorial.":
    "Twenty-four long-stem premium red roses wrapped in blush tissue and satin ribbon. A classic statement, executed with editorial precision.",
  "Caja sombrerera blanca con rosas rosadas y marfil dispuestas en cúpula. Perfecta para sorprender con sobriedad.":
    "White hat box with pink and ivory roses arranged in a dome. Perfect for an understated surprise.",
  "Orquídea phalaenopsis blanca en maceta cerámica negra mate. Escultura viva de líneas puras.":
    "White phalaenopsis orchid in a matte black ceramic pot. A living sculpture of pure lines.",
  "Ramo pastel acompañado de bombonería fina y espumoso. El set completo para un cumpleaños memorable.":
    "Pastel bouquet with fine chocolates and sparkling wine. The complete set for a memorable birthday.",
  "Corona fúnebre en lirios y crisantemos blancos sobre trípode. Entrega discreta y puntual en salas de velación.":
    "Funeral wreath of white lilies and chrysanthemums on a tripod. Discreet, punctual delivery to funeral homes.",
  "Nuestro ramo insignia: rosas rojas y rosadas en gran formato con envoltura editorial firmada por el atelier.":
    "Our signature bouquet: large-format red and pink roses in editorial wrapping signed by the atelier.",
  "Composición de lirios, orquídeas y astilbe en caja marfil con acabado dorado.":
    "A composition of lilies, orchids and astilbe in an ivory box with gold finish.",
  "Rosas jardín rosadas con velas y detalles dorados para una noche íntima.":
    "Pink garden roses with candles and golden details for an intimate evening.",
};

const WORDS: [RegExp, string][] = [
  [/\brosas?\b/gi, "roses"],
  [/\bflores\b/gi, "flowers"],
  [/\bramo\b/gi, "bouquet"],
  [/\bcaja\b/gi, "box"],
  [/\bblanco\b/gi, "white"],
  [/\bdorado\b/gi, "gold"],
  [/\bpremium\b/gi, "premium"],
  [/\bentrega\b/gi, "delivery"],
  [/\barreglo\b/gi, "arrangement"],
  [/\bcumpleaños\b/gi, "birthday"],
];

const cache = new Map<string, string>();

function translateOne(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const cached = cache.get(trimmed);
  if (cached) return cached;
  let out = PHRASES[trimmed];
  if (!out) {
    out = trimmed;
    for (const [re, rep] of WORDS) out = out.replace(re, rep);
  }
  cache.set(trimmed, out);
  return out;
}

export async function translateTexts({
  data,
}: {
  data: { texts: string[]; target?: "en" };
}): Promise<{ map: Record<string, string> }> {
  const map: Record<string, string> = {};
  for (const text of data.texts) {
    const key = text?.trim();
    if (!key) continue;
    map[key] = translateOne(key);
  }
  return { map };
}
