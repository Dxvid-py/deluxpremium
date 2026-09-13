import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Heart,
  HelpCircle,
  LogIn,
  MessageCircle,
  Package,
  Send,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Session } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriesQuery,
  productsQuery,
  settingsQuery,
  type Product,
} from "@/lib/queries";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { useContentTranslator } from "@/lib/i18n";
import {
  parseFlorencioFilters,
  rankFlorencioProducts,
  type FlorencioFilters,
} from "@/lib/florencio-recommendations";
import { askFlorencioAI } from "@/lib/florencio-ai";

type Tab = "chat" | "recommendations" | "account" | "orders";

type ChatMessage = {
  id: string;
  role: "user" | "florencio";
  text: string;
  createdAt: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  title: string | null;
  messages: ChatMessage[];
  filters: FlorencioFilters;
  recommendation_product_ids: string[];
  created_at: string;
  updated_at: string;
};

type RecommendationRow = {
  id: string;
  session_id: string;
  product_id: string;
  query_text: string | null;
  reason: string | null;
  rank: number;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_number: string;
  total_cop: number;
  status: string;
  created_at: string;
  delivery_date: string | null;
  delivery_slot: string | null;
  address: string;
  city: string;
  items: Array<{
    product_id: string;
    name: string;
    image: string;
    qty: number;
    price_cop: number;
  }>;
};

const STARTERS = [
  "Quiero un ramo para mi pareja",
  "Regalo para mamá",
  "Algo elegante",
  "Máximo $200.000",
];

const STATUS_STEPS = [
  "nuevo",
  "confirmado",
  "en preparación",
  "en ruta",
  "entregado",
];

function uid() {
  return crypto.randomUUID();
}

function ProfileAvatar({
  src,
  size = "md",
}: {
  src: string;
  size?: "sm" | "md" | "lg";
}) {
  const classes =
    size === "lg" ? "h-20 w-20" : size === "sm" ? "h-9 w-9" : "h-14 w-14";

  return (
    <div className={`${classes} shrink-0 overflow-hidden rounded-full border border-primary/20 bg-[#e8d7be]`}>
      <img
        src={src}
        alt="Florencio"
        className="h-full w-full object-cover object-[50%_18%]"
      />
    </div>
  );
}

