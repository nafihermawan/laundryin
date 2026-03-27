"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ActionResponse, success, error as actionError } from "@/lib/action-response";
import { env } from "@/lib/env";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createMidtransQrisCharge, getMidtransTransactionStatus } from "@/lib/payments/midtrans";
import type { Json } from "@/lib/supabase/database.types";

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
  providerRef: string;
  qrString: string;
  imageUrl: string | null;
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
      provider_payload: created.raw as Json,
      qris_qr_string: created.qrString,
      qris_image_url: created.qrImageUrl,
      qris_expires_at: expiresAt,
    })
    .eq("id", paymentId);

  if (updateError) return actionError(updateError.message);

  revalidatePath("/kasir/riwayat");
  return success({
    paymentId,
    providerRef: created.providerRef,
    qrString: created.qrString,
    imageUrl: created.qrImageUrl,
    expiresAt,
  });
}

export async function checkQrisDynamicPaymentStatus(
  paymentId: string,
): Promise<ActionResponse<{ status: string; providerStatus: string | null }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError("User tidak terautentikasi");

  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, method, status, provider")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) return actionError(error.message || "Gagal mengambil data pembayaran");
  if (!payment) return actionError("Pembayaran tidak ditemukan");
  if (payment.method !== "qris_dynamic") return actionError("Metode pembayaran bukan QRIS dinamis");
  if (payment.provider !== "midtrans") return actionError("Provider pembayaran bukan Midtrans");

  const data = await getMidtransTransactionStatus(paymentId);
  const transactionStatus = typeof data.transaction_status === "string" ? data.transaction_status : null;
  const fraudStatus = typeof data.fraud_status === "string" ? data.fraud_status : null;
  const transactionId = typeof data.transaction_id === "string" ? data.transaction_id : null;

  const shouldMarkPaid =
    transactionStatus === "settlement" && (fraudStatus === "accept" || fraudStatus === null);

  const nextStatus =
    shouldMarkPaid
      ? "paid"
      : transactionStatus === "expire"
        ? "expired"
        : transactionStatus === "cancel" || transactionStatus === "deny"
          ? "failed"
          : "pending";

  const updatePayload: Record<string, unknown> = {
    provider: "midtrans",
    provider_ref: transactionId,
    provider_status: transactionStatus,
    provider_payload: data as Json,
    reference_no: transactionId,
  };

  if (nextStatus === "paid") {
    updatePayload.status = "paid";
    updatePayload.paid_at = new Date().toISOString();
  } else if (nextStatus === "expired" || nextStatus === "failed") {
    updatePayload.status = nextStatus;
    updatePayload.paid_at = null;
  }

  const { error: updateError } = await supabase.from("payments").update(updatePayload).eq("id", paymentId);
  if (updateError) return actionError(updateError.message || "Gagal memperbarui status pembayaran");

  try {
    revalidatePath("/kasir/riwayat");
  } catch {}

  return success({ status: nextStatus, providerStatus: transactionStatus });
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
