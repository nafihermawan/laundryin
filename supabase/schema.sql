create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'cashier',
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'cashier';
alter table public.profiles
  add column if not exists phone text;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_select_all_authenticated" on public.profiles;
create policy "profiles_select_all_authenticated"
on public.profiles
for select
to authenticated
using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'cashier',
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(coalesce(new.raw_user_meta_data->>'phone', ''), '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'kg',
  base_price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  customer_id uuid references public.customers (id),
  status text not null default 'received',
  received_at timestamptz not null default now(),
  due_at timestamptz,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists orders_order_no_key on public.orders (order_no);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  service_id uuid references public.services (id),
  service_name text not null,
  qty numeric(10,2) not null default 1,
  unit text not null default 'kg',
  unit_price numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  paid_at timestamptz,
  amount numeric(12,2) not null default 0,
  method text not null default 'cash',
  status text not null default 'paid',
  received_by uuid references auth.users (id),
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.payments
  alter column paid_at drop not null;
alter table public.payments
  alter column paid_at drop default;

alter table public.payments drop constraint if exists payments_paidat_status_check;
alter table public.payments
  add constraint payments_paidat_status_check
  check (
    (status = 'paid' and paid_at is not null) or
    (status = 'pending' and paid_at is null)
  );

alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.enforce_order_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  max_back interval := interval '2 hours';
  max_future interval := interval '5 minutes';
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not public.is_admin() then
      if new.received_at < now_ts - max_back then
        raise exception 'Tanggal masuk terlalu mundur';
      end if;
      if new.received_at > now_ts + max_future then
        raise exception 'Tanggal masuk terlalu maju';
      end if;
    end if;

    if new.due_at is not null and new.due_at < new.received_at then
      raise exception 'Estimasi tidak boleh sebelum tanggal masuk';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if not public.is_admin() then
      if new.received_at is distinct from old.received_at then
        raise exception 'Tidak diizinkan mengubah tanggal masuk';
      end if;
      if new.due_at is distinct from old.due_at then
        raise exception 'Tidak diizinkan mengubah tanggal estimasi';
      end if;
    end if;

    if new.due_at is not null and new.due_at < new.received_at then
      raise exception 'Estimasi tidak boleh sebelum tanggal masuk';
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_timestamps on public.orders;
create trigger orders_enforce_timestamps
before insert or update on public.orders
for each row execute procedure public.enforce_order_timestamps();

create or replace function public.enforce_payment_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamptz := now();
  max_back interval := interval '5 minutes';
  max_future interval := interval '5 minutes';
  order_received timestamptz;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.status = 'paid' then
    if new.paid_at is null then
      raise exception 'paid_at wajib diisi untuk status paid';
    end if;

    select o.received_at into order_received from public.orders o where o.id = new.order_id;
    if order_received is not null and new.paid_at < order_received - max_future then
      raise exception 'Tidak bisa bayar sebelum tanggal masuk';
    end if;

    if not public.is_admin() then
      if new.paid_at < now_ts - max_back then
        raise exception 'Tidak diizinkan backdate pembayaran';
      end if;
      if new.paid_at > now_ts + max_future then
        raise exception 'Timestamp pembayaran tidak valid';
      end if;
      if tg_op = 'UPDATE' and old.paid_at is not null and new.paid_at < old.paid_at then
        raise exception 'Tidak diizinkan memundurkan timestamp pembayaran';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_enforce_timestamps on public.payments;
create trigger payments_enforce_timestamps
before insert or update on public.payments
for each row execute procedure public.enforce_payment_timestamps();

drop policy if exists "customers_all_authenticated" on public.customers;
create policy "customers_all_authenticated"
on public.customers
for all
to authenticated
using (true)
with check (true);

drop policy if exists "services_all_authenticated" on public.services;
drop policy if exists "services_select_authenticated" on public.services;
drop policy if exists "services_all_admin" on public.services;

create policy "services_select_authenticated"
on public.services
for select
to authenticated
using (true);

create policy "services_all_admin"
on public.services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "orders_all_authenticated" on public.orders;
drop policy if exists "orders_select_insert_update_auth" on public.orders;
drop policy if exists "orders_insert_auth" on public.orders;
drop policy if exists "orders_update_auth" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;

create policy "orders_select_insert_update_auth"
on public.orders
for select
to authenticated
using (true);

create policy "orders_insert_auth"
on public.orders
for insert
to authenticated
with check (true);

create policy "orders_update_auth"
on public.orders
for update
to authenticated
using (true)
with check (true);

create policy "orders_delete_admin"
on public.orders
for delete
to authenticated
using (public.is_admin());

drop policy if exists "order_items_all_authenticated" on public.order_items;
create policy "order_items_all_authenticated"
on public.order_items
for all
to authenticated
using (true)
with check (true);

drop policy if exists "payments_all_authenticated" on public.payments;
create policy "payments_all_authenticated"
on public.payments
for all
to authenticated
using (true)
with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  starting_cash numeric(12,2) not null default 0,
  expected_cash numeric(12,2),
  actual_cash numeric(12,2),
  variance numeric(12,2),
  notes text,
  status text not null default 'open' check (status in ('open', 'closed'))
);

create index if not exists cash_registers_user_id_idx on public.cash_registers(user_id);

alter table public.cash_registers enable row level security;

drop policy if exists "cash_registers_select_auth" on public.cash_registers;
drop policy if exists "cash_registers_insert_auth" on public.cash_registers;
drop policy if exists "cash_registers_update_auth" on public.cash_registers;

create policy "cash_registers_select_auth"
on public.cash_registers
for select
to authenticated
using (true);

create policy "cash_registers_insert_auth"
on public.cash_registers
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "cash_registers_update_auth"
on public.cash_registers
for update
to authenticated
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- Memastikan satu user hanya bisa punya satu shift 'open' di waktu yang sama
create unique index if not exists unique_open_register_per_user 
on public.cash_registers (user_id) 
where status = 'open';

-- Modifikasi tabel payments untuk mencatat cash_register_id (opsional tapi disarankan untuk tracking)
alter table public.payments
  add column if not exists cash_register_id uuid references public.cash_registers (id);
