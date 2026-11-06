alter table public.payments
  add column if not exists midtrans_order_id text;

comment on column public.payments.midtrans_order_id is
  'Unique Midtrans order_id per payment attempt, format {order_no}-{n} (e.g. CSH-261106-0LER-1).';

create unique index if not exists payments_midtrans_order_id_key
  on public.payments (midtrans_order_id)
  where midtrans_order_id is not null;
