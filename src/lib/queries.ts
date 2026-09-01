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

/** Sube una imagen al almacén del atelier y devuelve una URL utilizable. */
export async function uploadMedia(file: File, folder = "productos"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signError || !data?.signedUrl) throw signError ?? new Error("No se pudo firmar la imagen");
  return data.signedUrl;
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
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key as string] = row.value as string;
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
