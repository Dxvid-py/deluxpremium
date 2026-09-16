create table if not exists public.florencio_knowledge (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.florencio_knowledge enable row level security;

drop policy if exists "Public can read active Florencio knowledge"
on public.florencio_knowledge;

create policy "Public can read active Florencio knowledge"
on public.florencio_knowledge
for select
to anon, authenticated
using (is_active = true);

revoke all on table public.florencio_knowledge from anon, authenticated;
grant select on table public.florencio_knowledge to anon, authenticated;

insert into public.florencio_knowledge (key, value, is_active)
values
  ('business_name', 'Deluxury Floristería'),
  ('assistant_name', 'Florencio'),
  ('business_type', 'Floristería premium'),
  ('country', 'Colombia'),
  ('truth_policy', 'Florencio debe decir la verdad. No debe inventar precios, productos, stock, disponibilidad, horarios, direcciones, descuentos, políticas o servicios. Si un dato no está disponible, debe decirlo.')
on conflict (key) do nothing;

comment on table public.florencio_knowledge is
'Información oficial que Florencio puede usar para responder preguntas sobre Deluxury. Editar los valores desde Supabase Table Editor.';
