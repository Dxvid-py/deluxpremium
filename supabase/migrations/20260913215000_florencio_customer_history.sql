-- Florencio: historial de conversaciones y recomendaciones por cliente
-- Ejecuta este archivo como una nueva migration y luego:
-- npx supabase db push

create table if not exists public.florencio_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  messages jsonb not null default '[]'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  recommendation_product_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists florencio_sessions_user_updated_idx
  on public.florencio_sessions (user_id, updated_at desc);

create table if not exists public.florencio_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.florencio_sessions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  query_text text,
  reason text,
  rank integer not null default 1,
  created_at timestamptz not null default now(),
  unique (session_id, product_id)
);

create index if not exists florencio_recommendations_user_created_idx
  on public.florencio_recommendations (user_id, created_at desc);

create index if not exists florencio_recommendations_product_idx
  on public.florencio_recommendations (product_id);

create or replace function public.florencio_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists florencio_sessions_updated_at
  on public.florencio_sessions;

create trigger florencio_sessions_updated_at
before update on public.florencio_sessions
for each row
execute function public.florencio_touch_updated_at();

alter table public.florencio_sessions enable row level security;
alter table public.florencio_recommendations enable row level security;

revoke all on public.florencio_sessions from anon;
revoke all on public.florencio_recommendations from anon;

grant select, insert, update, delete
  on public.florencio_sessions to authenticated;

grant select, insert, update, delete
  on public.florencio_recommendations to authenticated;

drop policy if exists "Users can view their own Florencio sessions"
  on public.florencio_sessions;
create policy "Users can view their own Florencio sessions"
  on public.florencio_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own Florencio sessions"
  on public.florencio_sessions;
create policy "Users can create their own Florencio sessions"
  on public.florencio_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Florencio sessions"
  on public.florencio_sessions;
create policy "Users can update their own Florencio sessions"
  on public.florencio_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Florencio sessions"
  on public.florencio_sessions;
create policy "Users can delete their own Florencio sessions"
  on public.florencio_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own Florencio recommendations"
  on public.florencio_recommendations;
create policy "Users can view their own Florencio recommendations"
  on public.florencio_recommendations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own Florencio recommendations"
  on public.florencio_recommendations;
create policy "Users can create their own Florencio recommendations"
  on public.florencio_recommendations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Florencio recommendations"
  on public.florencio_recommendations;
create policy "Users can update their own Florencio recommendations"
  on public.florencio_recommendations
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Florencio recommendations"
  on public.florencio_recommendations;
create policy "Users can delete their own Florencio recommendations"
  on public.florencio_recommendations
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
