import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  LogIn,
  Menu,
  MessageCircle,
  Package,
  Trash2,
  Send,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import type { Session } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, productsQuery, settingsQuery, type Product } from "@/lib/queries";
import { planFlorencioTurn } from "@/lib/florencio-turn";
import OrderCard from "@/components/OrderCard";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator, useI18n } from "@/lib/i18n";
import { playFlorencioAudio } from "@/lib/florencio-voice";
import {
  colorLabel,
  rankFlorencioProducts,
  type FlorencioFilters,
} from "@/lib/florencio-recommendations";
import {
  colorQuestionMessage,
  DEFAULT_WHATSAPP,
  isGreetingOnly,
  isQuoteCategory,
  openWhatsApp,
  quoteMessage,
  upperName,
  welcomeMessage,
} from "@/lib/florencio-support";
import { askFlorencioAI } from "@/lib/florencio-ai";

type Tab = "chat" | "orders" | "account" | "gallery";
type ChatAction = { label: string; whatsappMessage: string };
type ChatMessage = { id: string; role: "user" | "florencio"; text: string; createdAt: string; action?: ChatAction };
type SessionRow = {
  id: string; user_id: string; title: string | null; messages: ChatMessage[];
  filters: FlorencioFilters; recommendation_product_ids: string[]; created_at: string; updated_at: string;
};
type OrderRow = {
  id: string; order_number: string; total_cop: number; status: string; created_at: string;
  delivery_date: string | null; delivery_slot: string | null; address: string; city: string;
  items: Array<{ product_id: string; name: string; image: string; qty: number; price_cop: number }>;
  payment_status: string | null;
  customer_name: string | null; customer_phone: string | null; customer_email: string | null;
  recipient_name: string | null;
};
type MediaItem = { type: "image" | "reel"; url: string; caption?: string; link?: string };

const STARTERS = ["Quiero algo de amor", "Flores para una boda", "Un detalle de condolencias", "Máximo $200.000"];
const ORDER_SELECT = "id,order_number,total_cop,status,payment_status,created_at,delivery_date,delivery_slot,address,city,items,customer_name,customer_phone,customer_email,recipient_name";
const GUEST_CHAT_KEY = "deluxury-florencio-guest-chat-v1";
const RECOMMENDATION_MARKER = "__florencio_recommendation__"; // la función de IA lo añade a keywords; aquí se descarta

function uid() { return crypto.randomUUID(); }

function parseMedia(raw?: string): MediaItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => ({
        type: x.type === "reel" ? "reel" : "image",
        url: typeof x.url === "string" ? x.url : "",
        caption: typeof x.caption === "string" ? x.caption : "",
        link: typeof x.link === "string" ? x.link : "",
      }))
      .filter((x) => x.url);
  } catch { return []; }
}

function isVideo(url: string) { return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url); }

function Avatar({ src, size = "md" }: { src: string; size?: "sm" | "md" | "lg" }) {
  const c = size === "lg" ? "h-24 w-24" : size === "sm" ? "h-9 w-9" : "h-14 w-14";
  return <div className={`${c} shrink-0 overflow-hidden rounded-full border border-primary/20 bg-[#e8d7be] shadow-[0_16px_40px_-26px_rgba(60,36,18,.55)]`}>
    <img src={src} alt="Florencio" className="h-full w-full object-cover object-[50%_18%]" />
  </div>;
}

