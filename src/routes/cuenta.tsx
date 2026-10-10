import { createFileRoute, Link } from "@tanstack/react-router";
import OrderCard, { type OrderCardData } from "@/components/OrderCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, MapPin, Package, Plus, Settings2, Star, Trash2, Volume2, VolumeX, Cookie } from "lucide-react";
import type { Session } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { settingsQuery, type CustomerAddress, type Order, type Profile } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";
import { getFlorencioAudioEnabled, setFlorencioAudioEnabled } from "@/lib/florencio-voice";

export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta · Floristería Deluxury" },
      {
        name: "description",
        content:
          "Gestiona tus datos, direcciones de entrega y consulta el historial de tus pedidos de flores premium.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Mi cuenta · Deluxury" },
      {
        property: "og:description",
        content: "Tus datos, direcciones guardadas e historial de compras del atelier.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Cuenta,
});

const input =
  "w-full border border-border bg-transparent px-4 py-3 text-sm outline-none transition-colors focus:border-primary";
const label = "block text-[10px] tracking-[0.24em] uppercase text-muted-foreground";

function Cuenta() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useReveal();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const next = new URLSearchParams(window.location.search).get("next");
    if (next === "checkout") window.location.assign("/checkout");
  }, [session]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <AuthCard />;

  return <AccountHome session={session} />;
}

