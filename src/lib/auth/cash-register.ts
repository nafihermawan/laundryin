import type { SupabaseClient } from "@supabase/supabase-js";

export type CashRegisterStatus = {
  isOpen: boolean;
  registerId?: string;
  openedAt?: string;
  startingCash?: number;
};

export async function getActiveCashRegister(
  supabase: SupabaseClient,
  userId: string
): Promise<CashRegisterStatus> {
  const { data, error } = await supabase
    .from("cash_registers")
    .select("id, opened_at, starting_cash")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { isOpen: false };
  }

  const row = data as unknown as {
    id: string;
    opened_at: string;
    starting_cash: number;
  };

  return {
    isOpen: true,
    registerId: row.id,
    openedAt: row.opened_at,
    startingCash: row.starting_cash,
  };
}

/**
 * Total cash received for a shift: the sum of `payments` with method 'cash',
 * status 'paid' and cash_register_id = registerId. Single source of truth for
 * the Beranda "Tunai" figure and the close-shift expected_cash so they can never
 * drift apart. Payments without a cash_register_id are intentionally excluded —
 * which is why every cash payment must be attributed to a shift (see pay_order).
 */
export async function getShiftCashTotal(
  supabase: SupabaseClient,
  registerId: string
): Promise<number> {
  const { data } = await supabase
    .from("payments")
    .select("amount")
    .eq("cash_register_id", registerId)
    .eq("method", "cash")
    .eq("status", "paid");

  return (data ?? []).reduce(
    (sum, payment) => sum + Number((payment as { amount?: number }).amount ?? 0),
    0
  );
}
