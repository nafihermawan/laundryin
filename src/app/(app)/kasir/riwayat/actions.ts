"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, success, error as actionError } from "@/lib/action-response";

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