function AccountHome({ session }: { session: Session }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"pedidos" | "configuracion">("pedidos");

  useEffect(() => {
    if (window.location.hash === "#configuracion") setTab("configuracion");
  }, []);

  const go = (next: "pedidos" | "configuracion") => {
    setTab(next);
    try { window.history.replaceState(null, "", `#${next}`); } catch { /* ignore */ }
  };

  const name = (session.user.user_metadata as { full_name?: string } | undefined)?.full_name || session.user.email || "";
  const initial = name.trim().charAt(0).toUpperCase() || "D";

  const tabs = [
    { key: "pedidos" as const, label: "Mis pedidos", icon: Package },
    { key: "configuracion" as const, label: "Configuración", icon: Settings2 },
  ];

  return (
    <div className="pt-28 pb-24 md:pt-36">
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-[#f3e7d3] font-display text-2xl text-primary">{initial}</span>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">{t("account.title1")} {t("account.title2")}</p>
              <h1 className="truncate font-display text-3xl md:text-4xl">{name}</h1>
              <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="press inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-primary"
          >
            <LogOut className="h-3.5 w-3.5" /> {t("auth.signOut")}
          </button>
        </div>

        <nav className="mt-8 flex gap-1 rounded-full border border-border bg-white/70 p-1" role="tablist" aria-label="Secciones de tu cuenta">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => go(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-[10px] tracking-[0.18em] uppercase transition ${
                tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </nav>

        {tab === "pedidos" ? (
          <OrdersCard session={session} />
        ) : (
          <div>
            <ProfileCard session={session} />
            <PreferencesCard />
            <AddressesCard session={session} />
          </div>
        )}
      </div>
    </div>
  );
}

function AuthCard() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const completeAuth = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next === "checkout") window.location.assign("/checkout");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else completeAuth();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else if (data.user) {
        await supabase
          .from("profiles")
          .insert({ user_id: data.user.id, full_name: name, email })
          .then(() => undefined);
        if (data.session) completeAuth();
        else toast.success(t("account.saved"));
      }
    }
    setBusy(false);
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    const next = new URLSearchParams(window.location.search).get("next");
    const query = next === "checkout" ? "?next=checkout" : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/cuenta${query}` },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 pt-28 pb-20">
      <form onSubmit={submit} className="w-full max-w-md border border-border p-8 md:p-10">
        <p className="eyebrow">Deluxury</p>
        <h1 className="mt-3 font-display text-3xl">
          {mode === "in" ? t("auth.signIn") : t("auth.signUp")}
        </h1>

        <div className="mt-8 space-y-5">
          {mode === "up" && (
            <div>
              <span className={label}>{t("checkout.name")}</span>
              <input
                className={`${input} mt-2`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <span className={label}>{t("auth.email")}</span>
            <input
              type="email"
              required
              className={`${input} mt-2`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <span className={label}>{t("auth.password")}</span>
            <input
              type="password"
              required
              minLength={6}
              className={`${input} mt-2`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="press mt-8 w-full bg-primary px-7 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase disabled:opacity-60"
        >
          {busy ? "…" : mode === "in" ? t("auth.signIn") : t("auth.signUp")}
        </button>

        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={busy}
          className="press mt-3 flex w-full items-center justify-center gap-2 border border-border bg-white px-7 py-4 text-[10px] tracking-[0.22em] uppercase transition-colors hover:border-primary disabled:opacity-60"
        >
          <span className="font-medium normal-case">G</span> Continuar con Google
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-6 w-full text-center text-[11px] tracking-[0.18em] text-muted-foreground uppercase hover:text-primary"
        >
          {mode === "in" ? t("auth.noAccount") : t("auth.haveAccount")}
        </button>

        <Link
          to="/"
          className="mt-6 block text-center text-[10px] tracking-[0.24em] text-muted-foreground uppercase hover:text-primary"
        >
          {t("cta.back")}
        </Link>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-white/70 p-6 md:p-8">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ProfileCard({ session }: { session: Session }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const uid = session.user.id;
  const { data } = useQuery({
    queryKey: ["profile", uid],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Profile | null;
    },
  });

  const [form, setForm] = useState({ full_name: "", phone: "", email: "" });
  useEffect(() => {
    setForm({
      full_name: data?.full_name ?? "",
      phone: data?.phone ?? "",
      email: data?.email ?? session.user.email ?? "",
    });
  }, [data, session.user.email]);

  const save = async () => {
    const payload = { user_id: uid, ...form };
    const { error } = data?.id
      ? await supabase.from("profiles").update(form).eq("id", data.id)
      : await supabase.from("profiles").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(t("account.saved"));
      qc.invalidateQueries({ queryKey: ["profile", uid] });
    }
  };

  return (
    <Section title={t("account.profile")}>
      <div className="grid gap-5 sm:grid-cols-3">
        {(
          [
            ["full_name", t("checkout.name")],
            ["phone", t("checkout.phone")],
            ["email", t("checkout.email")],
          ] as const
        ).map(([key, lbl]) => (
          <div key={key}>
            <span className={label}>{lbl}</span>
            <input
              className={`${input} mt-2`}
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <button
        onClick={save}
        className="press mt-6 bg-primary px-7 py-3.5 text-[10px] tracking-[0.26em] text-primary-foreground uppercase"
      >
        {t("cta.save")}
      </button>
    </Section>
  );
}

function PreferencesCard() {
  const { lang } = useI18n();
  const [soundEnabled, setSoundEnabled] = useState(getFlorencioAudioEnabled());

  useEffect(() => {
    const onAudioChanged = (event: Event) => {
      const enabled = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled);
      setSoundEnabled(enabled);
    };
    window.addEventListener("deluxury:audio-changed", onAudioChanged);
    return () => window.removeEventListener("deluxury:audio-changed", onAudioChanged);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setFlorencioAudioEnabled(next);
    setSoundEnabled(next);
  };

  const openCookieSettings = () => {
    window.dispatchEvent(new CustomEvent("deluxury:open-cookie-settings"));
  };

  const t =
    lang === "en"
      ? {
          title: "Preferences",
          soundTitle: "Site sound",
          soundBody: "Florencio's voice and the intro music.",
          soundOn: "On",
          soundOff: "Off",
          cookiesTitle: "Cookie preferences",
          cookiesBody: "Review or change what optional storage is allowed.",
          cookiesCta: "Manage",
        }
      : {
          title: "Preferencias",
          soundTitle: "Sonido del sitio",
          soundBody: "La voz de Florencio y la música de la intro.",
          soundOn: "Activado",
          soundOff: "Desactivado",
          cookiesTitle: "Preferencias de cookies",
          cookiesBody: "Revisa o cambia qué almacenamiento opcional está permitido.",
          cookiesCta: "Gestionar",
        };

  return (
    <Section title={t.title}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 border border-border/70 p-5">
          <div>
            <p className="text-sm font-medium">{t.soundTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.soundBody}</p>
          </div>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundEnabled}
            className="press inline-flex shrink-0 items-center gap-2 border border-border px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-primary"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {soundEnabled ? t.soundOn : t.soundOff}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 border border-border/70 p-5">
          <div>
            <p className="text-sm font-medium">{t.cookiesTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.cookiesBody}</p>
          </div>
          <button
            type="button"
            onClick={openCookieSettings}
            className="press inline-flex shrink-0 items-center gap-2 border border-border px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase hover:border-primary"
          >
            <Cookie className="h-3.5 w-3.5" />
            {t.cookiesCta}
          </button>
        </div>
      </div>
    </Section>
  );
}

const emptyAddress = {
  label: "Casa",
  recipient_name: "",
  recipient_phone: "",
  address: "",
  city: "Barranquilla",
  notes: "",
};

function AddressesCard({ session }: { session: Session }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const uid = session.user.id;
  const [draft, setDraft] = useState<typeof emptyAddress | null>(null);

  const { data: addresses } = useQuery({
    queryKey: ["addresses", uid],
    queryFn: async (): Promise<CustomerAddress[]> => {
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", uid)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CustomerAddress[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["addresses", uid] });

  const save = async () => {
    if (!draft?.address) return;
    const { error } = await supabase.from("customer_addresses").insert({ user_id: uid, ...draft });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft(null);
    toast.success(t("account.saved"));
    refresh();
  };

  const remove = async (id: string) => {
    await supabase.from("customer_addresses").delete().eq("id", id);
    refresh();
  };

  const setDefault = async (id: string) => {
    await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", uid);
    await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id);
    refresh();
  };

  return (
    <Section title={t("account.addresses")}>
      <div className="space-y-4">
        {(addresses ?? []).map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-4 border border-border/70 p-5"
          >
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm">
                  {a.label}
                  {a.is_default && (
                    <span className="ml-3 text-[9px] tracking-[0.24em] text-primary uppercase">
                      {t("account.default")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.address}, {a.city}
                </p>
                {a.recipient_name && (
                  <p className="text-xs text-muted-foreground">
                    {a.recipient_name} · {a.recipient_phone}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!a.is_default && (
                <button
                  onClick={() => setDefault(a.id)}
                  title={t("account.setDefault")}
                  className="press border border-border p-2.5 hover:border-primary"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => remove(a.id)}
                title={t("cta.delete")}
                className="press border border-border p-2.5 hover:border-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {draft ? (
        <div className="mt-6 border border-primary/40 p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ["label", t("account.label")],
                ["address", t("checkout.address")],
                ["city", t("checkout.city")],
                ["recipient_name", t("checkout.recipient")],
                ["recipient_phone", t("checkout.phone")],
                ["notes", t("checkout.notes")],
              ] as const
            ).map(([key, lbl]) => (
              <div key={key}>
                <span className={label}>{lbl}</span>
                <input
                  className={`${input} mt-2`}
                  value={draft[key]}
                  onChange={(e) => setDraft((p) => (p ? { ...p, [key]: e.target.value } : p))}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={save}
              className="press bg-primary px-7 py-3.5 text-[10px] tracking-[0.26em] text-primary-foreground uppercase"
            >
              {t("cta.save")}
            </button>
            <button
              onClick={() => setDraft(null)}
              className="press border border-border px-7 py-3.5 text-[10px] tracking-[0.26em] uppercase"
            >
              {t("cta.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setDraft({ ...emptyAddress })}
          className="press mt-6 inline-flex items-center gap-2 border border-border px-6 py-3 text-[10px] tracking-[0.24em] uppercase hover:border-primary"
        >
          <Plus className="h-3.5 w-3.5" /> {t("cta.add")}
        </button>
      )}
    </Section>
  );
}

function OrdersCard({ session }: { session: Session }) {
  const { data: settings } = useQuery(settingsQuery);
  const uid = session.user.id;

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["my-orders", uid],
    refetchInterval: 30_000,
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  if (isLoading) {
    return (
      <div className="mt-10 flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-primary/25 bg-white/60 p-10 text-center">
        <Package className="mx-auto h-6 w-6 text-primary" />
        <p className="mt-4 font-display text-2xl">Aún no tienes pedidos</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Cuando hagas tu primera compra, aquí podrás seguir su estado paso a paso.</p>
        <Link to="/catalogo" className="mt-6 inline-flex rounded-full bg-primary px-7 py-3.5 text-[10px] tracking-[0.2em] text-primary-foreground uppercase">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o as unknown as OrderCardData} whatsapp={settings?.["whatsapp_number"]} onChanged={() => void refetch()} />
      ))}
    </div>
  );
}
