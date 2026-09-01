import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriesQuery,
  galleryQuery,
  instagramQuery,
  ordersQuery,
  productsQuery,
  settingsQuery,
  type Category,
  type GalleryPhoto,
  type InstagramPost,
  type Product,
} from "@/lib/queries";
import ImageField from "@/components/ImageField";
import { formatMoney, slugify } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel de administración · Floristería Deluxe Premium" },
      { name: "description", content: "Gestión de productos, pedidos, TRM y configuración." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Panel · Deluxe Premium" },
      { property: "og:description", content: "Acceso restringido al equipo del atelier." },
    ],
  }),
  component: Admin,
});

type Tab = "pedidos" | "productos" | "categorias" | "galeria" | "instagram" | "config";

function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("pedidos");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <AuthCard />;

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl">Sin permisos de administrador</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Tu cuenta ({session.user.email}) no tiene el rol de administrador. Pide que se asigne el
          rol a este usuario para acceder al panel.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-8 border border-border px-7 py-3.5 text-[11px] tracking-[0.26em] uppercase"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "pedidos", label: "Pedidos" },
    { key: "productos", label: "Productos" },
    { key: "categorias", label: "Categorías" },
    { key: "galeria", label: "Galería" },
    { key: "instagram", label: "Instagram" },
    { key: "config", label: "TRM y ajustes" },
  ];

  return (
    <div className="pt-28 pb-24 md:pt-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Panel</p>
            <h1 className="mt-3 font-display text-4xl">Administración</h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-2 border border-border px-6 py-3 text-[10px] tracking-[0.24em] uppercase hover:border-primary"
          >
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`border px-5 py-2.5 text-[10px] tracking-[0.24em] uppercase ${
                tab === t.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/60"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {tab === "pedidos" && <OrdersPanel />}
          {tab === "productos" && <ProductsPanel />}
          {tab === "categorias" && <CategoriesPanel />}
          {tab === "galeria" && <GalleryPanel />}
          {tab === "instagram" && <InstagramPanel />}
          {tab === "config" && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}

const field =
  "w-full border border-input bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-primary";

function AuthCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(mode === "login" ? "Sesión iniciada" : "Cuenta creada");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={submit} className="surface-glass w-full max-w-sm rounded-sm p-8">
        <p className="eyebrow">Acceso restringido</p>
        <h1 className="mt-3 font-display text-3xl">Panel Deluxe</h1>
        <div className="mt-8 space-y-4">
          <input
            className={field}
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={field}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full bg-primary py-4 text-[11px] tracking-[0.28em] text-primary-foreground uppercase disabled:opacity-50"
        >
          {busy ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-primary"
        >
          {mode === "login" ? "Crear una cuenta" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}

const STATUSES = ["nuevo", "confirmado", "en preparación", "en ruta", "entregado", "cancelado"];

function OrdersPanel() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery(ordersQuery);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error("No se pudo actualizar"); return; }
    toast.success("Estado actualizado");
    qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando pedidos…</p>;
  if (!orders || orders.length === 0)
    return <p className="text-sm text-muted-foreground">Aún no hay pedidos registrados.</p>;

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <article key={o.id} className="border border-border p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-xl text-primary">{o.order_number}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {o.customer_name} · {o.customer_phone}
              </p>
              <p className="text-sm text-muted-foreground">
                {o.address}, {o.city}
                {o.delivery_date ? ` · ${o.delivery_date} ${o.delivery_slot ?? ""}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl">{formatMoney(Number(o.total_cop), "COP", 1)}</p>
              <select
                value={o.status}
                onChange={(e) => updateStatus(o.id, e.target.value)}
                className="mt-2 border border-input bg-card px-3 py-2 text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
            {(o.items ?? []).map((it) => (
              <li key={it.product_id}>
                {it.qty} × {it.name}
              </li>
            ))}
          </ul>
          {o.dedication && (
            <p className="mt-3 text-sm italic text-muted-foreground">“{o.dedication}”</p>
          )}
        </article>
      ))}
    </div>
  );
}

