-- Rule: an order can only be marked "diambil" (picked up) when it is fully paid.
-- Applies to EVERY role, including admin — there is no override.

create or replace function public.enforce_paid_before_pickup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'diambil' then
    if not exists (
      select 1
      from public.payments p
      where p.order_id = new.id
        and p.status = 'paid'
    ) then
      raise exception 'Transaksi belum lunas: tidak bisa ditandai sudah diambil';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_enforce_paid_before_pickup on public.orders;
create trigger orders_enforce_paid_before_pickup
before insert or update on public.orders
for each row execute procedure public.enforce_paid_before_pickup();
