/**
 * Base de datos LOCAL del atelier.
 *
 * Todo el contenido (colecciones, productos, pedidos, galería, Instagram,
 * ajustes, cuentas de cliente y direcciones) vive en el navegador mediante
 * localStorage. La forma de los datos es idéntica a la del esquema SQL, así
 * que migrar a un backend real más adelante sólo requiere cambiar el cliente.
 */

export type Row = Record<string, unknown>;

export type TableName =
  | "categories"
  | "products"
  | "orders"
  | "site_settings"
  | "gallery_photos"
  | "instagram_posts"
  | "profiles"
  | "customer_addresses"
  | "user_roles"
  | "auth_users";

// v4: rebrand a Floristería Deluxury (nuevo logo, fotos y categorías) —
// se sube la versión para forzar un reseed en navegadores que ya tenían
// datos de la v3 guardados en localStorage.
const DB_KEY = "fdp-local-db-v4";
const SESSION_KEY = "fdp-local-session-v1";

export const ADMIN_EMAIL = "floristeriadeluxury@gmail.com";
export const ADMIN_PASSWORD = "deluxury2026";

export function uid(): string {
  const g = globalThis.crypto;
  if (g && "randomUUID" in g) return g.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const CAT = {
  amor: "c1000000-0000-4000-8000-000000000001",
  cumpleanos: "c1000000-0000-4000-8000-000000000002",
  elegancia: "c1000000-0000-4000-8000-000000000003",
  condolencias: "c1000000-0000-4000-8000-000000000004",
};

function seed(): Record<TableName, Row[]> {
  const now = new Date().toISOString();
  return {
    categories: [
      {
        id: CAT.amor,
        name: "Amor & Romance",
        name_en: "Love & Romance",
        slug: "amor",
        description: "Arreglos intensos para declarar lo que las palabras no alcanzan.",
        description_en: "Intense arrangements to say what words cannot reach.",
        image_url: "/img/cat-amor.jpg",
        sort_order: 1,
        is_active: true,
        created_at: now,
      },
      {
        id: CAT.elegancia,
        name: "Bodas & Eventos",
        name_en: "Weddings & Events",
        slug: "bodas",
        description: "Escenografía floral de alta gama para el día que no se repite.",
        description_en: "High-end floral scenography for the day that never repeats.",
        image_url: "/img/cat-elegancia.jpg",
        sort_order: 2,
        is_active: true,
        created_at: now,
      },
      {
        id: CAT.condolencias,
        name: "Condolencias",
        name_en: "Condolences",
        slug: "condolencias",
        description: "Homenajes serenos y respetuosos, entregados con delicadeza.",
        description_en: "Serene, respectful tributes, delivered with care.",
        image_url: "/img/cat-condolencias.jpg",
        sort_order: 3,
        is_active: true,
        created_at: now,
      },
    ],

    products: [
      {
        id: "p1000000-0000-4000-8000-000000000001",
        name: "Rouge Éternel · 24 Rosas",
        slug: "rouge-eternel",
        description:
          "Veinticuatro rosas rojas premium de tallo largo envueltas en papel seda blush y cinta de satín. Una declaración clásica, ejecutada con precisión editorial.",
        price_cop: 389000,
        compare_price_cop: 459000,
        images: ["/img/prod-01.jpg", "/img/hero-01.jpg"],
        category_id: CAT.amor,
        is_featured: true,
        is_active: true,
        stock: 12,
        tags: ["rosas", "premium", "rojo"],
        sort_order: 1,
        created_at: now,
      },
      {
        id: "p1000000-0000-4000-8000-000000000002",
        name: "Blush Atelier Box",
        slug: "blush-atelier-box",
        description:
          "Caja sombrerera blanca con rosas rosadas y marfil dispuestas en cúpula. Perfecta para sorprender con sobriedad.",
        price_cop: 329000,
        compare_price_cop: null,
        images: ["/img/prod-02.jpg", "/img/arreglo_amor2.jpeg"],
        category_id: CAT.amor,
        is_featured: true,
        is_active: true,
        stock: 15,
        tags: ["caja", "rosas"],
        sort_order: 2,
        created_at: now,
      },
      {
        id: "p1000000-0000-4000-8000-000000000003",
        name: "Orchidée Noire",
        slug: "orchidee-noire",
        description:
          "Orquídea phalaenopsis blanca en maceta cerámica negra mate. Escultura viva de líneas puras.",
        price_cop: 420000,
        compare_price_cop: null,
        images: ["/img/prod-03.jpg"],
        category_id: CAT.elegancia,
        is_featured: true,
        is_active: true,
        stock: 8,
        tags: ["orquídea", "minimal"],
        sort_order: 3,
        created_at: now,
      },
      {
        id: "p1000000-0000-4000-8000-000000000004",
        name: "Célébration Deluxe",
        slug: "celebration-deluxe",
        description:
          "Ramo pastel acompañado de bombonería fina y espumoso. El set completo para un cumpleaños memorable.",
        price_cop: 465000,
        compare_price_cop: 520000,
        images: ["/img/prod-04.jpg"],
        category_id: CAT.elegancia,
        is_featured: true,
        is_active: true,
        stock: 10,
        tags: ["regalo", "cumpleaños"],
        sort_order: 4,
        created_at: now,
      },
      {
        id: "p1000000-0000-4000-8000-000000000005",
        name: "Corona Serena",
        slug: "corona-serena",
        description:
          "Corona fúnebre en lirios y crisantemos blancos sobre trípode. Entrega discreta y puntual en salas de velación.",
        price_cop: 540000,
        compare_price_cop: null,
        images: ["/img/prod-05.jpg"],
        category_id: CAT.condolencias,
        is_featured: false,
        is_active: true,
        stock: 6,
        tags: ["condolencias"],
        sort_order: 5,
        created_at: now,
      },
      {
        id: "p1000000-0000-4000-8000-000000000006",
        name: "Grand Bouquet Signature",
        slug: "grand-bouquet-signature",
        description:
          "Nuestro ramo insignia: rosas rojas y rosadas en gran formato con envoltura editorial firmada por el atelier.",
        price_cop: 590000,
        compare_price_cop: 690000,
        images: ["/img/prod-06.jpg", "/img/arreglo_amor2.jpeg"],
        category_id: CAT.amor,
        is_featured: true,
        is_active: true,
        stock: 7,
        tags: ["signature", "premium"],
        sort_order: 6,
        created_at: now,
      },
      {
        id: "p1000000-0000-4000-8000-000000000007",
        name: "Lumière Blanche",
        slug: "lumiere-blanche",
        description:
          "Composición de lirios, orquídeas y astilbe en caja marfil con acabado dorado.",
        price_cop: 445000,
        compare_price_cop: null,
        images: ["/img/hero-02.jpg"],
        category_id: CAT.elegancia,
        is_featured: true,
        is_active: true,
        stock: 9,
        tags: ["blanco", "elegancia"],
        sort_order: 7,
        created_at: now,
      },
      {
        id: "p1000000-0000-4000-8000-000000000008",
        name: "Rose Dorée Intimité",
        slug: "rose-doree-intimite",
        description: "Rosas jardín rosadas con velas y detalles dorados para una noche íntima.",
        price_cop: 298000,
        compare_price_cop: null,
        images: ["/img/cat-amor.jpg", "/img/arreglo_amor1.jpeg"],
        category_id: CAT.amor,
        is_featured: false,
        is_active: true,
        stock: 14,
        tags: ["romance", "velas"],
        sort_order: 8,
        created_at: now,
      },
    ],
    orders: [],
    site_settings: [
      { key: "trm_cop_usd", value: "3950" },
      { key: "whatsapp_number", value: "573006301123" },
      { key: "brand_name", value: "Floristería Deluxury" },
      { key: "email", value: ADMIN_EMAIL },
      { key: "address", value: "Carrera 43 #79-226, Local 1, Barranquilla, Colombia" },
      { key: "city", value: "Barranquilla" },
      { key: "shipping_cop", value: "18000" },
      { key: "free_shipping_from_cop", value: "350000" },
      { key: "instagram", value: "https://instagram.com/deluxuryfloristeria" },
      { key: "instagram_handle", value: "@deluxuryfloristeria" },
      { key: "maps_url", value: "https://maps.app.goo.gl/iP9B2jxw3JVnETTe7" },
      { key: "hours_weekdays", value: "Lunes a sábado 8:00 – 20:00" },
      { key: "hours_sunday", value: "Domingo 9:00 – 18:00" },
      { key: "hours_whatsapp", value: "Pedidos por WhatsApp 24/7" },
      { key: "gallery_enabled", value: "true" },
      { key: "instagram_enabled", value: "true" },
    ],
    gallery_photos: [
      {
        id: uid(),
        image_url: "/img/arreglo_amor1.jpeg",
        caption: "Aniversario en el Prado",
        customer_name: "Valentina R.",
        sort_order: 1,
        is_active: true,
      },
      {
        id: uid(),
        image_url: "/img/arreglo_amor1.jpeg",
        caption: "Sorpresa de cumpleaños",
        customer_name: "Andrés M.",
        sort_order: 2,
        is_active: true,
      },
      {
        id: uid(),
        image_url: "/img/arreglo_amor2.jpeg",
        caption: "Pedida de mano",
        customer_name: "Laura & Juan",
        sort_order: 3,
        is_active: true,
      },
      {
        id: uid(),
        image_url: "/img/cat-amor.jpg",
        caption: "Gracias por tanto",
        customer_name: "Familia Peña",
        sort_order: 4,
        is_active: true,
      },
    ],
    instagram_posts: [
      {
        id: uid(),
        post_url: "https://instagram.com/deluxuryfloristeria",
        image_url: "/img/prod-01.jpg",
        caption: "Rouge Éternel",
        sort_order: 1,
        is_active: true,
      },
      {
        id: uid(),
        post_url: "https://instagram.com/deluxuryfloristeria",
        image_url: "/img/prod-04.jpg",
        caption: "Célébration Deluxe",
        sort_order: 2,
        is_active: true,
      },
      {
        id: uid(),
        post_url: "https://instagram.com/deluxuryfloristeria",
        image_url: "/img/prod-03.jpg",
        caption: "Orchidée Noire",
        sort_order: 3,
        is_active: true,
      },
      {
        id: uid(),
        post_url: "https://instagram.com/deluxuryfloristeria",
        image_url: "/img/hero-02.jpg",
        caption: "Lumière Blanche",
        sort_order: 4,
        is_active: true,
      },
    ],
    profiles: [],
    customer_addresses: [],
    user_roles: [{ id: uid(), user_id: "admin-local", role: "admin" }],
    auth_users: [
      {
        id: "admin-local",
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        created_at: new Date().toISOString(),
      },
    ],
  };
}

let memory: Record<TableName, Row[]> | null = null;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function db(): Record<TableName, Row[]> {
  if (memory) return memory;
  const base = seed();
  if (!hasStorage()) {
    memory = base;
    return memory;
  }
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<TableName, Row[]>>;
      memory = { ...base, ...parsed } as Record<TableName, Row[]>;
    } else {
      memory = base;
      localStorage.setItem(DB_KEY, JSON.stringify(memory));
    }
  } catch {
    memory = base;
  }
  return memory;
}

export function persist() {
  if (!hasStorage() || !memory) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(memory));
  } catch {
    /* cuota llena */
  }
}

export function resetDb() {
  memory = seed();
  persist();
}

/* ---------------------------------------------------------------- sesión */

export type LocalUser = { id: string; email: string };
export type LocalSession = { user: LocalUser };

export function readSession(): LocalSession | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LocalSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(session: LocalSession | null) {
  if (!hasStorage()) return;
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorar */
  }
}
