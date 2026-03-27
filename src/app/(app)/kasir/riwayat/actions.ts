"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, success, error as actionError } from "@/lib/action-response";
import { env } from "@/lib/env";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createMidtransQrisCharge } from "@/lib/payments/midtrans";

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

export type StartQrisDynamicOutput = {
  paymentId: string;
  qrString: string;
  expiresAt: string | null;
};

export async function startQrisDynamicForOrder(orderId: string): Promise<ActionResponse<StartQrisDynamicOutput>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError("User tidak terautentikasi");

  const role = await getUserRole(supabase, user.id);

  if (!env.APP_BASE_URL) return actionError("APP_BASE_URL belum diset");

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
    .select("received_at, order_no")
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

  const { data: inserted, error: insertError } = await supabase
    .from("payments")
    .insert({
      order_id: orderId,
      cash_register_id: shiftId,
      paid_at: null,
      amount: total,
      method: "qris_dynamic",
      status: "pending",
      received_by: user.id,
    })
    .select("id")
    .single();

  if (insertError) return actionError(insertError.message);
  const paymentId = inserted.id;

  const notificationUrl = `${env.APP_BASE_URL.replace(/\/+$/, "")}/api/webhooks/midtrans`;
  const created = await createMidtransQrisCharge({
    orderId: paymentId,
    grossAmount: total,
    notificationUrl,
  });

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("payments")
    .update({
      cash_register_id: shiftId,
      amount: total,
      method: "qris_dynamic",
      provider: created.provider,
      provider_ref: created.providerRef,
      provider_status: created.providerStatus,
      provider_payload: created.raw,
      qris_qr_string: created.qrString,
      qris_expires_at: expiresAt,
    })
    .eq("id", paymentId);

  if (updateError) return actionError(updateError.message);

  revalidatePath("/kasir/riwayat");
  return success({ paymentId, qrString: created.qrString, expiresAt });
}

export async function payOrder(orderId: string, input: PayOrderInput): Promise<ActionResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError("User tidak terautentikasi");

  const { error } = await supabase.rpc("pay_order", {
    order_id: orderId,
    method: input.method,
    cash_received: input.cashReceived ?? null,
    reference_no: input.referenceNo ?? null,
    notes: input.notes ?? null,
  });

  if (error) return actionError(error.message);

  revalidatePath("/kasir/riwayat");
  return success(undefined);
}