function ProductsPanel() {
  const qc = useQueryClient();
  const { data: products } = useQuery(productsQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    price_cop: "",
    category_id: "",
    image: "/img/prod-01.jpg",
    description: "",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: productsQuery.queryKey });

  const create = async () => {
    if (!draft.name || !draft.price_cop) { toast.error("Nombre y precio son obligatorios"); return; }
    const { error } = await supabase.from("products").insert({
      name: draft.name,
      slug: slugify(draft.name),
      description: draft.description,
      price_cop: Number(draft.price_cop),
      images: [draft.image],
      category_id: draft.category_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Producto creado");
    setDraft({ name: "", price_cop: "", category_id: "", image: "/img/prod-01.jpg", description: "" });
    refresh();
  };

  const patch = async (id: string, values: Partial<Product>) => {
    const { error } = await supabase.from("products").update(values).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const destroy = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Producto eliminado");
    refresh();
  };

  return (
    <div>
      <div className="border border-border p-6">
        <p className="eyebrow">Nuevo producto</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            className={field}
            placeholder="Nombre"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            className={field}
            placeholder="Precio en COP"
            type="number"
            value={draft.price_cop}
            onChange={(e) => setDraft({ ...draft, price_cop: e.target.value })}
          />
          <select
            className={`${field} bg-card`}
            value={draft.category_id}
            onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
          >
            <option value="">Sin colección</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="md:col-span-2">
            <ImageField
              value={draft.image}
              onChange={(url) => setDraft({ ...draft, image: url })}
              folder="productos"
            />
          </div>
          <textarea
            className={`${field} md:col-span-2`}
            placeholder="Descripción"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <button
          onClick={create}
          className="mt-5 inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
        >
          <Plus className="h-3.5 w-3.5" /> Crear
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {(products ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-4 border border-border p-4"
          >
            <img
              src={p.images?.[0] ?? "/img/prod-01.jpg"}
              alt={p.name}
              loading="lazy"
              className="h-16 w-14 rounded-sm object-cover"
            />
            <div className="min-w-40 flex-1">
              <p className="font-display text-lg">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.slug}</p>
            </div>
            <input
              className="w-32 border border-input bg-transparent px-3 py-2 text-sm"
              type="number"
              defaultValue={Number(p.price_cop)}
              onBlur={(e) => patch(p.id, { price_cop: Number(e.target.value) })}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={p.is_featured}
                onChange={(e) => patch(p.id, { is_featured: e.target.checked })}
              />
              Destacado
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={p.is_active}
                onChange={(e) => patch(p.id, { is_active: e.target.checked })}
              />
              Activo
            </label>
            <button
              onClick={() => setEditing(p)}
              aria-label="Editar producto"
              className="text-muted-foreground hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => destroy(p.id)}
              aria-label="Eliminar producto"
              className="text-muted-foreground hover:text-accent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {editing ? (
        <ProductEditor
          product={editing}
          categories={categories ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description ?? "",
    price_cop: String(product.price_cop ?? ""),
    compare_price_cop: product.compare_price_cop ? String(product.compare_price_cop) : "",
    category_id: product.category_id ?? "",
    stock: String(product.stock ?? 0),
    images: product.images?.length ? product.images : [""],
    is_featured: product.is_featured,
    is_active: product.is_active,
  });
  const [busy, setBusy] = useState(false);

  const setImage = (i: number, url: string) => {
    const next = [...form.images];
    next[i] = url;
    setForm({ ...form, images: next });
  };

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: form.name,
        slug: slugify(form.name),
        description: form.description,
        price_cop: Number(form.price_cop || 0),
        compare_price_cop: form.compare_price_cop ? Number(form.compare_price_cop) : null,
        category_id: form.category_id || null,
        stock: Number(form.stock || 0),
        images: form.images.filter(Boolean),
        is_featured: form.is_featured,
        is_active: form.is_active,
      })
      .eq("id", product.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Producto actualizado");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-90 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="surface-glass my-10 w-full max-w-2xl rounded-sm p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Editar</p>
            <h2 className="mt-2 font-display text-2xl">{product.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="press text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            className={field}
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className={`${field} bg-card`}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            <option value="">Sin colección</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className={field}
            type="number"
            placeholder="Precio COP"
            value={form.price_cop}
            onChange={(e) => setForm({ ...form, price_cop: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder="Precio antes (opcional)"
            value={form.compare_price_cop}
            onChange={(e) => setForm({ ...form, compare_price_cop: e.target.value })}
          />
          <input
            className={field}
            type="number"
            placeholder="Stock"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <textarea
            className={`${field} md:col-span-2`}
            rows={4}
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="space-y-3 md:col-span-2">
            {form.images.map((img, i) => (
              <ImageField
                key={i}
                value={img}
                folder="productos"
                label={`Imagen ${i + 1}`}
                onChange={(url) => setImage(i, url)}
              />
            ))}
            <button
              type="button"
              onClick={() => setForm({ ...form, images: [...form.images, ""] })}
              className="press inline-flex items-center gap-2 border border-border px-4 py-2.5 text-[10px] tracking-[0.22em] uppercase hover:border-primary"
            >
              <Plus className="h-3 w-3" /> Añadir imagen
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
            />
            Destacado
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Activo
          </label>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="press bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            onClick={onClose}
            className="press border border-border px-7 py-3.5 text-[11px] tracking-[0.24em] uppercase"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function GalleryPanel() {
  const qc = useQueryClient();
  const { data: photos } = useQuery(galleryQuery);
  const [draft, setDraft] = useState({ image_url: "", caption: "", customer_name: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: galleryQuery.queryKey });

  const create = async () => {
    if (!draft.image_url) {
      toast.error("Sube o indica una imagen");
      return;
    }
    const { error } = await supabase.from("gallery_photos").insert(draft);
    if (error) { toast.error(error.message); return; }
    toast.success("Foto publicada");
    setDraft({ image_url: "", caption: "", customer_name: "" });
    refresh();
  };

  const patch = async (id: string, values: Partial<GalleryPhoto>) => {
    const { error } = await supabase.from("gallery_photos").update(values).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const destroy = async (id: string) => {
    const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div>
      <div className="space-y-4 border border-border p-6">
        <p className="eyebrow">Nueva foto de cliente</p>
        <ImageField
          value={draft.image_url}
          folder="galeria"
          onChange={(url) => setDraft({ ...draft, image_url: url })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className={field}
            placeholder="Nombre del cliente"
            value={draft.customer_name}
            onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })}
          />
          <input
            className={field}
            placeholder="Mensaje o descripción"
            value={draft.caption}
            onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
          />
        </div>
        <button
          onClick={create}
          className="press inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
        >
          <Plus className="h-3.5 w-3.5" /> Publicar
        </button>
        <p className="text-xs text-muted-foreground">
          La sección se muestra en el sitio solo si activas “Galería visible” en TRM y ajustes.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {(photos ?? []).map((g) => (
          <div key={g.id} className="flex items-center gap-4 border border-border p-4">
            <img src={g.image_url} alt="" loading="lazy" className="h-16 w-14 rounded-sm object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{g.customer_name || "Cliente"}</p>
              <p className="truncate text-xs text-muted-foreground">{g.caption}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={g.is_active}
                onChange={(e) => patch(g.id, { is_active: e.target.checked })}
              />
              Visible
            </label>
            <button onClick={() => destroy(g.id)} aria-label="Eliminar" className="text-muted-foreground hover:text-accent">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InstagramPanel() {
  const qc = useQueryClient();
  const { data: posts } = useQuery(instagramQuery);
  const [draft, setDraft] = useState({ post_url: "", image_url: "", caption: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: instagramQuery.queryKey });

  const create = async () => {
    if (!draft.post_url) {
      toast.error("Indica el enlace del reel o publicación");
      return;
    }
    const { error } = await supabase.from("instagram_posts").insert(draft);
    if (error) { toast.error(error.message); return; }
    toast.success("Publicación añadida");
    setDraft({ post_url: "", image_url: "", caption: "" });
    refresh();
  };

  const patch = async (id: string, values: Partial<InstagramPost>) => {
    const { error } = await supabase.from("instagram_posts").update(values).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const destroy = async (id: string) => {
    const { error } = await supabase.from("instagram_posts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div>
      <div className="space-y-4 border border-border p-6">
        <p className="eyebrow">Nuevo reel o publicación</p>
        <input
          className={field}
          placeholder="https://www.instagram.com/reel/…"
          value={draft.post_url}
          onChange={(e) => setDraft({ ...draft, post_url: e.target.value })}
        />
        <ImageField
          value={draft.image_url}
          folder="instagram"
          label="Portada"
          onChange={(url) => setDraft({ ...draft, image_url: url })}
        />
        <input
          className={field}
          placeholder="Texto breve"
          value={draft.caption}
          onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
        />
        <button
          onClick={create}
          className="press inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
        >
          <Plus className="h-3.5 w-3.5" /> Añadir
        </button>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {(posts ?? []).map((ig) => (
          <div key={ig.id} className="flex items-center gap-4 border border-border p-4">
            {ig.image_url ? (
              <img src={ig.image_url} alt="" loading="lazy" className="h-16 w-14 rounded-sm object-cover" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">{ig.post_url}</p>
              <p className="truncate text-sm">{ig.caption}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={ig.is_active}
                onChange={(e) => patch(ig.id, { is_active: e.target.checked })}
              />
              Visible
            </label>
            <button onClick={() => destroy(ig.id)} aria-label="Eliminar" className="text-muted-foreground hover:text-accent">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriesPanel() {
  const qc = useQueryClient();
  const { data: categories } = useQuery(categoriesQuery);
  const [name, setName] = useState("");
  const [image, setImage] = useState("/img/cat-amor.jpg");

  const refresh = () => qc.invalidateQueries({ queryKey: categoriesQuery.queryKey });

  const create = async () => {
    if (!name) return;
    const { error } = await supabase
      .from("categories")
      .insert({ name, slug: slugify(name), image_url: image });
    if (error) { toast.error(error.message); return; }
    toast.success("Colección creada");
    setName("");
    refresh();
  };

  const patch = async (id: string, values: Partial<Category>) => {
    const { error } = await supabase.from("categories").update(values).eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  const destroy = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 border border-border p-6">
        <input
          className={`${field} max-w-xs`}
          placeholder="Nombre de la colección"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="w-full max-w-md">
          <ImageField value={image} folder="colecciones" onChange={setImage} />
        </div>
        <button
          onClick={create}
          className="bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
        >
          Crear
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {(categories ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-4 border border-border p-4">
            <img
              src={c.image_url}
              alt={c.name}
              loading="lazy"
              className="h-16 w-14 rounded-sm object-cover"
            />
            <input
              className="min-w-40 flex-1 border border-input bg-transparent px-3 py-2 text-sm"
              defaultValue={c.name}
              onBlur={(e) => patch(c.id, { name: e.target.value })}
            />
            <input
              className="w-20 border border-input bg-transparent px-3 py-2 text-sm"
              type="number"
              defaultValue={c.sort_order}
              onBlur={(e) => patch(c.id, { sort_order: Number(e.target.value) })}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={c.is_active}
                onChange={(e) => patch(c.id, { is_active: e.target.checked })}
              />
              Activa
            </label>
            <button
              onClick={() => destroy(c.id)}
              aria-label="Eliminar colección"
              className="text-muted-foreground hover:text-accent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const SETTING_LABELS: Record<string, string> = {
  trm_cop_usd: "TRM (COP por 1 USD)",
  whatsapp_number: "WhatsApp (con indicativo, sin +)",
  brand_name: "Nombre de marca",
  email: "Correo de contacto",
  address: "Dirección",
  shipping_cop: "Costo de envío (COP)",
  free_shipping_from_cop: "Envío gratis desde (COP)",
  instagram: "Instagram (URL)",
  instagram_handle: "Instagram (usuario)",
  maps_url: "Google Maps (URL)",
  city: "Ciudad",
  hours_weekdays: "Horario lunes a sábado",
  hours_sunday: "Horario domingo",
  hours_whatsapp: "Pedidos por WhatsApp",
};

const TOGGLE_LABELS: Record<string, string> = {
  gallery_enabled: "Galería de clientes visible",
  instagram_enabled: "Sección de Instagram visible",
  intro_audio_enabled: "Audio en la intro",
};

function SettingsPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const value = (key: string) => draft[key] ?? settings?.[key] ?? "";

  const save = async () => {
    const rows = Object.entries(draft).map(([key, v]) => ({ key, value: v }));
    if (rows.length === 0) { toast.info("No hay cambios"); return; }
    const { error } = await supabase.from("site_settings").upsert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success("Configuración guardada");
    setDraft({});
    qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
  };

  return (
    <div className="max-w-xl border border-border p-6">
      <p className="eyebrow">Ajustes del sitio</p>
      <div className="mt-6 space-y-4">
        {Object.keys(SETTING_LABELS).map((key) => (
          <label key={key} className="block">
            <span className="text-xs text-muted-foreground">{SETTING_LABELS[key]}</span>
            <input
              className={`${field} mt-1.5`}
              value={value(key)}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <div className="mt-8 space-y-3 border-t border-border pt-6">
        <p className="eyebrow">Secciones</p>
        {Object.keys(TOGGLE_LABELS).map((key) => (
          <label key={key} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={value(key) === "true"}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.checked ? "true" : "false" })}
            />
            {TOGGLE_LABELS[key]}
          </label>
        ))}
      </div>

      <button
        onClick={save}
        className="mt-6 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
      >
        Guardar
      </button>
    </div>
  );
}