function AuthPanel({ profileImage }: { profileImage: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/florencio`, data: { full_name: name } },
        });
        if (signUpError) throw signUpError;
        if (data.user) await supabase.from("profiles").upsert({ user_id: data.user.id, full_name: name || null, email }, { onConflict: "user_id" });
      }
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo completar la solicitud."); }
    finally { setBusy(false); }
  };

  const signInWithGoogle = async () => {
    setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/florencio` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión con Google.");
      setBusy(false);
    }
  };

  return <div className="mx-auto max-w-xl rounded-[28px] border border-primary/15 bg-white/90 p-6 shadow-[0_30px_90px_-56px_rgba(68,40,20,.55)] sm:p-9">
    <div className="flex items-center gap-4"><Avatar src={profileImage} size="lg" /><div><p className="font-display text-3xl">{mode === "in" ? "Bienvenido" : "Crea tu cuenta"}</p><p className="mt-1 text-sm text-muted-foreground">Necesitas una cuenta para usar la IA, guardar recomendaciones y consultar tus pedidos.</p></div></div>
    <form onSubmit={submit} className="mt-7 space-y-4">
      {mode === "up" && <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />}
      <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" type="password" placeholder="Contraseña" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">{error}</p>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[10px] tracking-[.18em] text-primary-foreground uppercase disabled:opacity-50">{busy ? "Procesando…" : mode === "in" ? "Entrar" : "Crear cuenta"}<LogIn className="h-4 w-4" /></button>
    </form>
    <button type="button" onClick={() => void signInWithGoogle()} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 py-3.5 text-[10px] tracking-[.18em] uppercase transition-colors hover:border-primary disabled:opacity-50">
      <span className="font-medium">G</span> Continuar con Google
    </button>
    <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary">{mode === "in" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta · Iniciar sesión"}</button>
  </div>;
}

