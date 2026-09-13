-- Políticas necesarias para que el panel de administración pueda leer
-- perfiles y direcciones de clientes sin exponer esos datos públicamente.
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.profiles enable row level security;
alter table public.customer_addresses enable row level security;

drop policy if exists "admins_can_read_profiles" on public.profiles;
create policy "admins_can_read_profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "admins_can_read_customer_addresses" on public.customer_addresses;
create policy "admins_can_read_customer_addresses"
on public.customer_addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);
