-- Rule (extends 20261106000002): an order can only be marked "siap" or "diambil"
-- when it is fully paid. Applies to EVERY role, including admin.

create or replace function public.enforce_paid_before_pickup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('siap', 'diambil') then
    if not exists (
      select 1
      from public.payments p
      where p.order_id = new.id
        and p.status = 'paid'
    ) then
      raise exception '%',
        case new.status
          when 'siap' then 'Transaksi belum lunas: tidak bisa ditandai siap diambil'
          else 'Transaksi belum lunas: tidak bisa ditandai sudah diambil'
        end;
    end if;
  end if;
  return new;
end;
$$;