function AuthGate({
  profileImage,
  onSignedIn,
}: {
  profileImage: string;
  onSignedIn: () => void;
}) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);

    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
      } else {
        onSignedIn();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/florencio`,
          data: { full_name: name },
        },
      });

      if (error) {
        alert(error.message);
      } else if (data.user) {
        await supabase.from("profiles").upsert(
          {
            user_id: data.user.id,
            full_name: name || null,
            email,
          },
          { onConflict: "user_id" },
        );
        onSignedIn();
      }
    }

    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-lg rounded-[28px] border border-primary/15 bg-white/80 p-6 shadow-[0_30px_80px_-50px_rgba(68,40,20,0.5)] backdrop-blur-xl md:p-9">
      <div className="flex items-center gap-4">
        <ProfileAvatar src={profileImage} size="lg" />
        <div>
          <p className="font-display text-3xl">Florencio</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "in"
              ? "Inicia sesión para continuar tu experiencia."
              : "Crea tu cuenta y guarda tu experiencia."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "up" && (
          <input
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}

        <input
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          type="password"
          placeholder="Contraseña"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase disabled:opacity-50"
        >
          <LogIn className="h-4 w-4" />
          {busy
            ? "Procesando…"
            : mode === "in"
              ? "Iniciar sesión"
              : "Crear cuenta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-5 w-full text-center text-xs text-muted-foreground hover:text-primary"
      >
        {mode === "in"
          ? "¿No tienes cuenta? Crear una"
          : "Ya tengo una cuenta"}
      </button>
    </div>
  );
}

function ProductCard({
  product,
  profileImage,
  onAdd,
}: {
  product: ReturnType<typeof rankFlorencioProducts>[number];
  profileImage: string;
  onAdd: (product: Product) => void;
}) {
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const tc = useContentTranslator([product.name]);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const reason =
    product.matchReasons?.[0] ??
    "Una pieza que encaja con el estilo y la intención que estás buscando.";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/80 bg-white/90 shadow-[0_18px_45px_-32px_rgba(63,39,19,0.35)]">
      <div className="aspect-[1.35/1] overflow-hidden bg-secondary/30">
        <img
          src={product.images?.[0] ?? "/img/prod-01.jpg"}
          alt={tc(product.name)}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <ProfileAvatar src={profileImage} size="sm" />
          <span className="text-[8px] tracking-[0.16em] text-primary uppercase">
            Florencio
          </span>
        </div>

        <Link
          to="/producto/$slug"
          params={{ slug: product.slug }}
          className="mt-3 block font-display text-xl leading-tight hover:text-primary"
        >
          {tc(product.name)}
        </Link>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {reason}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-primary">
            {formatMoney(Number(product.price_cop), currency, trm)}
          </span>
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-[9px] tracking-[0.12em] text-background uppercase hover:bg-primary hover:text-primary-foreground"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Añadir
          </button>
        </div>
      </div>
    </article>
  );
}

export default function FlorencioCatalogAssistant() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(settingsQuery);
  const { add } = useStore();

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "florencio",
      text: "Hola. Soy Florencio, el asistente floral de Deluxury. Cuéntame qué quieres regalar y te ayudo a encontrar una pieza que tenga sentido.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "welcome-2",
      role: "florencio",
      text: "Puedes hablarme de la persona, la ocasión, el estilo o el presupuesto.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [filters, setFilters] = useState<FlorencioFilters>({ keywords: [] });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<
    ReturnType<typeof rankFlorencioProducts>
  >([]);
  const [recommendationHistory, setRecommendationHistory] = useState<
    RecommendationRow[]
  >([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [account, setAccount] = useState<{
    full_name: string | null;
    phone: string | null;
    email: string | null;
  } | null>(null);

  const chatRef = useRef<HTMLDivElement | null>(null);

  const profileImage =
    settings?.["florencio_profile_image_url"] ||
    settings?.["florencio_intro_image_url"] ||
    "/img/florencio.png";

  const localSuggestions = useMemo(
    () =>
      rankFlorencioProducts(
        products,
        categories,
        { keywords: [] },
        4,
      ),
    [products, categories],
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;

    const loadAccount = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name,phone,email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setAccount(
        data
          ? {
              full_name: data.full_name ?? null,
              phone: data.phone ?? null,
              email: data.email ?? session.user.email ?? null,
            }
          : {
              full_name: null,
              phone: null,
              email: session.user.email ?? null,
            },
      );
    };

    const loadSession = async () => {
      setHistoryLoading(true);

      const { data } = await supabase
        .from("florencio_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const row = data as unknown as SessionRow;
        setSessionId(row.id);
        setMessages(
          Array.isArray(row.messages) && row.messages.length
            ? row.messages
            : messages,
        );
        setFilters(row.filters ?? { keywords: [] });

        const ranked = rankFlorencioProducts(
          products,
          categories,
          row.filters ?? { keywords: [] },
          4,
        );
        setRecommendations(
          ranked.length
            ? ranked
            : products.filter((p) => p.is_active).slice(0, 4),
        );
      }

      setHistoryLoading(false);
    };

    const loadHistory = async () => {
      const { data } = await supabase
        .from("florencio_recommendations")
        .select(
          "id,session_id,product_id,query_text,reason,rank,created_at",
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      setRecommendationHistory((data ?? []) as RecommendationRow[]);
    };

    const loadOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,order_number,total_cop,status,created_at,delivery_date,delivery_slot,address,city,items",
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      setOrders((data ?? []) as unknown as OrderRow[]);
    };

    void loadAccount();
    void loadSession();
    void loadHistory();
    void loadOrders();
    // The authenticated session is the dependency; current catalog changes are
    // reflected when recommendations are recomputed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  useEffect(() => {
    const el = chatRef.current;
    if (el && activeTab === "chat") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, activeTab]);

  const getNextRecommendations = (nextFilters: FlorencioFilters) => {
    const ranked = rankFlorencioProducts(
      products,
      categories,
      nextFilters,
      4,
    );
    return ranked.length
      ? ranked
      : products.filter((p) => p.is_active).slice(0, 4);
  };

  const persist = async (
    nextMessages: ChatMessage[],
    nextFilters: FlorencioFilters,
    nextRecommendations: ReturnType<typeof rankFlorencioProducts>,
    queryText: string,
  ) => {
    if (!session?.user.id) return;

    const payload = {
      user_id: session.user.id,
      title: queryText.slice(0, 80),
      messages: nextMessages.slice(-16),
      filters: nextFilters,
      recommendation_product_ids: nextRecommendations.map((p) => p.id),
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

    if (nextRecommendations.length > 0 && id) {
      await supabase.from("florencio_recommendations").upsert(
        nextRecommendations.map((product, index) => ({
          user_id: session.user.id,
          session_id: id,
          product_id: product.id,
          query_text: queryText,
          reason:
            product.matchReasons?.[0] ??
            "Coincide con tu búsqueda.",
          rank: index + 1,
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
        history: messages
          .slice(-8)
          .map((message) => ({
            role: message.role,
            text: message.text,
          })),
        currentFilters: filters,
      });

      const merged: FlorencioFilters = {
        recipient: result.filters.recipient ?? local.recipient ?? filters.recipient,
        occasion: result.filters.occasion ?? local.occasion ?? filters.occasion,
        style: result.filters.style ?? local.style ?? filters.style,
        color: result.filters.color ?? local.color ?? filters.color,
        budgetMax:
          result.filters.budgetMax ?? local.budgetMax ?? filters.budgetMax,
        keywords: Array.from(
          new Set([
            ...filters.keywords,
            ...local.keywords,
            ...(result.keywords ?? []),
            ...(result.filters.keywords ?? []),
          ]),
        ).slice(0, 20),
      };

      const nextRecommendations = getNextRecommendations(merged);
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "florencio",
        text:
          result.reply.length > 220
            ? result.reply.slice(0, 217) + "…"
            : result.reply,
        createdAt: new Date().toISOString(),
      };

      const finalMessages = [...nextMessages, assistantMessage];
      setFilters(merged);
      setRecommendations(nextRecommendations);
      setMessages(finalMessages);

      await persist(finalMessages, merged, nextRecommendations, text);

      const { data } = await supabase
        .from("florencio_recommendations")
        .select(
          "id,session_id,product_id,query_text,reason,rank,created_at",
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      setRecommendationHistory((data ?? []) as RecommendationRow[]);
    } catch {
      const merged: FlorencioFilters = {
        recipient: local.recipient ?? filters.recipient,
        occasion: local.occasion ?? filters.occasion,
        style: local.style ?? filters.style,
        color: local.color ?? filters.color,
        budgetMax: local.budgetMax ?? filters.budgetMax,
        keywords: Array.from(
          new Set([...filters.keywords, ...local.keywords]),
        ).slice(0, 20),
      };

      const nextRecommendations = getNextRecommendations(merged);
      const fallbackMessage: ChatMessage = {
        id: uid(),
        role: "florencio",
        text: "Perfecto. Entendí la idea y estoy cruzándola con el catálogo de Deluxury.",
        createdAt: new Date().toISOString(),
      };
      const finalMessages = [...nextMessages, fallbackMessage];

      setFilters(merged);
      setRecommendations(nextRecommendations);
      setMessages(finalMessages);

      try {
        await persist(finalMessages, merged, nextRecommendations, text);
      } catch (persistError) {
        console.warn("No se pudo guardar la sesión de Florencio.", persistError);
      }
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    add(product);

    const message: ChatMessage = {
      id: uid(),
      role: "florencio",
      text: `Listo. Añadí ${product.name} a tu carrito.`,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, message];
      void persist(next, filters, recommendations, product.name).catch(
        (error) => console.warn("No se pudo guardar el carrito en la sesión.", error),
      );
      return next;
    });
  };

  const tabClass = (tab: Tab) =>
    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
      activeTab === tab
        ? "bg-primary/10 text-foreground"
        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
    }`;

  if (!authReady) {
    return (
      <div className="flex min-h-[620px] items-center justify-center bg-white/70">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const needsAuth = activeTab !== "chat" && !session;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-primary/15 bg-white/80 shadow-[0_45px_110px_-58px_rgba(61,37,20,0.55)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(138,101,59,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(138,101,59,0.045)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative grid min-h-[760px] lg:grid-cols-[230px_minmax(0,1fr)_320px]">
        <aside className="border-b border-border/80 bg-[#fcf8f2]/90 p-5 backdrop-blur-xl lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <ProfileAvatar src={profileImage} size="md" />
            <div className="min-w-0">
              <p className="font-display text-2xl leading-none">Florencio</p>
              <p className="mt-1 text-[9px] tracking-[0.15em] text-muted-foreground uppercase">
                Asistente floral
              </p>
              <span className="mt-1.5 flex items-center gap-1.5 text-[9px] text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {session ? "En línea" : "Inicia sesión"}
              </span>
            </div>
          </div>

          <nav className="mt-8 space-y-1.5">
            <button type="button" onClick={() => setActiveTab("chat")} className={tabClass("chat")}>
              <MessageCircle className="h-4 w-4" />
              Conversación
            </button>
            <button type="button" onClick={() => setActiveTab("recommendations")} className={tabClass("recommendations")}>
              <Sparkles className="h-4 w-4" />
              Recomendaciones
              {!session && <LogIn className="ml-auto h-3.5 w-3.5 text-primary" />}
            </button>
            <button type="button" onClick={() => setActiveTab("account")} className={tabClass("account")}>
              <UserRound className="h-4 w-4" />
              Mi cuenta
            </button>
            <button type="button" onClick={() => setActiveTab("orders")} className={tabClass("orders")}>
              <Package className="h-4 w-4" />
              Mis pedidos
              {!session && <LogIn className="ml-auto h-3.5 w-3.5 text-primary" />}
            </button>
            <Link to="/cuenta" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-secondary/60">
              <HelpCircle className="h-4 w-4" />
              Centro de cuenta
            </Link>
          </nav>

          {session ? (
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-[9px] tracking-[0.16em] uppercase hover:border-primary"
            >
              Cerrar sesión
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[9px] tracking-[0.16em] text-primary-foreground uppercase"
            >
              <LogIn className="h-3.5 w-3.5" />
              Crear cuenta / entrar
            </button>
          )}
        </aside>

        <main className="flex min-h-[700px] min-w-0 flex-col bg-white/65 backdrop-blur-xl">
          {activeTab === "chat" ? (
            <>
              <header className="flex shrink-0 items-center justify-between border-b border-border/80 px-5 py-4 md:px-7">
                <div className="flex items-center gap-3">
                  <ProfileAvatar src={profileImage} size="sm" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-xl">Florencio</p>
                      <span className="text-[8px] tracking-[0.14em] text-primary uppercase">
                        IA floral
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      Recomendaciones personalizadas del catálogo Deluxury
                    </p>
                  </div>
                </div>
                <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[8px] tracking-[0.12em] text-muted-foreground uppercase sm:flex">
                  <span className={`h-1.5 w-1.5 rounded-full ${session ? "bg-emerald-500" : "bg-primary"}`} />
                  {session ? "Sesión activa" : "Solo lectura"}
                </div>
              </header>

              <div ref={chatRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7">
                <div className="mx-auto max-w-2xl space-y-5">
                  {!session && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("account")}
                      className="w-full rounded-2xl border border-primary/15 bg-primary/[0.045] p-4 text-left text-sm leading-relaxed"
                    >
                      <span className="font-medium">
                        Inicia sesión para usar Florencio y guardar tu historial.
                      </span>{" "}
                      Tu conversación, recomendaciones y pedidos quedarán asociados a tu cuenta.
                    </button>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "florencio" ? (
                        <div className="flex max-w-[90%] items-start gap-3">
                          <ProfileAvatar src={profileImage} size="sm" />
                          <div>
                            <div className="rounded-2xl rounded-tl-md border border-border/80 bg-[#f6eee5] px-4 py-3.5 text-sm leading-relaxed shadow-sm">
                              {message.text}
                            </div>
                            <p className="mt-1.5 px-1 text-[8px] text-muted-foreground">
                              Florencio
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[82%]">
                          <div className="rounded-2xl rounded-tr-md bg-primary px-4 py-3.5 text-sm leading-relaxed text-primary-foreground shadow-[0_14px_30px_-22px_rgba(110,53,55,0.55)]">
                            {message.text}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex items-start gap-3">
                      <ProfileAvatar src={profileImage} size="sm" />
                      <div className="rounded-2xl rounded-tl-md border border-border/80 bg-[#f6eee5] px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <footer className="shrink-0 border-t border-border/80 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => void send(starter)}
                      className="shrink-0 rounded-full border border-border bg-background px-3.5 py-2 text-[9px] transition hover:border-primary/45 hover:text-primary"
                    >
                      {starter}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send();
                  }}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-background p-1.5 shadow-sm focus-within:border-primary/50"
                >
                  <MessageCircle className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      session
                        ? "Escribe tu mensaje…"
                        : "Inicia sesión para hablar con Florencio…"
                    }
                    disabled={!session || loading}
                    className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!session || !input.trim() || loading}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </footer>
            </>
          ) : needsAuth ? (
            <div className="flex min-h-[700px] items-center justify-center p-5 sm:p-8">
              <AuthGate
                profileImage={profileImage}
                onSignedIn={() => setActiveTab("chat")}
              />
            </div>
          ) : activeTab === "account" ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              <p className="eyebrow">Cuenta</p>
              <h2 className="mt-3 font-display text-4xl">Tu espacio Deluxury.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Aquí encontrarás los datos que utilizamos para personalizar tu experiencia y mantener tus pedidos asociados a ti.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ["Nombre", account?.full_name || "Aún no configurado"],
                  ["Correo", account?.email || session?.user.email || "—"],
                  ["Teléfono", account?.phone || "Aún no configurado"],
                  ["Estado", "Cuenta activa"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-border bg-white/70 p-5">
                    <p className="text-[9px] tracking-[0.18em] text-primary uppercase">{label}</p>
                    <p className="mt-2 font-display text-xl">{value}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/cuenta"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[10px] tracking-[0.18em] text-primary-foreground uppercase"
              >
                Gestionar mi cuenta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : activeTab === "orders" ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              <p className="eyebrow">Historial</p>
              <h2 className="mt-3 font-display text-4xl">Mis pedidos.</h2>

              {orders.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white/60 p-8">
                  <Package className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-display text-2xl">Todavía no tienes pedidos.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cuando hagas una compra con tu cuenta, el estado aparecerá aquí.
                  </p>
                </div>
              ) : (
                <div className="mt-8 space-y-4">
                  {orders.map((order) => {
                    const currentIndex = STATUS_STEPS.indexOf(order.status);
                    return (
                      <article key={order.id} className="rounded-2xl border border-border bg-white/70 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="font-display text-xl">{order.order_number}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("es-CO")} · {order.city}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[9px] tracking-[0.15em] text-primary uppercase">
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-5 flex items-center gap-1">
                          {STATUS_STEPS.map((step, index) => (
                            <div key={step} className="flex min-w-0 flex-1 items-center gap-1">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  order.status === "cancelado"
                                    ? "bg-primary"
                                    : index <= currentIndex
                                      ? "bg-primary"
                                      : "bg-border"
                                }`}
                              />
                              {index < STATUS_STEPS.length - 1 && (
                                <span
                                  className={`h-px min-w-0 flex-1 ${
                                    index < currentIndex ? "bg-primary/60" : "bg-border"
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-[8px] tracking-[0.15em] text-muted-foreground uppercase">Total</p>
                            <p className="mt-1 text-primary">
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: "COP",
                                maximumFractionDigits: 0,
                              }).format(Number(order.total_cop))}
                            </p>
                          </div>
                          <div>
                            <p className="text-[8px] tracking-[0.15em] text-muted-foreground uppercase">Entrega</p>
                            <p className="mt-1">{order.delivery_date || "Por coordinar"}</p>
                          </div>
                          <div>
                            <p className="text-[8px] tracking-[0.15em] text-muted-foreground uppercase">Dirección</p>
                            <p className="mt-1 truncate">{order.address}</p>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-border pt-4">
                          {(order.items ?? []).slice(0, 4).map((item) => (
                            <div key={item.product_id} className="flex items-center gap-3 py-2">
                              <img
                                src={item.image || "/img/prod-01.jpg"}
                                alt={item.name}
                                className="h-10 w-8 rounded object-cover"
                              />
                              <p className="flex-1 text-sm">{item.qty} × {item.name}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              <p className="eyebrow">Historial inteligente</p>
              <h2 className="mt-3 font-display text-4xl">Mis recomendaciones.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Aquí guardamos las piezas que Florencio te mostró durante tus conversaciones.
              </p>

              {historyLoading ? (
                <div className="mt-10 text-sm text-muted-foreground">Cargando tu historial…</div>
              ) : recommendationHistory.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-primary/20 bg-white/60 p-8">
                  <Heart className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-display text-2xl">Aún no hay recomendaciones guardadas.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[9px] tracking-[0.16em] text-primary-foreground uppercase"
                  >
                    Volver a conversar
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {recommendationHistory.map((event) => {
                    const product = products.find((item) => item.id === event.product_id);
                    if (!product) return null;

                    return (
                      <ProductCard
                        key={event.id}
                        product={{
                          ...product,
                          matchReasons: event.reason ? [event.reason] : [],
                        }}
                        profileImage={profileImage}
                        onAdd={addProduct}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="min-w-0 border-t border-border/80 bg-[#fbf7f0]/80 p-4 backdrop-blur-xl lg:border-l lg:border-t-0 lg:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[9px] tracking-[0.18em] text-primary uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Selección de Florencio
              </div>
              <h3 className="mt-2 font-display text-2xl leading-tight">
                Recomendaciones
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {session
                  ? "Se ajustan a lo que vas contando."
                  : "Una vista previa del catálogo."}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(recommendations.length > 0 ? recommendations : localSuggestions)
              .slice(0, 3)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  profileImage={profileImage}
                  onAdd={addProduct}
                />
              ))}
          </div>

          {!session && (
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-primary/15 bg-white/70 p-4 text-left"
            >
              <LogIn className="h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="block text-[9px] tracking-[0.14em] text-primary uppercase">
                  Guarda tu experiencia
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Inicia sesión para conservar recomendaciones y pedidos.
                </span>
              </span>
            </button>
          )}

          {session && activeTab === "chat" && recommendations.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-primary/15 bg-white/60 p-4 text-xs text-muted-foreground">
              Cuéntame qué buscas y ajustaré esta selección.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
