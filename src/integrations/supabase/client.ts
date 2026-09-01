/**
 * Cliente de datos LOCAL con la misma superficie que se usaba antes.
 *
 * No hay servidor: cada tabla vive en localStorage (ver `@/lib/local-db`).
 * El objeto `supabase` que se exporta imita el subconjunto de la API que la
 * aplicación necesita (consultas encadenadas, mutaciones y sesión), de modo
 * que las pantallas no tuvieron que reescribirse.
 */
import {
  ADMIN_EMAIL,
  db,
  persist,
  readSession,
  uid,
  writeSession,
  type LocalSession,
  type Row,
  type TableName,
} from "@/lib/local-db";

export type Session = LocalSession;
export type User = LocalSession["user"];

type Result<T> = { data: T; error: { message: string } | null };

const wait = () => new Promise<void>((r) => setTimeout(r, 10));

function matches(row: Row, filters: [string, unknown][], ins: [string, unknown[]][]) {
  return (
    filters.every(([k, v]) => row[k] === v) &&
    ins.every(([k, list]) => list.includes(row[k] as never))
  );
}

class Query implements PromiseLike<Result<Row[] | Row | null>> {
  private filters: [string, unknown][] = [];
  private ins: [string, unknown[]][] = [];
  private sorts: { key: string; asc: boolean }[] = [];
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private single: false | "one" | "maybe" = false;

  constructor(private table: TableName) {}

  select(_cols?: string) {
    if (this.mode === "select") this.mode = "select";
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.ins.push([key, values]);
    return this;
  }
  order(key: string, opts?: { ascending?: boolean }) {
    this.sorts.push({ key, asc: opts?.ascending !== false });
    return this;
  }
  limit(_n: number) {
    return this;
  }
  maybeSingle() {
    this.single = "maybe";
    return this;
  }
  insert(values: Row | Row[]) {
    this.mode = "insert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  update(values: Row) {
    this.mode = "update";
    this.payload = [values];
    return this;
  }
  upsert(values: Row | Row[]) {
    this.mode = "upsert";
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }

  private run(): Result<Row[] | Row | null> {
    const store = db();
    const rows = store[this.table];
    const now = new Date().toISOString();

    if (this.mode === "insert" || this.mode === "upsert") {
      const created: Row[] = [];
      for (const value of this.payload) {
        const key = this.table === "site_settings" ? "key" : "id";
        const identifier = value[key];
        const existing =
          this.mode === "upsert" && identifier != null
            ? rows.find((r) => r[key] === identifier)
            : undefined;
        if (existing) {
          Object.assign(existing, value, { updated_at: now });
          created.push(existing);
        } else {
          const row: Row = {
            ...(this.table === "site_settings" ? {} : { id: uid() }),
            created_at: now,
            updated_at: now,
            ...value,
          };
          if (this.table === "orders" && !row["order_number"]) {
            row["order_number"] =
              `FDP-${now.slice(2, 4)}${now.slice(5, 7)}${now.slice(8, 10)}-` +
              Math.random().toString(36).slice(2, 7).toUpperCase();
          }
          if (this.table === "orders" && !row["status"]) row["status"] = "nuevo";
          rows.unshift(row);
          created.push(row);
        }
      }
      persist();
      return { data: this.single ? (created[0] ?? null) : created, error: null };
    }

    const selected = rows.filter((r) => matches(r, this.filters, this.ins));

    if (this.mode === "update") {
      const patch = this.payload[0] ?? {};
      selected.forEach((r) => Object.assign(r, patch, { updated_at: now }));
      persist();
      return { data: this.single ? (selected[0] ?? null) : selected, error: null };
    }

    if (this.mode === "delete") {
      store[this.table] = rows.filter((r) => !selected.includes(r));
      persist();
      return { data: [], error: null };
    }

    const sorted = [...selected].sort((a, b) => {
      for (const s of this.sorts) {
        const av = a[s.key];
        const bv = b[s.key];
        if (av === bv) continue;
        const cmp = (av as number) > (bv as number) ? 1 : -1;
        return s.asc ? cmp : -cmp;
      }
      return 0;
    });

    if (this.single) {
      const first = sorted[0] ?? null;
      if (!first && this.single === "one") {
        return { data: null, error: { message: "No se encontró el registro" } };
      }
      return { data: first, error: null };
    }
    return { data: sorted, error: null };
  }

  then<TResult1 = Result<Row[] | Row | null>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<Row[] | Row | null>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return wait()
      .then(() => this.run())
      .then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

/** Igual que `Query` pero `single()` devuelve la fila creada/encontrada. */
class SingleAwareQuery extends Query {
  single() {
    // @ts-expect-error acceso controlado a la propiedad privada del padre
    this.single_ = true;
    return this;
  }
}

type Listener = (event: string, session: Session | null) => void;
const listeners = new Set<Listener>();

function emit(session: Session | null) {
  listeners.forEach((l) => l(session ? "SIGNED_IN" : "SIGNED_OUT", session));
}

function findUser(email: string) {
  return db().auth_users.find(
    (u) => String(u["email"]).toLowerCase() === email.trim().toLowerCase(),
  );
}

export const supabase = {
  from(table: TableName) {
    return new Query(table) as Query & { single: () => Query };
  },
  auth: {
    async getSession(): Promise<{ data: { session: Session | null } }> {
      await wait();
      return { data: { session: readSession() } };
    },
    async getUser(): Promise<{ data: { user: User | null } }> {
      await wait();
      return { data: { user: readSession()?.user ?? null } };
    },
    onAuthStateChange(cb: Listener) {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      await wait();
      const user = findUser(email);
      if (!user || user["password"] !== password) {
        return { data: { user: null }, error: { message: "Correo o contraseña incorrectos" } };
      }
      const session: Session = { user: { id: String(user["id"]), email: String(user["email"]) } };
      writeSession(session);
      emit(session);
      return { data: { user: session.user }, error: null };
    },
    async signUp({ email, password }: { email: string; password: string; options?: unknown }) {
      await wait();
      if (findUser(email)) {
        return { data: { user: null }, error: { message: "Ese correo ya tiene cuenta" } };
      }
      const store = db();
      const id = uid();
      store.auth_users.push({
        id,
        email: email.trim().toLowerCase(),
        password,
        created_at: new Date().toISOString(),
      });
      if (email.trim().toLowerCase() === ADMIN_EMAIL) {
        store.user_roles.push({ id: uid(), user_id: id, role: "admin" });
      }
      persist();
      const session: Session = { user: { id, email: email.trim().toLowerCase() } };
      writeSession(session);
      emit(session);
      return { data: { user: session.user }, error: null };
    },
    async signOut() {
      await wait();
      writeSession(null);
      emit(null);
      return { error: null };
    },
  },
};

export type { Row };
export { SingleAwareQuery };
