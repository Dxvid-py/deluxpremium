/**
 * Cliente real de Supabase.
 *
 * Antes esto era un mock que guardaba todo en localStorage (ver
 * `@/lib/local-db`, que ya no se usa y se puede borrar cuando quieras).
 * Como ese mock imitaba exactamente la forma de la API de supabase-js
 * (from().select().eq()... , auth.signInWithPassword, storage.from()...),
 * el resto de la app no tuvo que cambiar: sólo este archivo.
 *
 * La anon key es pública por diseño (está pensada para ir en el cliente) y
 * el acceso real a los datos lo controla Row Level Security en Postgres —
 * ver el SQL que crea las políticas de cada tabla.
 */
import { createClient, type Session as SupabaseSession, type User as SupabaseUser } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] ?? "https://bepdkgzooupycfgovtbf.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcGRrZ3pvb3VweWNmZ292dGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzM4MzAsImV4cCI6MjEwNDgwOTgzMH0.PAoNkcut5dgDh_IiclsK7nJMFqiM2dd5RNYRA0UrnP8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Session = SupabaseSession;
export type User = SupabaseUser;

export const storage = supabase.storage;
