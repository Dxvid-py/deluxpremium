import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_cop: number;
  compare_price_cop: number | null;
  images: string[];
  category_id: string | null;
  is_featured: boolean;
  is_active: boolean;
  stock: number;
  tags: string[];
  sort_order: number;
};

export type OrderItem = {
  product_id: string;
  name: string;
  slug: string;
  image: string;
  qty: number;
  price_cop: number;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  recipient_name: string | null;
  address: string;
  city: string;
  delivery_date: string | null;
  delivery_slot: string | null;
  dedication: string | null;
  notes: string | null;
  items: OrderItem[];
  subtotal_cop: number;
  shipping_cop: number;
  total_cop: number;
  status: string;
  created_at: string;
};

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

export type CustomerAddress = {
  id: string;
  user_id: string;
  label: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string;
  city: string;
  notes: string | null;
  is_default: boolean;
};

export type GalleryPhoto = {
  id: string;
  image_url: string;
  caption: string | null;
  customer_name: string | null;
  sort_order: number;
  is_active: boolean;
};

export type InstagramPost = {
  id: string;
  post_url: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  is_active: boolean;
};

export const galleryQuery = {
  queryKey: ["gallery_photos"],
  queryFn: async (): Promise<GalleryPhoto[]> => {
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as GalleryPhoto[];
  },
};

export const instagramQuery = {
  queryKey: ["instagram_posts"],
  queryFn: async (): Promise<InstagramPost[]> => {
    const { data, error } = await supabase
      .from("instagram_posts")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as InstagramPost[];
  },
};

/**
 * Guarda una imagen elegida desde el dispositivo dentro de la base local.
 * La convierte a una URL de datos comprimida para que quepa en el navegador.
 */
export async function uploadMedia(file: File, _folder = "productos"): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });

  // Redimensiona a 1400px de ancho máximo para no llenar el almacenamiento.
  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const categoriesQuery = {
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Category[];
  },
};

export const productsQuery = {
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Product[];
  },
};

export const settingsQuery = {
  queryKey: ["site_settings"],
  queryFn: async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase.from("site_settings").select("key,value");
    if (error) throw error;
    const rows = (data ?? []) as unknown as { key: string; value: string }[];
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return map;
  },
};

export const ordersQuery = {
  queryKey: ["orders"],
  queryFn: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Order[];
  },
};
