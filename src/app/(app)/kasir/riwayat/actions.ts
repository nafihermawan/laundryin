"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, success, error as actionError } from "@/lib/action-response";
import { getUserRole } from "@/lib/auth/get-user-role";

export async function updateOrderStatus(orderId: string, newStatus: string): Promise<ActionResponse> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    return actionError(error.message);
  }

  revalidatePath("/kasir/riwayat");
  return success(undefined);
}

export type PayOrderInput = {
  method: "cash" | "transfer" | "qris_manual";
  cashReceived?: number;
  referenceNo?: string;
  notes?: string;
};

export async function payOrder(orderId: string, input: PayOrderInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError("User tidak terautentikasi");

  const role = await getUserRole(supabase, user.id);

  // Cek apakah kasir sudah buka shift (hanya jika role bukan admin)
  let shiftId: string | null = null;
  if (role !== "admin") {
    const { data: shift } = await supabase
      .from("cash_registers")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open")
      .maybeSingle();

    shiftId = (shift as unknown as { id?: string } | null)?.id ?? null;

    if (!shiftId) {
      return actionError("Anda harus membuka shift kasir terlebih dahulu sebelum menerima pembayaran");
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("received_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) return actionError(orderError.message);
  const receivedAt = new Date(order?.received_at ?? "");
  if (!Number.isFinite(receivedAt.getTime())) return actionError("Tanggal order tidak valid");

  if (role !== "admin") {
    const now = Date.now();
    const received = receivedAt.getTime();
    const maxFutureMs = 5 * 60 * 1000;
    if (received > now + maxFutureMs) {
      return actionError("Tidak bisa bayar: tanggal masuk berada di masa depan");
    }
  }

  const { data: paidPayments, error: paidPaymentsError } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "paid")
    .limit(1);

  if (paidPaymentsError) return actionError(paidPaymentsError.message);
  if ((paidPayments?.length ?? 0) > 0) return actionError("Order sudah lunas");

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("subtotal")
    .eq("order_id", orderId);

  if (itemsError) return actionError(itemsError.message);

  const total = (items ?? []).reduce((sum, it) => sum + Number(it.subtotal ?? 0), 0);

  if (input.method === "cash") {
    if (typeof input.cashReceived !== "number" || input.cashReceived < total) {
      return actionError("Uang diterima tidak mencukupi total tagihan");
    }
  }

  const cashReceived = typeof input.cashReceived === "number" ? input.cashReceived : null;
  const change = cashReceived !== null ? cashReceived - total : null;
  const notes =
    input.method === "cash"
      ? [input.notes?.trim(), cashReceived !== null ? `cash_received=${cashReceived}` : null, change !== null ? `change=${change}` : null]
          .filter(Boolean)
          .join(" | ")
      : input.notes?.trim() || null;

  const { data: pendingPayment, error: pendingPaymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingPaymentError) return actionError(pendingPaymentError.message);

  if (pendingPayment?.id) {
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        cash_register_id: shiftId,
        paid_at: new Date().toISOString(),
        amount: total,
        method: input.method,
        status: "paid",
        received_by: user.id,
        reference_no: input.referenceNo?.trim() || null,
        notes,
      })
      .eq("id", pendingPayment.id);

    if (updateError) return actionError(updateError.message);
  } else {
    const { error: insertError } = await supabase.from("payments").insert({
      order_id: orderId,
      cash_register_id: shiftId,
      paid_at: new Date().toISOString(),
      amount: total,
      method: input.method,
      status: "paid",
      received_by: user.id,
      reference_no: input.referenceNo?.trim() || null,
      notes,
    });

    if (insertError) return actionError(insertError.message);
  }

  revalidatePath("/kasir/riwayat");
  return success(undefined);
}
