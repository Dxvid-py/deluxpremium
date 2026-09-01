import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, MapPin, Plus, Star, Trash2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { settingsQuery, type CustomerAddress, type Order, type Profile } from "@/lib/queries";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta · Floristería Deluxe Premium" },
      {
        name: "description",
        content:
          "Gestiona tus datos, direcciones de entrega y consulta el historial de tus pedidos de flores premium.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Mi cuenta · Deluxe Premium" },
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
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <AuthCard />;

  return (
    <div className="pt-28 pb-24 md:pt-36">
      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">{session.user.email}</p>
            <h1 className="mt-3 font-display text-4xl md:text-5xl">
              {t("account.title1")} <span className="text-primary">{t("account.title2")}</span>
            </h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="press inline-flex items-center gap-2 border border-border px-6 py-3 text-[10px] tracking-[0.24em] uppercase hover:border-primary"
          >
            <LogOut className="h-3.5 w-3.5" /> {t("auth.signOut")}
          </button>
        </div>

        <ProfileCard session={session} />
        <AddressesCard session={session} />
        <OrdersCard session={session} />
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
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
        toast.success(t("account.saved"));
      }
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 pt-28 pb-20">
      <form onSubmit={submit} className="w-full max-w-md border border-border p-8 md:p-10">
        <p className="eyebrow">Deluxe Premium</p>
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
    <section className="reveal mt-14 border border-border p-6 md:p-8">
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
    if (error) return toast.error(error.message);
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
  const { t } = useI18n();
  const { currency } = useStore();
  const { data: settings } = useQuery(settingsQuery);
  const trm = Number(settings?.["trm_cop_usd"] ?? 3950);
  const uid = session.user.id;

  const { data: orders } = useQuery({
    queryKey: ["my-orders", uid],
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

  return (
    <Section title={t("account.orders")}>
      {(orders ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("account.noOrders")}</p>
      ) : (
        <div className="space-y-4">
          {(orders ?? []).map((o) => (
            <div key={o.id} className="border border-border/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-lg">{o.order_number}</p>
                <span className="text-[10px] tracking-[0.24em] text-primary uppercase">
                  {o.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString()} · {o.address}, {o.city}
              </p>
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {(o.items ?? []).map((it, i) => (
                  <li key={i}>
                    {it.qty} × {it.name}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                {t("cart.total")}: {formatMoney(o.total_cop, currency, trm)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
