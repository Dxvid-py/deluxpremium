import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Heart,
  Image as ImageIcon,
  LogIn,
  Menu,
  MessageCircle,
  Package,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import type { Session } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, productsQuery, settingsQuery, type Product } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator, useI18n } from "@/lib/i18n";
import { parseFlorencioFilters, rankFlorencioProducts, type FlorencioFilters } from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";
import { playFlorencioAudio } from "@/lib/florencio-voice";

type Tab = "chat" | "recommendations" | "orders" | "account" | "gallery";
type ChatMessage = { id: string; role: "user" | "florencio"; text: string; createdAt: string };
type SessionRow = {
  id: string; user_id: string; title: string | null; messages: ChatMessage[];
  filters: FlorencioFilters; recommendation_product_ids: string[]; created_at: string; updated_at: string;
};
type RecommendationRow = {
  id: string; session_id: string; product_id: string; query_text: string | null;
  reason: string | null; rank: number; created_at: string;
};
type OrderRow = {
  id: string; order_number: string; total_cop: number; status: string; created_at: string;
  delivery_date: string | null; delivery_slot: string | null; address: string; city: string;
  items: Array<{ product_id: string; name: string; image: string; qty: number; price_cop: number }>;
};
type MediaItem = { type: "image" | "reel"; url: string; caption?: string; link?: string };

const RECOMMENDATION_MARKER = "__florencio_recommendation__";
const STARTERS = ["Quiero un ramo para mi pareja", "Regalo para mamá", "Algo elegante", "Máximo $200.000"];
const STATUS_STEPS = ["nuevo", "confirmado", "en preparación", "en ruta", "entregado"];

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
  } catch {
    return [];
  }
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

function Avatar({ src, size = "md" }: { src: string; size?: "sm" | "md" | "lg" }) {
  const c = size === "lg" ? "h-24 w-24" : size === "sm" ? "h-9 w-9" : "h-14 w-14";
  return (
    <div className={`${c} shrink-0 overflow-hidden rounded-full border border-primary/20 bg-[#e8d7be] shadow-[0_16px_40px_-26px_rgba(60,36,18,.55)]`}>
      <img src={src} alt="Florencio" className="h-full w-full object-cover object-[50%_18%]" />
    </div>
  );
}