export default function FlorencioCatalogAssistant() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { lang } = useI18n();
  const { add, currency } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const [recommendations, setRecommendations] = useState<ReturnType<typeof rankFlorencioProducts>>([]);
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [account, setAccount] = useState<{ full_name: string | null; phone: string | null; email: string | null } | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isCatalogPage = location.pathname.startsWith("/catalogo");
  const [catalogChatOpen, setCatalogChatOpen] = useState(false);
  useEffect(() => {
    const open = !isCatalogPage || catalogChatOpen;
    window.dispatchEvent(new CustomEvent("florencio:chat-visibility", { detail: { open } }));
    return () => window.dispatchEvent(new CustomEvent("florencio:chat-visibility", { detail: { open: false } }));
  }, [isCatalogPage, catalogChatOpen]);
  const profileImage = settings?.["florencio_profile_image_url"] || settings?.["florencio_intro_image_url"] || "/img/florencio.png";
  const media = useMemo(() => parseMedia(settings?.["florencio_media_json"]), [settings]);
  const galleryMedia = media.length ? media : [{ type: "image" as const, url: profileImage, caption: "Florencio en Deluxury" }];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) { setAccount(null); setOrders([]); return; }
    const userId = session.user.id;
    const load = async () => {
      setHistoryLoading(true);
      const [{ data: profile }, { data: saved }, { data: orderRows }] = await Promise.all([
        supabase.from("profiles").select("full_name,phone,email").eq("user_id", userId).maybeSingle(),
        supabase.from("florencio_sessions").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("orders").select(ORDER_SELECT).eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
      ]);
      setAccount({ full_name: profile?.full_name ?? null, phone: profile?.phone ?? null, email: profile?.email ?? session.user.email ?? null });
      if (saved) {
        const row = saved as unknown as SessionRow;
        setSessionId(row.id);
        // Si el cliente ya venía hablando como invitado, no le borramos esa conversación al iniciar sesión.
        setMessages((prev) => (prev.length ? prev : Array.isArray(row.messages) ? row.messages : []));
        setFilters((prev) => (prev.collection || prev.budgetMax || prev.keywords?.length ? prev : row.filters ?? { keywords: [] }));
      }
      setOrders((orderRows ?? []) as unknown as OrderRow[]);
      setHistoryLoading(false);
    };
    void load();
  // catalog data intentionally does not retrigger the user-history request
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  useEffect(() => {
    if (activeTab === "chat" && chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  const phone = settings?.["whatsapp_number"] ?? DEFAULT_WHATSAPP;
  const trmValue = Number(settings?.["trm_cop_usd"] ?? 3950);

  /* ── Invitado: la conversación se guarda en este navegador ── */
  const [guestReady, setGuestReady] = useState(false);
  useEffect(() => {
    if (!authReady || session || guestReady) return;
    try {
      const raw = localStorage.getItem(GUEST_CHAT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { messages?: ChatMessage[]; filters?: FlorencioFilters };
        if (Array.isArray(parsed.messages)) {
          setMessages(parsed.messages.filter((m) => m && (m.role === "user" || m.role === "florencio") && typeof m.text === "string").slice(-30));
        }
        if (parsed.filters && Array.isArray(parsed.filters.keywords)) setFilters(parsed.filters);
      }
    } catch { /* historial local ilegible: se ignora */ }
    setGuestReady(true);
  }, [authReady, session, guestReady]);

  useEffect(() => {
    if (!guestReady || session) return;
    try { localStorage.setItem(GUEST_CHAT_KEY, JSON.stringify({ messages: messages.slice(-30), filters })); } catch { /* sin almacenamiento */ }
  }, [guestReady, session, messages, filters]);

  // Al volver a abrir el chat con colección + presupuesto guardados, reconstruimos la selección.
  const recsRestored = useRef(false);
  useEffect(() => {
    if (recsRestored.current || !products.length || !categories.length) return;
    if (!filters.collection || !filters.budgetMax) return;
    recsRestored.current = true;
    setRecommendations(rankFlorencioProducts(products, categories, filters, 4));
  }, [products, categories, filters]);

  const loadOrders = async () => {
    if (!session?.user.id) return;
    const { data } = await supabase.from("orders").select(ORDER_SELECT).eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(12);
    setOrders((data ?? []) as unknown as OrderRow[]);
  };

  // Al abrir "Mis pedidos" siempre leemos el estado más reciente (lo escribe el webhook de pagos).
  useEffect(() => {
    if (activeTab === "orders" && session?.user.id) void loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, session?.user.id]);

  const persist = async (nextMessages: ChatMessage[], nextFilters: FlorencioFilters, nextRecs: ReturnType<typeof rankFlorencioProducts>, queryText: string) => {
    if (!session?.user.id) return; // invitados: se guarda solo en el navegador
    const payload = {
      user_id: session.user.id,
      title: queryText.slice(0, 80),
      messages: nextMessages.slice(-18),
      filters: nextFilters,
      recommendation_product_ids: nextRecs.map((p) => p.id),
      updated_at: new Date().toISOString(),
    };
    let id = sessionId;
    if (id) {
      const { error } = await supabase.from("florencio_sessions").update(payload).eq("id", id).eq("user_id", session.user.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("florencio_sessions").insert(payload).select("id").single();
      if (error) throw error;
      id = String(data.id);
      setSessionId(id);
    }
    if (nextRecs.length && id) {
      await supabase.from("florencio_recommendations").upsert(
        nextRecs.map((p, i) => ({
          user_id: session.user.id,
          session_id: id,
          product_id: p.id,
          query_text: queryText,
          reason: p.matchReasons?.[0] ?? "Coincide con tu búsqueda.",
          rank: i + 1,
        })),
        { onConflict: "session_id,product_id" },
      );
    }
  };

  const send = async (raw = input) => {
    const text = raw.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    const userMessage: ChatMessage = { id: uid(), role: "user", text, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    const firstContact = !messages.some((m) => m.role === "user");

    try {
      // Catálogo real (si React Query aún no terminó de cargar, lo leemos directo).
      let catalogProducts = products;
      let catalogCategories = categories;
      if (!catalogProducts.length || !catalogCategories.length) {
        const [{ data: freshProducts }, { data: freshCategories }] = await Promise.all([
          supabase.from("products").select("*").order("sort_order", { ascending: true }),
          supabase.from("categories").select("*").order("sort_order", { ascending: true }),
        ]);
        if (!catalogProducts.length) catalogProducts = (freshProducts ?? []) as unknown as Product[];
        if (!catalogCategories.length) catalogCategories = (freshCategories ?? []) as unknown as typeof categories;
      }
      const activeCategories = catalogCategories.filter((c) => c.is_active !== false);
      const greetingOnly = isGreetingOnly(text);

      // La IA se usa para entender la conversación; si falla, el motor local sigue funcionando.
      let ai: Awaited<ReturnType<typeof askFlorencioAI>> | null = null;
      if (!greetingOnly) {
        try {
          ai = await askFlorencioAI({
            message: text,
            history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
            currentFilters: filters,
            language: lang,
            categories: activeCategories.map((c) => ({ name: c.name, slug: c.slug, description: c.description })),
          });
        } catch (error) {
          console.warn("Florencio IA no disponible; uso el motor local.", error);
        }
      }

      const plan = planFlorencioTurn({
        text,
        lang,
        firstContact,
        filters,
        categories: activeCategories,
        products: catalogProducts,
        settings,
        ai,
      });
      const { merged, replyText, shouldRecommend, asking } = plan;
      const action = plan.action;
      const nextRecs = plan.recommendations;

      const assistant: ChatMessage = { id: uid(), role: "florencio", text: replyText.slice(0, 700), createdAt: new Date().toISOString(), ...(action ? { action } : {}) };
      const finalMessages = [...nextMessages, assistant];
      setFilters(merged);
      setRecommendations(nextRecs);
      setMessages(finalMessages);
      try { await persist(finalMessages, merged, nextRecs, text); } catch (error) { console.warn("No se pudo guardar la conversación.", error); }
      if (shouldRecommend && nextRecs.length > 0) setRecommendationOpen(true);

      if (shouldRecommend) void playFlorencioAudio(nextRecs.length > 0 ? "recommend" : "budget", lang);
      else if (asking) void playFlorencioAudio("ask", lang);
    } catch (error) {
      console.error("Florencio: error inesperado", error);
      const assistant: ChatMessage = {
        id: uid(),
        role: "florencio",
        text: "Disculpa, tuve un inconveniente al procesar tu mensaje. ¿Me lo puedes escribir de nuevo, por favor?",
        createdAt: new Date().toISOString(),
      };
      setRecommendations([]);
      setMessages([...nextMessages, assistant]);
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async () => {
    setRecommendationOpen(false);
    setRecommendations([]);
    setFilters({ keywords: [] });
    setInput("");
    if (sessionId && session?.user.id) {
      await supabase.from("florencio_sessions").delete().eq("id", sessionId).eq("user_id", session.user.id);
    }
    setSessionId(null);
    setMessages([]);
    try { localStorage.removeItem(GUEST_CHAT_KEY); } catch { /* ignore */ }
  };

  const addProduct = (product: Product & { colorMatch?: boolean | undefined; requestedColor?: string | undefined }) => {
    const category = categories.find((c) => c.id === product.category_id);

    // Bodas & Eventos: no hay carrito, se cotiza por WhatsApp con el link del producto.
    if (isQuoteCategory(category, settings)) {
      openWhatsApp(phone, quoteMessage(product, category?.name, lang));
      return;
    }

    add(product);
    setRecommendationOpen(false);
    window.dispatchEvent(new CustomEvent("florencio:product-selected", { detail: { name: product.name } }));
    void playFlorencioAudio("added", lang);

    const needsColorAsk = Boolean(product.requestedColor) && product.colorMatch === false;
    const loginNote = session
      ? ""
      : lang === "en" ? " To pay you'll need to sign in; your cart stays saved." : " Para pagar necesitarás iniciar sesión; tu carrito quedará guardado.";
    const colorNote = needsColorAsk
      ? lang === "en" ? " If you'd like it in another color, ask us on WhatsApp." : " Si lo quieres en otro color, pregúntanos por WhatsApp."
      : "";
    const msg: ChatMessage = {
      id: uid(),
      role: "florencio",
      text: lang === "en"
        ? `Done. I added ${upperName(product.name)} to your cart.${colorNote}${loginNote}`
        : `Listo. Añadí ${upperName(product.name)} a tu carrito.${colorNote}${loginNote}`,
      createdAt: new Date().toISOString(),
      ...(needsColorAsk && product.requestedColor
        ? { action: { label: lang === "en" ? "Ask about another color" : "Preguntar por otro color", whatsappMessage: colorQuestionMessage(product, product.requestedColor, lang) } }
        : {}),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof MessageCircle; private?: boolean }> = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "orders", label: "Mis pedidos", icon: Package, private: true },
    { id: "account", label: "Mi cuenta", icon: UserRound },
    { id: "gallery", label: "Florencio", icon: ImageIcon },
  ];
  const selectTab = (tab: Tab) => { setActiveTab(tab); setMobileMenu(false); };
  const navItem = (tab: Tab) => {
    const t = tabs.find((x) => x.id === tab)!;
    const Icon = t.icon;
    return <button type="button" onClick={() => selectTab(tab)} className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition ${activeTab === tab ? "bg-primary/10 text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}><Icon className="h-4 w-4 shrink-0" />{t.label}{t.private && !session ? <LogIn className="ml-auto h-3.5 w-3.5 text-primary" /> : null}</button>;
  };

  if (!authReady) return <div className="flex min-h-[72vh] items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;

  if (isCatalogPage && !catalogChatOpen) {
    return <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-[#fffaf2]/95 shadow-[0_25px_70px_-45px_rgba(62,37,20,.38)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
        <button type="button" onClick={() => setCatalogChatOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded="false" aria-controls="catalog-florencio-chat">
          <Avatar src={profileImage} size="sm" />
          <span className="min-w-0"><span className="block font-display text-xl leading-none">Habla con Florencio</span><span className="mt-1 block truncate text-[9px] tracking-[.12em] text-muted-foreground uppercase">Tu asesor floral · recomendaciones del catálogo</span></span>
        </button>
        <button type="button" onClick={() => setCatalogChatOpen(true)} aria-label="Desplegar chat de Florencio" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white transition hover:border-primary/40 hover:text-primary"><ChevronDown className="h-4 w-4" /></button>
      </div>
    </section>;
  }

  return <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-white/85 shadow-[0_38px_110px_-60px_rgba(62,37,20,.5)] backdrop-blur-xl">
    <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(138,101,59,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(138,101,59,.035)_1px,transparent_1px)] [background-size:42px_42px]" />
    <div className="relative h-[calc(100dvh-8rem)] min-h-[620px] lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border/80 bg-[#fcf8f2]/90 p-5 lg:flex lg:flex-col">
        <div className="flex items-center gap-3"><Avatar src={profileImage} /><div className="min-w-0"><p className="font-display text-2xl">Florencio</p><p className="text-[8px] tracking-[.14em] text-muted-foreground uppercase">Asistente floral</p><span className="mt-1 flex items-center gap-1.5 text-[9px] text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{session ? "En línea" : "Invitado"}</span></div></div>
        <nav className="mt-8 space-y-1.5">{tabs.map((t) => <span key={t.id}>{navItem(t.id)}</span>)}</nav>
        <div className="mt-auto pt-6">{session ? <button type="button" onClick={() => void supabase.auth.signOut()} className="w-full rounded-2xl border border-border px-4 py-3 text-[9px] tracking-[.16em] text-muted-foreground uppercase hover:border-primary">Cerrar sesión</button> : <button type="button" onClick={() => selectTab("account")} className="w-full rounded-2xl bg-primary px-4 py-3 text-[9px] tracking-[.16em] text-primary-foreground uppercase">Entrar / crear cuenta</button>}</div>
      </aside>
      {mobileMenu && <div className="absolute inset-0 z-30 bg-black/10 lg:hidden" onClick={() => setMobileMenu(false)} aria-hidden="true" />}
      <div className={`absolute inset-y-0 left-0 z-40 w-[min(320px,88vw)] bg-[#fcf8f2] p-5 shadow-2xl transition-transform duration-300 lg:hidden ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Avatar src={profileImage} /><div><p className="font-display text-2xl">Florencio</p><p className="text-[8px] tracking-[.14em] text-muted-foreground uppercase">Tu espacio Deluxury</p></div></div><button type="button" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" className="rounded-full border border-border p-2"><X className="h-4 w-4" /></button></div>
        <nav className="mt-8 space-y-1.5">{tabs.map((t) => <span key={t.id}>{navItem(t.id)}</span>)}</nav>
        <div className="mt-8 border-t border-border pt-5"><Link to="/cuenta" className="text-xs text-muted-foreground hover:text-primary">Centro de cuenta</Link>{session && <button type="button" onClick={() => void supabase.auth.signOut()} className="mt-5 block text-xs text-muted-foreground hover:text-primary">Cerrar sesión</button>}</div>
      </div>
      <main className="flex h-full min-h-0 min-w-0 flex-col">
        <header id={isCatalogPage ? "catalog-florencio-chat" : undefined} className="flex shrink-0 items-center justify-between border-b border-border/80 bg-white/75 px-4 py-4 sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileMenu(true)} className="rounded-xl border border-border p-2 lg:hidden" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button><Avatar src={profileImage} size="sm" /><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-display text-xl">Florencio</p><span className="hidden rounded-full bg-primary/10 px-2 py-1 text-[8px] tracking-[.12em] text-primary uppercase sm:inline">IA floral</span></div><p className="truncate text-[9px] text-muted-foreground sm:text-xs">{tabs.find((x) => x.id === activeTab)?.label}</p></div></div>
          <div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[8px] tracking-[.12em] text-muted-foreground uppercase sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${session ? "bg-emerald-500" : "bg-primary"}`} />{session ? "Cuenta activa" : "Invitado"}</div><button type="button" onClick={() => void deleteChat()} aria-label="Borrar conversación" title="Borrar conversación" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white hover:border-red-300 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>{isCatalogPage && <button type="button" onClick={() => setCatalogChatOpen(false)} aria-label="Cerrar chat desplegable" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white hover:border-primary/40 hover:text-primary"><ChevronUp className="h-4 w-4" /></button>}</div>
        </header>

        {activeTab === "chat" && <div className="flex min-h-0 flex-1 flex-col">
          <div ref={chatRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-7">
            <div className="mx-auto w-full max-w-4xl">
              {!session && <p className="mb-6 rounded-2xl border border-primary/15 bg-primary/[.04] p-4 text-xs leading-relaxed text-muted-foreground">Puedes hablar con Florencio y recibir recomendaciones <strong className="text-foreground">sin crear una cuenta</strong>. Solo necesitarás <button type="button" onClick={() => selectTab("account")} className="underline decoration-primary/40 underline-offset-2 hover:text-primary">iniciar sesión</button> para pagar tu pedido, guardar tu historial y ver tus compras.</p>}
              <div className="mb-5 flex justify-start"><div className="max-w-[94%] rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3.5 text-sm leading-relaxed shadow-sm sm:px-5">{welcomeMessage(lang)}</div></div>
              <div className="space-y-5">
                {messages.map((m) => <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "florencio" ? <div className="max-w-[94%]"><div className="rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3.5 text-sm leading-relaxed shadow-sm sm:px-5">{m.text}</div>{m.action && <button type="button" onClick={() => openWhatsApp(phone, m.action!.whatsappMessage)} className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-[9px] tracking-[.14em] text-white uppercase shadow-sm transition hover:opacity-90"><MessageCircle className="h-3.5 w-3.5" />{m.action.label}</button>}</div> : <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-3.5 text-sm leading-relaxed text-primary-foreground shadow-[0_16px_34px_-24px_rgba(110,53,55,.55)] sm:px-5">{m.text}</div>}
                </div>)}
                {loading && <div className="flex justify-start text-xs text-muted-foreground"><span className="rounded-full border border-border bg-white px-4 py-2.5">Pensando…</span></div>}
              </div>
            </div>
          </div>
          <footer className="shrink-0 border-t border-border/80 bg-white/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-4">
            <div className="mx-auto max-w-4xl"><div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{STARTERS.map((s) => <button key={s} type="button" onClick={() => void send(s)} disabled={loading} className="shrink-0 rounded-full border border-border bg-background px-3.5 py-2 text-[9px] text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-40">{s}</button>)}</div><form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 focus-within:border-primary/45"><MessageCircle className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" /><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escríbele a Florencio…" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground/60" disabled={loading} /><button type="submit" disabled={!input.trim() || loading} aria-label="Enviar mensaje" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button></form><p className="mt-2 text-center text-[8px] tracking-[.12em] text-muted-foreground uppercase">Productos y precios salen del catálogo real de Deluxury</p></div>
          </footer>
        </div>}

        {activeTab === "account" && <div className="flex-1 overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-3xl"><p className="eyebrow">Mi cuenta</p><h2 className="mt-2 font-display text-4xl">Tu espacio con Florencio.</h2>{session ? <div className="mt-8 space-y-5"><div className="rounded-[26px] border border-border bg-white p-6"><div className="flex items-center gap-4"><Avatar src={profileImage} size="lg" /><div><p className="font-display text-2xl">{account?.full_name || "Cliente Deluxury"}</p><p className="mt-1 text-sm text-muted-foreground">{account?.email || session.user.email}</p></div></div><div className="mt-7 grid gap-4 sm:grid-cols-3">{[["Nombre", account?.full_name || "Pendiente"], ["Teléfono", account?.phone || "No registrado"], ["Correo", account?.email || session.user.email || ""]].map(([label, value]) => <div key={label} className="rounded-2xl bg-secondary/45 p-4"><p className="text-[8px] tracking-[.16em] text-primary uppercase">{label}</p><p className="mt-2 truncate text-sm">{value}</p></div>)}</div><Link to="/cuenta" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[9px] tracking-[.16em] text-primary-foreground uppercase">Gestionar cuenta <ArrowRight className="h-4 w-4" /></Link></div><button type="button" onClick={() => void supabase.auth.signOut()} className="rounded-full border border-border px-5 py-3 text-[9px] tracking-[.16em] uppercase hover:border-primary">Cerrar sesión</button></div> : <AuthPanel profileImage={profileImage} />}</div></div>}
        {activeTab === "orders" && <div className="flex-1 overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><p className="eyebrow">Seguimiento</p><h2 className="mt-2 font-display text-4xl">Mis pedidos.</h2>{!session ? <div className="mt-8"><AuthPanel profileImage={profileImage} /></div> : orders.length === 0 ? <div className="mt-8 rounded-[26px] border border-dashed border-primary/20 bg-white/70 p-8"><Package className="h-5 w-5 text-primary" /><p className="mt-4 font-display text-2xl">Todavía no tienes pedidos.</p><p className="mt-2 text-sm text-muted-foreground">Cuando compres con tu cuenta, el estado aparecerá aquí.</p></div> : <div className="mt-8 space-y-5">{orders.map((order) => <OrderCard key={order.id} order={order} whatsapp={phone} onChanged={() => void loadOrders()} />)}</div>}</div></div>}
        {activeTab === "gallery" && <div className="flex-1 overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Detrás de Florencio</p><h2 className="mt-2 font-display text-4xl">Momentos de Florencio.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Fotos y reels configurados desde el panel de administración de Deluxury.</p></div><ImageIcon className="h-5 w-5 text-primary" /></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{galleryMedia.map((item, i) => <a key={`${item.url}-${i}`} href={item.link || (item.type === "reel" ? item.url : undefined)} target={item.type === "reel" || item.link ? "_blank" : undefined} rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/25">
          {item.type === "image" ? <img src={item.url} alt={item.caption || "Florencio"} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /> : isVideo(item.url) ? <video src={item.url} muted loop autoPlay playsInline className="h-full w-full object-cover" /> : <div className="flex h-full flex-col justify-end bg-[radial-gradient(circle_at_50%_28%,rgba(187,140,86,.2),transparent_62%)] p-5"><span className="text-[8px] tracking-[.16em] text-primary uppercase">Reel de Florencio</span><p className="mt-2 font-display text-xl">{item.caption || "Ver reel"}</p><ArrowRight className="mt-4 h-4 w-4 text-primary" /></div>}
        </a>)}</div></div></div>}
      </main>
    </div>

    {recommendationOpen && recommendations.length > 0 && (
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-foreground/35 px-4 py-4 backdrop-blur-[2px] sm:items-center sm:py-8" role="dialog" aria-modal="true" aria-labelledby="florencio-recommendation-title">
        <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-primary/15 bg-[#fffaf2] shadow-[0_35px_110px_-45px_rgba(42,24,12,.5)]">
          <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[8px] tracking-[.2em] text-primary uppercase">Florencio</p>
              <h2 id="florencio-recommendation-title" className="mt-1 font-display text-2xl sm:text-3xl">Encontré algo para ti.</h2>
              <p className="mt-1 text-xs text-muted-foreground">Estas opciones salen del catálogo real de Deluxury.</p>
            </div>
            <button type="button" onClick={() => setRecommendationOpen(false)} aria-label="Cerrar recomendación" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white hover:border-primary/40">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[62vh] overflow-y-auto px-5 py-5 sm:px-6">
            {(() => {
              const color = recommendations[0]?.requestedColor;
              const matches = recommendations.filter((r) => r.colorMatch).length;
              if (!color || matches === recommendations.length) return null;
              return <p className="mb-4 rounded-2xl border border-primary/20 bg-primary/[.05] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                {matches === 0
                  ? <>No veo un arreglo descrito en color <strong className="text-foreground">{colorLabel(color)}</strong> en esta selección. Si buscas otro color, <strong className="text-foreground">elige el arreglo que más te guste y pregúntanos por WhatsApp</strong> si hay una variante disponible.</>
                  : <>Te muestro primero los que vienen en <strong className="text-foreground">{colorLabel(color)}</strong>. Si prefieres otro, pregúntanos por WhatsApp si hay variante en ese color.</>}
              </p>;
            })()}
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((p) => {
                const category = categories.find((c) => c.id === p.category_id);
                const quote = isQuoteCategory(category, settings);
                const askColor = Boolean(p.requestedColor) && p.colorMatch === false;
                return (
                  <article key={p.id} className="rounded-2xl border border-border bg-white p-3 sm:p-4">
                    <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[104px_minmax(0,1fr)_auto]">
                      <div className="aspect-square overflow-hidden rounded-xl bg-secondary/40">
                        <img src={p.images?.[0] ?? "/img/prod-01.jpg"} alt={upperName(p.name)} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="min-w-0">
                        <Link to="/producto/$slug" params={{ slug: p.slug }} onClick={() => setRecommendationOpen(false)} className="block font-display text-lg leading-tight tracking-[0.03em] break-words hover:text-primary sm:text-xl">{upperName(p.name)}</Link>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.matchReasons?.[0] ?? "Una opción que coincide con tu búsqueda."}</p>
                        <p className="mt-2 text-sm font-medium text-primary">{formatMoney(Number(p.price_cop), currency, trmValue)}</p>
                      </div>
                      <button type="button" onClick={() => addProduct(p)} className="shrink-0 rounded-full bg-primary px-3 py-2 text-[9px] tracking-[.14em] text-primary-foreground uppercase sm:px-4">{quote ? "Cotizar" : "Elegir"}</button>
                    </div>
                    {askColor && p.requestedColor && (
                      <button type="button" onClick={() => openWhatsApp(phone, colorQuestionMessage(p, p.requestedColor!, lang))} className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#25D366]/50 bg-[#25D366]/10 px-3.5 py-2 text-[9px] tracking-[.12em] text-[#128C7E] uppercase transition hover:bg-[#25D366]/20">
                        <MessageCircle className="h-3.5 w-3.5" />Preguntar por color {colorLabel(p.requestedColor)} en WhatsApp
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
          <div className="grid gap-2 border-t border-border/70 p-4 sm:grid-cols-2">
            <button type="button" onClick={() => { setRecommendationOpen(false); navigate({ to: "/catalogo" }); }} className="rounded-full border border-border bg-white px-4 py-3 text-[9px] tracking-[.18em] uppercase hover:border-primary">Ver catálogo</button>
            <button type="button" onClick={() => setRecommendationOpen(false)} className="rounded-full bg-primary px-4 py-3 text-[9px] tracking-[.18em] text-primary-foreground uppercase">Ahora no</button>
          </div>
        </div>
      </div>
    )}
  </section>;
}
