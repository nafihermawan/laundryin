alter table public.orders
  add column if not exists ready_at timestamptz;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('paid', 'pending', 'expired', 'failed'));

alter table public.payments drop constraint if exists payments_paidat_status_check;
alter table public.payments
  add constraint payments_paidat_status_check
  check (
    (status = 'paid' and paid_at is not null) or
    (status in ('pending', 'expired', 'failed') and paid_at is null)
  );

create or replace function public.pay_order(
  order_id uuid,
  method text,
  cash_received numeric,
  reference_no text,
  notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  role text;
  shift_id uuid;
  received_at timestamptz;
  total numeric(12,2);
  pending_payment_id uuid;
  pending_method text;
  cash_change numeric(12,2);
  merged_notes text;
begin
  if auth.uid() is null then
    raise exception 'User tidak terautentikasi';
  end if;

  select p.role into role from public.profiles p where p.id = auth.uid();
  role := coalesce(role, 'cashier');

  if method not in ('cash', 'transfer', 'qris_manual') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  if role <> 'admin' then
    select cr.id into shift_id
    from public.cash_registers cr
    where cr.user_id = auth.uid() and cr.status = 'open'
    limit 1;

    if shift_id is null then
      raise exception 'Anda harus membuka shift kasir terlebih dahulu sebelum menerima pembayaran';
    end if;
  end if;

  select o.received_at into received_at
  from public.orders o
  where o.id = order_id;

  if received_at is null then
    raise exception 'Order tidak ditemukan';
  end if;

  if role <> 'admin' then
    if received_at > now() + interval '5 minutes' then
      raise exception 'Tidak bisa bayar: tanggal masuk berada di masa depan';
    end if;
  end if;

  if exists (
    select 1 from public.payments p
    where p.order_id = pay_order.order_id and p.status = 'paid'
    limit 1
  ) then
    raise exception 'Order sudah lunas';
  end if;

  select coalesce(sum(oi.subtotal), 0)::numeric(12,2) into total
  from public.order_items oi
  where oi.order_id = pay_order.order_id;

  if method = 'cash' then
    if cash_received is null or cash_received < total then
      raise exception 'Uang diterima tidak mencukupi total tagihan';
    end if;
    cash_change := cash_received - total;
  else
    cash_received := null;
    cash_change := null;
  end if;

  merged_notes := nullif(btrim(notes), '');
  if method = 'cash' then
    merged_notes := concat_ws(
      ' | ',
      merged_notes,
      case when cash_received is not null then format('cash_received=%s', cash_received) else null end,
      case when cash_change is not null then format('change=%s', cash_change) else null end
    );
  end if;

  select p.id, p.method into pending_payment_id, pending_method
  from public.payments p
  where p.order_id = pay_order.order_id and p.status = 'pending'
  order by p.created_at desc
  limit 1;

  if pending_payment_id is not null then
    if pending_method = 'qris_dynamic' then
      update public.payments
      set
        status = 'expired',
        paid_at = null
      where id = pending_payment_id and status = 'pending';

      merged_notes := concat_ws(' | ', merged_notes, format('method_changed_from=%s', pending_method));

      insert into public.payments (
        order_id,
        cash_register_id,
        paid_at,
        amount,
        method,
        status,
        received_by,
        reference_no,
        notes
      ) values (
        pay_order.order_id,
        shift_id,
        now(),
        total,
        pay_order.method,
        'paid',
        auth.uid(),
        nullif(btrim(pay_order.reference_no), ''),
        merged_notes
      );
    else
      update public.payments
      set
        cash_register_id = shift_id,
        paid_at = now(),
        amount = total,
        method = pay_order.method,
        status = 'paid',
        received_by = auth.uid(),
        reference_no = nullif(btrim(pay_order.reference_no), ''),
        notes = merged_notes
      where id = pending_payment_id;
    end if;
  else
    insert into public.payments (
      order_id,
      cash_register_id,
      paid_at,
      amount,
      method,
      status,
      received_by,
      reference_no,
      notes
    ) values (
      pay_order.order_id,
      shift_id,
      now(),
      total,
      pay_order.method,
      'paid',
      auth.uid(),
      nullif(btrim(pay_order.reference_no), ''),
      merged_notes
    );
  end if;
end;
$$;
