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
    .from("cash_registers" as any)
    .select("id, opened_at, starting_cash")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { isOpen: false };
  }

  return {
    isOpen: true,
    registerId: data.id,
    openedAt: data.opened_at,
    startingCash: data.starting_cash,
  };
}
