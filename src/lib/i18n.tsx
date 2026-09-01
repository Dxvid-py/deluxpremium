import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { translateTexts } from "@/lib/translate.functions";

export type Lang = "es" | "en";

const KEY = "fdp-lang-v1";

type Dict = Record<string, { es: string; en: string }>;

/** Diccionario completo de la interfaz. El contenido del catálogo se traduce con IA. */
const DICT: Dict = {
  "nav.home": { es: "Inicio", en: "Home" },
  "nav.catalog": { es: "Catálogo", en: "Catalog" },
  "nav.atelier": { es: "Atelier", en: "Atelier" },
  "nav.contact": { es: "Contacto", en: "Contact" },
  "nav.panel": { es: "Panel", en: "Admin" },
  "nav.account": { es: "Mi cuenta", en: "My account" },

  "cta.cart": { es: "Abrir carrito", en: "Open cart" },
  "cta.menu": { es: "Menú", en: "Menu" },
  "cta.close": { es: "Cerrar", en: "Close" },
  "cta.shopNow": { es: "Comprar ahora", en: "Shop now" },
  "cta.viewCatalog": { es: "Ver todo el catálogo", en: "View full catalog" },
  "cta.viewCollection": { es: "Ver colección", en: "View collection" },
  "cta.ourStory": { es: "Nuestra historia", en: "Our story" },
  "cta.whatsapp": { es: "Pedir por WhatsApp", en: "Order via WhatsApp" },
  "cta.skipIntro": { es: "Saltar intro", en: "Skip intro" },
  "cta.save": { es: "Guardar", en: "Save" },
  "cta.cancel": { es: "Cancelar", en: "Cancel" },
  "cta.edit": { es: "Editar", en: "Edit" },
  "cta.delete": { es: "Eliminar", en: "Delete" },
  "cta.add": { es: "Añadir", en: "Add" },
  "cta.upload": { es: "Subir desde galería", en: "Upload from gallery" },
  "cta.sound": { es: "Sonido", en: "Sound" },
  "cta.back": { es: "Volver", en: "Back" },

  "intro.location": { es: "Barranquilla · Atelier Floral", en: "Barranquilla · Floral Atelier" },
  "intro.tagline": {
    es: "El arte de regalar flores, elevado a experiencia.",
    en: "The art of giving flowers, elevated to an experience.",
  },

  "home.benefits.eyebrow": { es: "Por qué Deluxe", en: "Why Deluxe" },
  "home.b1.title": { es: "Flor grado premium", en: "Premium grade flowers" },
  "home.b1.copy": {
    es: "Selección diaria de flor importada y nacional de primera calidad.",
    en: "Daily selection of top-grade imported and local blooms.",
  },
  "home.b2.title": { es: "Entrega el mismo día", en: "Same-day delivery" },
  "home.b2.copy": {
    es: "Pedidos antes de 2:00 p.m. llegan hoy en Barranquilla.",
    en: "Orders before 2:00 p.m. arrive today in Barranquilla.",
  },
  "home.b3.title": { es: "Diseño de autor", en: "Signature design" },
  "home.b3.copy": {
    es: "Cada pieza se compone a mano en nuestro atelier.",
    en: "Every piece is composed by hand in our atelier.",
  },
  "home.b4.title": { es: "Envío cuidado", en: "Careful shipping" },
  "home.b4.copy": {
    es: "Transporte refrigerado y empaque firmado Deluxe.",
    en: "Refrigerated transport and signed Deluxe packaging.",
  },

  "home.collections.eyebrow": { es: "Colecciones", en: "Collections" },
  "home.collections.title1": { es: "Tres maneras de", en: "Three ways to" },
  "home.collections.title2": { es: "decir algo", en: "say something" },
  "home.featured.eyebrow": { es: "Selección del atelier", en: "Atelier selection" },
  "home.featured.title1": { es: "Productos", en: "Featured" },
  "home.featured.title2": { es: "destacados", en: "creations" },
  "home.editorial.eyebrow": { es: "El atelier", en: "The atelier" },
  "home.editorial.title1": { es: "Flores tratadas como", en: "Flowers treated like" },
  "home.editorial.title2": { es: "alta costura", en: "haute couture" },
  "home.editorial.p1": {
    es: "Trabajamos con cortes frescos del día, hidratación controlada y una paleta cuidadosamente limitada. Nada es automático: la proporción, el peso del papel y el nudo de la cinta se deciden pieza por pieza.",
    en: "We work with cuts fresh from the day, controlled hydration and a carefully limited palette. Nothing is automatic: proportion, paper weight and ribbon knot are decided piece by piece.",
  },
  "home.editorial.p2": {
    es: "El resultado es un objeto de regalo que se ve —y se recuerda— como una pieza de diseño.",
    en: "The result is a gift object that looks — and is remembered — like a design piece.",
  },

  "home.gallery.eyebrow": { es: "Próximamente", en: "Coming soon" },
  "home.gallery.title1": { es: "Clientes", en: "Happy" },
  "home.gallery.title2": { es: "felices", en: "clients" },
  "home.gallery.copy": {
    es: "Momentos reales entregados por el atelier, publicados por nuestro equipo.",
    en: "Real moments delivered by the atelier, published by our team.",
  },
  "home.instagram.eyebrow": { es: "Instagram", en: "Instagram" },
  "home.instagram.title1": { es: "Nuestro", en: "Our" },
  "home.instagram.title2": { es: "feed", en: "feed" },
  "home.instagram.copy": {
    es: "Toca cualquier pieza para verla en Instagram.",
    en: "Tap any piece to open it on Instagram.",
  },

  "catalog.eyebrow": { es: "Catálogo completo", en: "Full catalog" },
  "catalog.title1": { es: "Todas las", en: "All our" },
  "catalog.title2": { es: "creaciones", en: "creations" },
  "catalog.all": { es: "Todas", en: "All" },
  "catalog.search": { es: "Buscar", en: "Search" },
  "catalog.sort.featured": { es: "Destacados", en: "Featured" },
  "catalog.sort.priceAsc": { es: "Precio: menor a mayor", en: "Price: low to high" },
  "catalog.sort.priceDesc": { es: "Precio: mayor a menor", en: "Price: high to low" },
  "catalog.empty": {
    es: "No encontramos piezas con esos filtros.",
    en: "No pieces match those filters.",
  },
  "collection.empty": {
    es: "Estamos preparando nuevas piezas para esta colección.",
    en: "We are preparing new pieces for this collection.",
  },

  "product.addToCart": { es: "Añadir al carrito", en: "Add to cart" },
  "product.sale": { es: "Oferta", en: "Sale" },
  "product.stock": { es: "Disponibles", en: "In stock" },
  "product.related": { es: "También te puede gustar", en: "You may also like" },
  "product.notFound": { es: "Pieza no encontrada", en: "Piece not found" },

  "cart.title": { es: "Tu carrito", en: "Your cart" },
  "cart.empty": { es: "Tu carrito está vacío.", en: "Your cart is empty." },
  "cart.subtotal": { es: "Subtotal", en: "Subtotal" },
  "cart.shipping": { es: "Envío", en: "Shipping" },
  "cart.total": { es: "Total", en: "Total" },
  "cart.checkout": { es: "Finalizar pedido", en: "Checkout" },
  "cart.freeShipping": { es: "Envío de cortesía", en: "Complimentary shipping" },

  "checkout.title1": { es: "Datos de", en: "Delivery" },
  "checkout.title2": { es: "entrega", en: "details" },
  "checkout.customer": { es: "Quien ordena", en: "Who orders" },
  "checkout.recipient": { es: "Quien recibe", en: "Who receives" },
  "checkout.name": { es: "Nombre completo", en: "Full name" },
  "checkout.phone": { es: "Teléfono", en: "Phone" },
  "checkout.email": { es: "Correo", en: "Email" },
  "checkout.address": { es: "Dirección", en: "Address" },
  "checkout.city": { es: "Ciudad", en: "City" },
  "checkout.date": { es: "Fecha de entrega", en: "Delivery date" },
  "checkout.slot": { es: "Franja horaria", en: "Time slot" },
  "checkout.dedication": { es: "Dedicatoria", en: "Card message" },
  "checkout.notes": { es: "Notas", en: "Notes" },
  "checkout.summary": { es: "Resumen", en: "Summary" },
  "checkout.send": { es: "Enviar pedido por WhatsApp", en: "Send order via WhatsApp" },
  "checkout.savedAddresses": { es: "Direcciones guardadas", en: "Saved addresses" },
  "checkout.useAddress": { es: "Usar esta dirección", en: "Use this address" },

  "auth.signIn": { es: "Iniciar sesión", en: "Sign in" },
  "auth.signUp": { es: "Crear cuenta", en: "Create account" },
  "auth.signOut": { es: "Cerrar sesión", en: "Sign out" },
  "auth.password": { es: "Contraseña", en: "Password" },
  "auth.email": { es: "Correo", en: "Email" },
  "auth.haveAccount": { es: "¿Ya tienes cuenta?", en: "Already have an account?" },
  "auth.noAccount": { es: "¿Aún no tienes cuenta?", en: "Don't have an account yet?" },

  "account.title1": { es: "Mi", en: "My" },
  "account.title2": { es: "cuenta", en: "account" },
  "account.profile": { es: "Datos personales", en: "Personal details" },
  "account.addresses": { es: "Mis direcciones", en: "My addresses" },
  "account.orders": { es: "Historial de compras", en: "Order history" },
  "account.noOrders": { es: "Aún no tienes pedidos.", en: "You have no orders yet." },
  "account.default": { es: "Predeterminada", en: "Default" },
  "account.setDefault": { es: "Usar por defecto", en: "Set as default" },
  "account.label": { es: "Etiqueta (Casa, Oficina…)", en: "Label (Home, Office…)" },
  "account.saved": { es: "Guardado", en: "Saved" },

  "footer.about": {
    es: "Atelier floral de alta gama en Barranquilla. Diseñamos composiciones a mano con flor importada y nacional de grado premium, y las entregamos el mismo día.",
    en: "High-end floral atelier in Barranquilla. We hand-craft compositions with premium imported and local flowers, delivered the same day.",
  },
  "footer.collections": { es: "Colecciones", en: "Collections" },
  "footer.contact": { es: "Contacto", en: "Contact" },
  "footer.hours": { es: "Horario", en: "Opening hours" },
  "footer.rights": { es: "Todos los derechos reservados.", en: "All rights reserved." },

  "contact.hours.weekdays": { es: "Lunes a sábado", en: "Monday to Saturday" },
  "contact.hours.sunday": { es: "Domingo", en: "Sunday" },
  "contact.hours.whatsapp": { es: "Pedidos por WhatsApp", en: "WhatsApp orders" },
  "contact.maps": { es: "Ver en Google Maps", en: "View on Google Maps" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "en" || saved === "es") setLangState(saved);
    } catch {
      /* ignorar */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignorar */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key: string) => DICT[key]?.[lang] ?? key,
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) return { lang: "es", setLang: () => {}, t: (k) => DICT[k]?.es ?? k };
  return ctx;
}

/**
 * Traduce con IA el contenido dinámico (nombres, descripciones, dedicatorias)
 * que vive en la base de datos. En español devuelve el texto original.
 */
export function useContentTranslator(texts: (string | null | undefined)[]) {
  const { lang } = useI18n();
  const clean = useMemo(
    () =>
      Array.from(
        new Set(
          texts
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
            .map((t) => t.trim()),
        ),
      ).sort(),
    [texts],
  );

  const { data } = useQuery({
    queryKey: ["translate", lang, clean],
    enabled: lang === "en" && clean.length > 0,
    staleTime: 1000 * 60 * 60,
    queryFn: () => translateTexts({ data: { texts: clean, target: "en" } }),
  });

  return useCallback(
    (value: string | null | undefined) => {
      if (!value) return "";
      if (lang === "es") return value;
      return data?.map?.[value.trim()] ?? value;
    },
    [lang, data],
  );
}
