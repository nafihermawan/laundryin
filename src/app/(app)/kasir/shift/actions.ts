"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, success, error as actionError } from "@/lib/action-response";

export async function openShift(startingCash: number): Promise<ActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError("User tidak terautentikasi");

  // Cek apakah sudah ada shift open
  const { data: existing } = await supabase
    .from("cash_registers" as any)
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "open")
    .maybeSingle();

  if (existing) {
    return actionError("Anda sudah memiliki shift kasir yang aktif");
  }

  const { error } = await supabase.from("cash_registers" as any).insert({
    user_id: user.id,
    starting_cash: startingCash,
    status: "open",
  });

  if (error) return actionError(error.message);

  revalidatePath("/kasir");
  return success(undefined);
}

export async function closeShift(registerId: string, actualCash: number, notes?: string): Promise<ActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError("User tidak terautentikasi");

  // 1. Ambil data register open
  const { data: register, error: regError } = await supabase
    .from("cash_registers" as any)
    .select("*")
    .eq("id", registerId)
    .eq("user_id", user.id)
    .eq("status", "open")
    .maybeSingle();

  if (regError || !register) {
    return actionError("Shift kasir tidak ditemukan atau sudah ditutup");
  }

  // 2. Hitung total cash dari tabel payments untuk shift ini
  const { data: payments, error: payError } = await supabase
    .from("payments")
    .select("amount")
    .eq("cash_register_id", registerId)
    .eq("method", "cash")
    .eq("status", "paid");

  if (payError) return actionError(payError.message);

  const regData = register as any;
  const totalCashPayments = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const expectedCash = Number(regData.starting_cash) + totalCashPayments;
  const variance = actualCash - expectedCash;

  // 3. Update register
  const { error: updateError } = await supabase
    .from("cash_registers" as any)
    .update({
      closed_at: new Date().toISOString(),
      expected_cash: expectedCash,
      actual_cash: actualCash,
      variance,
      notes: notes || null,
      status: "closed",
    })
    .eq("id", registerId);

  if (updateError) return actionError(updateError.message);

  revalidatePath("/kasir");
  return success(undefined);
}