function AuthPanel({ profileImage }: { profileImage: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/florencio`,
            data: { full_name: name },
          },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from("profiles").upsert(
            { user_id: data.user.id, full_name: name || null, email },
            { onConflict: "user_id" },
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la solicitud.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-[28px] border border-primary/15 bg-white/90 p-6 shadow-[0_30px_90px_-56px_rgba(68,40,20,.55)] sm:p-9">
      <div className="flex items-center gap-4">
        <Avatar src={profileImage} size="lg" />
        <div>
          <p className="font-display text-3xl">{mode === "in" ? "Bienvenido" : "Crea tu cuenta"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Necesitas una cuenta para usar la IA, guardar recomendaciones y consultar tus pedidos.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "up" && (
          <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" type="password" placeholder="Contraseña" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[10px] tracking-[.18em] text-primary-foreground uppercase disabled:opacity-50">
          {busy ? "Procesando…" : mode === "in" ? "Entrar" : "Crear cuenta"}<LogIn className="h-4 w-4" />
        </button>
      </form>
      <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary">
        {mode === "in" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta · Iniciar sesión"}
      </button>
    </div>
  );
}

function ProductCardMini({
  product,
  profileImage,
  onAdd,
}: {
  product: Product & { matchReasons?: string[] };
  profileImage: string;
  onAdd: (p: Product) => void;
}) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_50px_-35px_rgba(60,35,18,.35)]">
      <div className="aspect-[4/3] overflow-hidden bg-secondary/30">
        <img src={product.images?.[0] ?? "/img/prod-01.jpg"} alt={tc(product.name)} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2"><Avatar src={profileImage} size="sm" /><span className="text-[8px] tracking-[.16em] text-primary uppercase">Florencio recomienda</span></div>
        <Link to="/producto/$slug" params={{ slug: product.slug }} className="mt-3 block font-display text-xl leading-tight hover:text-primary">{tc(product.name)}</Link>
        <p className="mt-1.5 min-h-10 text-xs leading-relaxed text-muted-foreground">{product.matchReasons?.[0] ?? "Una pieza que encaja con tu búsqueda."}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-primary">{formatMoney(Number(product.price_cop), currency, trm)}</span>
          <button type="button" onClick={() => onAdd(product)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-[9px] tracking-[.12em] text-background uppercase hover:bg-primary hover:text-primary-foreground"><ShoppingBag className="h-3.5 w-3.5" />Añadir</button>
        </div>
      </div>
    </article>
  );
}

export default function FlorencioCatalogAssistant() {
  const { lang } = useI18n();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { add } = useStore();

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
  const [recommendationHistory, setRecommendationHistory] = useState<RecommendationRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [account, setAccount] = useState<{ full_name: string | null; phone: string | null; email: string | null } | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const isCatalogPage = location.pathname.startsWith("/catalogo");
  const [catalogChatOpen, setCatalogChatOpen] = useState(false);

  const profileImage = settings?.["florencio_profile_image_url"] || settings?.["florencio_intro_image_url"] || "/img/florencio.png";
  const media = useMemo(() => parseMedia(settings?.["florencio_media_json"]), [settings]);
  const galleryMedia = media.length ? media : [{ type: "image" as const, url: profileImage, caption: "Florencio en Deluxury" }];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) {
      setAccount(null);
      setOrders([]);
      setRecommendationHistory([]);
      return;
    }

    const userId = session.user.id;

    const load = async () => {
      setHistoryLoading(true);
      const [{ data: profile }, { data: saved }, { data: recs }, { data: orderRows }] = await Promise.all([
        supabase.from("profiles").select("full_name,phone,email").eq("user_id", userId).maybeSingle(),
        supabase.from("florencio_sessions").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("florencio_recommendations").select("id,session_id,product_id,query_text,reason,rank,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(24),
        supabase.from("orders").select("id,order_number,total_cop,status,created_at,delivery_date,delivery_slot,address,city,items").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
      ]);

      setAccount({
        full_name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        email: profile?.email ?? session.user.email ?? null,
      });

      if (saved) {
        const row = saved as unknown as SessionRow;
        setSessionId(row.id);
        setMessages(Array.isArray(row.messages) && row.messages.length ? row.messages : []);
        setFilters(row.filters ?? { keywords: [] });
        setRecommendations(rankFlorencioProducts(products, categories, row.filters ?? { keywords: [] }, 4));
      }

      setRecommendationHistory((recs ?? []) as RecommendationRow[]);
      setOrders((orderRows ?? []) as unknown as OrderRow[]);
      setHistoryLoading(false);
    };

    void load();
    // catalog data intentionally does not retrigger the user-history request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  useEffect(() => {
    if (!messages.length) {
      setMessages(
        lang === "en"
          ? [
              { id: "welcome-1", role: "florencio", text: "Hi. I'm Florencio, Deluxury's floral assistant.", createdAt: new Date().toISOString() },
              { id: "welcome-2", role: "florencio", text: "Tell me what you need and I'll help without inventing information or forcing a purchase.", createdAt: new Date().toISOString() },
            ]
          : [
              { id: "welcome-1", role: "florencio", text: "Hola. Soy Florencio, tu asistente floral de Deluxury.", createdAt: new Date().toISOString() },
              { id: "welcome-2", role: "florencio", text: "Cuéntame qué necesitas y te ayudaré sin inventar información ni forzar una compra.", createdAt: new Date().toISOString() },
            ],
      );
    }
  }, [messages.length, lang]);

  useEffect(() => {
    if (activeTab === "chat" && chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  const getRecommendations = (next: FlorencioFilters) =>
    rankFlorencioProducts(products, categories, next, 4);

  const persist = async (
    nextMessages: ChatMessage[],
    nextFilters: FlorencioFilters,
    nextRecs: ReturnType<typeof rankFlorencioProducts>,
    queryText: string,
  ) => {
    if (!session?.user.id) return;

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
      const { error } = await supabase
        .from("florencio_sessions")
        .update(payload)
        .eq("id", id)
        .eq("user_id", session.user.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("florencio_sessions")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      id = String(data.id);
      setSessionId(id);
    }

    if (nextRecs.length && id) {
      await supabase
        .from("florencio_recommendations")
        .upsert(
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

    if (!session) {
      setActiveTab("account");
      setMobileMenu(false);
      return;
    }

    const local = parseFlorencioFilters(text);
    setInput("");
    setLoading(true);

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const result = await askFlorencioAI({
        message: text,
        history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
        currentFilters: filters,
        language: lang,
      });

      // Nunca dejamos que el marcador de recomendación sobreviva a una conversación,
      // una pregunta informativa o una etapa de descubrimiento.
      const cleanedKeywords = [
        ...filters.keywords,
        ...local.keywords,
        ...(result.keywords ?? []),
        ...(result.filters.keywords ?? []),
      ].filter((keyword) => keyword !== RECOMMENDATION_MARKER);

      const merged: FlorencioFilters = {
        recipient: result.filters.recipient ?? local.recipient ?? filters.recipient,
        occasion: result.filters.occasion ?? local.occasion ?? filters.occasion,
        style: result.filters.style ?? local.style ?? filters.style,
        color: result.filters.color ?? local.color ?? filters.color,
        budgetMax: result.filters.budgetMax ?? local.budgetMax ?? filters.budgetMax,
        keywords: Array.from(
          new Set([
            ...cleanedKeywords,
            ...(result.intent === "recommendation" ? [RECOMMENDATION_MARKER] : []),
          ]),
        ).slice(0, 21),
      };

      const nextRecs =
        result.intent === "recommendation"
          ? getRecommendations(merged)
          : [];

      let reply = result.reply.length > 220
        ? `${result.reply.slice(0, 217)}…`
        : result.reply;

      // Si el backend pidió recomendar pero el catálogo no tiene coincidencias,
      // no mostramos productos de relleno y decimos la verdad.
      if (result.intent === "recommendation" && nextRecs.length === 0) {
        reply =
          lang === "en"
            ? merged.budgetMax
              ? `I checked the current catalog and couldn't find an arrangement within your $${merged.budgetMax.toLocaleString("en-US")} budget. I'd rather tell you than offer something more expensive.`
              : "I checked the current catalog and couldn't find a good enough match for what you're looking for. I'd rather tell you than recommend something that doesn't fit."
            : merged.budgetMax
              ? `Revisé el catálogo actual y no encontré un arreglo que cumpla tu presupuesto de $${merged.budgetMax.toLocaleString("es-CO")}. Prefiero decírtelo antes que ofrecerte algo más caro.`
              : "Revisé el catálogo actual y no encontré una coincidencia suficiente con lo que buscas. Prefiero decírtelo antes que recomendarte algo que no encaja.";
      }

      // Florencio habla según su intención y en el idioma elegido en la intro.
      if (result.intent === "recommendation") {
        void playFlorencioAudio(nextRecs.length > 0 ? "recommend" : "budget", lang);
      } else if (result.intent === "discovery") {
        void playFlorencioAudio("ask", lang);
      }

      const assistant: ChatMessage = {
        id: uid(),
        role: "florencio",
        text: reply,
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...nextMessages, assistant];

      setFilters(merged);
      setRecommendations(nextRecs);
      setMessages(finalMessages);
      await persist(finalMessages, merged, nextRecs, text);
    } catch {
      // Ante un fallo de IA no hacemos recomendaciones automáticas.
      // Esto evita que una caída de OpenAI termine mostrando productos genéricos.
      const merged: FlorencioFilters = {
        recipient: local.recipient ?? filters.recipient,
        occasion: local.occasion ?? filters.occasion,
        style: local.style ?? filters.style,
        color: local.color ?? filters.color,
        budgetMax: local.budgetMax ?? filters.budgetMax,
        keywords: Array.from(
          new Set(filters.keywords.filter((keyword) => keyword !== RECOMMENDATION_MARKER).concat(local.keywords)),
        ).slice(0, 20),
      };

      const assistant: ChatMessage = {
        id: uid(),
        role: "florencio",
        text: "Ahora mismo no pude consultar a Florencio correctamente. Prefiero no inventarte una recomendación.",
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...nextMessages, assistant];
      setFilters(merged);
      setRecommendations([]);
      setMessages(finalMessages);

      try {
        await persist(finalMessages, merged, [], text);
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    add(product);
    window.dispatchEvent(new CustomEvent("florencio:product-selected", { detail: { name: product.name } }));
    void playFlorencioAudio("added", lang);
    const msg: ChatMessage = {
      id: uid(),
      role: "florencio",
      text: lang === "en" ? `Done. I added ${product.name} to your cart.` : `Listo. Añadí ${product.name} a tu carrito.`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const clearChat = () => {
    setMessages(
      lang === "en"
        ? [
            { id: uid(), role: "florencio", text: "New conversation. How can I help?", createdAt: new Date().toISOString() },
          ]
        : [
            { id: uid(), role: "florencio", text: "Nueva conversación. ¿En qué puedo ayudarte?", createdAt: new Date().toISOString() },
          ],
    );
    setFilters({ keywords: [] });
    setRecommendations([]);
    setSessionId(null);
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof MessageCircle; private?: boolean }> = [
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "recommendations", label: "Recomendaciones", icon: Sparkles, private: true },
    { id: "orders", label: "Mis pedidos", icon: Package, private: true },
    { id: "account", label: "Mi cuenta", icon: UserRound },
    { id: "gallery", label: "Florencio", icon: ImageIcon },
  ];

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenu(false);
  };

  const navItem = (tab: Tab) => {
    const t = tabs.find((x) => x.id === tab)!;
    const Icon = t.icon;
    return (
      <button type="button" onClick={() => selectTab(tab)} className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm transition ${activeTab === tab ? "bg-primary/10 text-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>
        <Icon className="h-4 w-4 shrink-0" />
        {t.label}
        {t.private && !session ? <LogIn className="ml-auto h-3.5 w-3.5 text-primary" /> : null}
      </button>
    );
  };

  if (!authReady) {
    return <div className="flex min-h-[72vh] items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;
  }

  if (isCatalogPage && !catalogChatOpen) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-primary/15 bg-[#fffaf2]/95 shadow-[0_25px_70px_-45px_rgba(62,37,20,.38)]">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
          <button type="button" onClick={() => setCatalogChatOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded="false" aria-controls="catalog-florencio-chat">
            <Avatar src={profileImage} size="sm" />
            <span className="min-w-0">
              <span className="block font-display text-xl leading-none">Habla con Florencio</span>
              <span className="mt-1 block truncate text-[9px] tracking-[.12em] text-muted-foreground uppercase">Tu asesor floral · recomendaciones del catálogo</span>
            </span>
          </button>
          <button type="button" onClick={() => setCatalogChatOpen(true)} aria-label="Desplegar chat de Florencio" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white transition hover:border-primary/40 hover:text-primary">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-primary/15 bg-white/85 shadow-[0_38px_110px_-60px_rgba(62,37,20,.5)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(138,101,59,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(138,101,59,.035)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative min-h-[780px] lg:grid lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/80 bg-[#fcf8f2]/90 p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <Avatar src={profileImage} />
            <div className="min-w-0">
              <p className="font-display text-2xl">Florencio</p>
              <p className="text-[8px] tracking-[.14em] text-muted-foreground uppercase">Asistente floral</p>
              <span className="mt-1 flex items-center gap-1.5 text-[9px] text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{session ? "En línea" : "Inicia sesión"}</span>
            </div>
          </div>
          <nav className="mt-8 space-y-1.5">{tabs.map((t) => <span key={t.id}>{navItem(t.id)}</span>)}</nav>
          <div className="mt-auto pt-6">{session ? <button type="button" onClick={() => void supabase.auth.signOut()} className="w-full rounded-2xl border border-border px-4 py-3 text-[9px] tracking-[.16em] text-muted-foreground uppercase hover:border-primary">Cerrar sesión</button> : <button type="button" onClick={() => selectTab("account")} className="w-full rounded-2xl bg-primary px-4 py-3 text-[9px] tracking-[.16em] text-primary-foreground uppercase">Entrar / crear cuenta</button>}</div>
        </aside>

        {mobileMenu && <div className="absolute inset-0 z-30 bg-black/10 lg:hidden" onClick={() => setMobileMenu(false)} aria-hidden="true" />}
        <div className={`absolute inset-y-0 left-0 z-40 w-[min(320px,88vw)] bg-[#fcf8f2] p-5 shadow-2xl transition-transform duration-300 lg:hidden ${mobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Avatar src={profileImage} /><div><p className="font-display text-2xl">Florencio</p><p className="text-[8px] tracking-[.14em] text-muted-foreground uppercase">Tu espacio Deluxury</p></div></div>
            <button type="button" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" className="rounded-full border border-border p-2"><X className="h-4 w-4" /></button>
          </div>
          <nav className="mt-8 space-y-1.5">{tabs.map((t) => <span key={t.id}>{navItem(t.id)}</span>)}</nav>
          <div className="mt-8 border-t border-border pt-5"><Link to="/cuenta" className="text-xs text-muted-foreground hover:text-primary">Centro de cuenta</Link>{session && <button type="button" onClick={() => void supabase.auth.signOut()} className="mt-5 block text-xs text-muted-foreground hover:text-primary">Cerrar sesión</button>}</div>
        </div>

        <main className="flex min-h-[780px] min-w-0 flex-col">
          <header id={isCatalogPage ? "catalog-florencio-chat" : undefined} className="flex shrink-0 items-center justify-between border-b border-border/80 bg-white/75 px-4 py-4 sm:px-6 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileMenu(true)} className="rounded-xl border border-border p-2 lg:hidden" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
              <Avatar src={profileImage} size="sm" />
              <div className="min-w-0"><div className="flex items-center gap-2"><p className="font-display text-xl">Florencio</p><span className="hidden rounded-full bg-primary/10 px-2 py-1 text-[8px] tracking-[.12em] text-primary uppercase sm:inline">IA floral</span></div><p className="truncate text-[9px] text-muted-foreground sm:text-xs">{tabs.find((x) => x.id === activeTab)?.label}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[8px] tracking-[.12em] text-muted-foreground uppercase sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${session ? "bg-emerald-500" : "bg-primary"}`} />{session ? "Cuenta activa" : "Vista previa"}</div>
              {activeTab === "chat" && session && messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  aria-label={lang === "en" ? "Clear conversation" : "Vaciar conversación"}
                  title={lang === "en" ? "Clear conversation" : "Vaciar conversación"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white hover:border-primary/40 hover:text-primary"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              {isCatalogPage && <button type="button" onClick={() => setCatalogChatOpen(false)} aria-label="Cerrar chat desplegable" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white hover:border-primary/40 hover:text-primary"><ChevronUp className="h-4 w-4" /></button>}
            </div>
          </header>

          {activeTab === "chat" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={chatRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
                <div className="mx-auto w-full max-w-4xl">
                  <div className="mb-6 grid gap-4 rounded-[26px] border border-primary/15 bg-gradient-to-br from-[#fffaf2] to-white p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
                    <div className="relative mx-auto sm:mx-0"><span className="absolute -inset-3 rounded-full border border-primary/10 animate-pulse" /><Avatar src={profileImage} size="lg" /></div>
                    <div><p className="text-[9px] tracking-[.2em] text-primary uppercase">Florencio IA</p><h2 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">Hola, soy Florencio.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Estoy aquí para ayudarte a elegir un detalle con intención. Habla conmigo de forma natural; yo conecto tu idea con el catálogo real de Deluxury.</p></div>
                  </div>

                  {!session && <button type="button" onClick={() => selectTab("account")} className="mb-6 w-full rounded-2xl border border-primary/15 bg-primary/[.04] p-4 text-left text-sm leading-relaxed hover:bg-primary/[.06]"><strong>Inicia sesión para hablar con Florencio.</strong> Así también guardarás tus conversaciones, recomendaciones y pedidos.</button>}

                  <div className="space-y-5">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        {m.role === "florencio"
                          ? <div className="flex max-w-[94%] items-start gap-3"><Avatar src={profileImage} size="sm" /><div><div className="rounded-2xl rounded-tl-md border border-border bg-white px-4 py-3.5 text-sm leading-relaxed shadow-sm sm:px-5">{m.text}</div><p className="mt-1.5 px-1 text-[8px] text-muted-foreground">Florencio · Deluxury</p></div></div>
                          : <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-3.5 text-sm leading-relaxed text-primary-foreground shadow-[0_16px_34px_-24px_rgba(110,53,55,.55)] sm:px-5">{m.text}</div>}
                      </div>
                    ))}
                    {loading && <div className="flex items-center gap-3 text-xs text-muted-foreground"><Avatar src={profileImage} size="sm" /><span className="rounded-full border border-border bg-white px-4 py-2.5">Florencio está pensando…</span></div>}
                  </div>

                  {session && recommendations.length > 0 && (
                    <div className="mt-8 rounded-[26px] border border-primary/10 bg-white/70 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] tracking-[.18em] text-primary uppercase">Selección actual</p><h3 className="mt-1 font-display text-2xl">Lo que Florencio encontró</h3></div><button type="button" onClick={() => selectTab("recommendations")} className="text-[9px] tracking-[.16em] text-primary uppercase">Ver todo</button></div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{recommendations.map((p) => <ProductCardMini key={p.id} product={p} profileImage={profileImage} onAdd={addProduct} />)}</div>
                    </div>
                  )}
                </div>
              </div>

              <footer className="shrink-0 border-t border-border/80 bg-white/95 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-4">
                <div className="mx-auto max-w-4xl">
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {STARTERS.map((s) => <button key={s} type="button" onClick={() => void send(s)} disabled={!session || loading} className="shrink-0 rounded-full border border-border bg-background px-3.5 py-2 text-[9px] text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-40">{s}</button>)}
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 focus-within:border-primary/45">
                    <MessageCircle className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={session ? "Escríbele a Florencio…" : "Inicia sesión para escribirle a Florencio…"} className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground/60" disabled={!session || loading} />
                    <button type="submit" disabled={!session || !input.trim() || loading} aria-label="Enviar mensaje" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
                  </form>
                  <p className="mt-2 text-center text-[8px] tracking-[.12em] text-muted-foreground uppercase">Productos y precios salen del catálogo real de Deluxury</p>
                </div>
              </footer>
            </div>
          )}

          {activeTab === "account" && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-3xl"><p className="eyebrow">Mi cuenta</p><h2 className="mt-2 font-display text-4xl">Tu espacio con Florencio.</h2>{session ? <div className="mt-8 space-y-5"><div className="rounded-[26px] border border-border bg-white p-6"><div className="flex items-center gap-4"><Avatar src={profileImage} size="lg" /><div><p className="font-display text-2xl">{account?.full_name || "Cliente Deluxury"}</p><p className="mt-1 text-sm text-muted-foreground">{account?.email || session.user.email}</p></div></div><div className="mt-7 grid gap-4 sm:grid-cols-3">{[["Nombre", account?.full_name || "Pendiente"], ["Teléfono", account?.phone || "No registrado"], ["Correo", account?.email || session.user.email || ""]].map(([label, value]) => <div key={label} className="rounded-2xl bg-secondary/45 p-4"><p className="text-[8px] tracking-[.16em] text-primary uppercase">{label}</p><p className="mt-2 truncate text-sm">{value}</p></div>)}</div><Link to="/cuenta" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[9px] tracking-[.16em] text-primary-foreground uppercase">Gestionar cuenta <ArrowRight className="h-4 w-4" /></Link></div><button type="button" onClick={() => void supabase.auth.signOut()} className="rounded-full border border-border px-5 py-3 text-[9px] tracking-[.16em] uppercase hover:border-primary">Cerrar sesión</button></div> : <AuthPanel profileImage={profileImage} />}</div></div>
          )}

          {activeTab === "recommendations" && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><p className="eyebrow">Historial inteligente</p><h2 className="mt-2 font-display text-4xl">Mis recomendaciones.</h2>{!session ? <div className="mt-8"><AuthPanel profileImage={profileImage} /></div> : historyLoading ? <p className="mt-10 text-sm text-muted-foreground">Cargando tu historial…</p> : recommendationHistory.length === 0 ? <div className="mt-8 rounded-[26px] border border-dashed border-primary/20 bg-white/70 p-8"><Heart className="h-5 w-5 text-primary" /><p className="mt-4 font-display text-2xl">Todavía no hay recomendaciones guardadas.</p><button type="button" onClick={() => selectTab("chat")} className="mt-5 rounded-full bg-primary px-5 py-3 text-[9px] tracking-[.16em] text-primary-foreground uppercase">Hablar con Florencio</button></div> : <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{recommendationHistory.map((r) => { const p = products.find((x) => x.id === r.product_id); return p ? <ProductCardMini key={r.id} product={{ ...p, matchReasons: r.reason ? [r.reason] : [] }} profileImage={profileImage} onAdd={addProduct} /> : null; })}</div>}</div></div>
          )}

          {activeTab === "orders" && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><p className="eyebrow">Seguimiento</p><h2 className="mt-2 font-display text-4xl">Mis pedidos.</h2>{!session ? <div className="mt-8"><AuthPanel profileImage={profileImage} /></div> : orders.length === 0 ? <div className="mt-8 rounded-[26px] border border-dashed border-primary/20 bg-white/70 p-8"><Package className="h-5 w-5 text-primary" /><p className="mt-4 font-display text-2xl">Todavía no tienes pedidos.</p><p className="mt-2 text-sm text-muted-foreground">Cuando compres con tu cuenta, el estado aparecerá aquí.</p></div> : <div className="mt-8 space-y-4">{orders.map((order) => { const current = STATUS_STEPS.indexOf(order.status); return <article key={order.id} className="rounded-[26px] border border-border bg-white p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-display text-xl">{order.order_number}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("es-CO")} · {order.city}</p></div><span className="rounded-full bg-primary/10 px-3 py-1.5 text-[9px] tracking-[.14em] text-primary uppercase">{order.status}</span></div><div className="mt-6 flex items-center gap-1">{STATUS_STEPS.map((step, i) => <div key={step} className="flex min-w-0 flex-1 items-center gap-1"><span title={step} className={`h-2.5 w-2.5 shrink-0 rounded-full ${i <= current ? "bg-primary" : "bg-border"}`} />{i < STATUS_STEPS.length - 1 && <span className={`h-px min-w-0 flex-1 ${i < current ? "bg-primary/50" : "bg-border"}`} />}</div>)}</div><div className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><p className="text-[8px] tracking-[.15em] text-muted-foreground uppercase">Total</p><p className="mt-1 text-primary">{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(order.total_cop))}</p></div><div><p className="text-[8px] tracking-[.15em] text-muted-foreground uppercase">Entrega</p><p className="mt-1">{order.delivery_date || "Por coordinar"}{order.delivery_slot ? ` · ${order.delivery_slot}` : ""}</p></div><div><p className="text-[8px] tracking-[.15em] text-muted-foreground uppercase">Dirección</p><p className="mt-1 truncate">{order.address || "Por coordinar"}</p></div></div><div className="mt-5 border-t border-border pt-4">{(order.items ?? []).slice(0, 4).map((item) => <div key={item.product_id} className="flex items-center gap-3 py-2"><img src={item.image || "/img/prod-01.jpg"} alt={item.name} className="h-10 w-8 rounded object-cover" /><p className="flex-1 text-sm">{item.qty} × {item.name}</p></div>)}</div></article>; })}</div>}</div></div>
          )}

          {activeTab === "gallery" && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Detrás de Florencio</p><h2 className="mt-2 font-display text-4xl">Momentos de Florencio.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Fotos y reels configurados desde el panel de administración de Deluxury.</p></div><ImageIcon className="h-5 w-5 text-primary" /></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{galleryMedia.map((item, i) => <a key={`${item.url}-${i}`} href={item.link || (item.type === "reel" ? item.url : undefined)} target={item.type === "reel" || item.link ? "_blank" : undefined} rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/25">{item.type === "image" ? <img src={item.url} alt={item.caption || "Florencio"} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" /> : isVideo(item.url) ? <video src={item.url} muted loop autoPlay playsInline className="h-full w-full object-cover" /> : <div className="flex h-full flex-col justify-end bg-[radial-gradient(circle_at_50%_28%,rgba(187,140,86,.2),transparent_62%)] p-5"><span className="text-[8px] tracking-[.16em] text-primary uppercase">Reel de Florencio</span><p className="mt-2 font-display text-xl">{item.caption || "Ver reel"}</p><ArrowRight className="mt-4 h-4 w-4 text-primary" /></div>}</a>)}</div></div></div>
          )}
        </main>
      </div>
    </section>
  );
}
