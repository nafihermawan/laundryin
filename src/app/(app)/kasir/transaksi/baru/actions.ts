"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { success as actionSuccess, error as actionError, type ActionResponse } from "@/lib/action-response";
import { getUserRole } from "@/lib/auth/get-user-role";
import { env } from "@/lib/env";
import { createMidtransQrisCharge } from "@/lib/payments/midtrans";
import type { Json } from "@/lib/supabase/database.types";

export type TransactionData = {
  customer: {
    name: string;
    phone?: string;
    notes?: string;
  };
  items: Array<{
    serviceName: string;
    unit: string;
    qty: number;
    price: number;
  }>;
  status: string;
  paymentMethod: "cash" | "transfer" | "qris_manual" | "qris_dynamic";
  cashReceived?: number;
  receivedAt: string;
  dueAt: string;
  total: number;
};

export async function saveTransaction(
  data: TransactionData,
): Promise<
  ActionResponse<
    { orderNo: string } & (
      | { qris?: undefined }
      | {
          qris: {
            paymentId: string;
          providerRef: string;
            qrString: string;
          imageUrl: string | null;
            expiresAt: string | null;
          };
        }
    )
  >
> {
  const supabase = await createClient();

  // 1. Dapatkan user ID pembuat
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("User tidak terautentikasi");
  }

  const role = await getUserRole(supabase, user.id);

  // 1b. Cek apakah kasir sudah buka shift (hanya jika role bukan admin)
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
      return actionError("Anda harus membuka shift kasir terlebih dahulu sebelum membuat transaksi");
    }
  }

  let orderId: string | null = null;

  try {
    const computedTotal = (data.items ?? []).reduce((sum, it) => {
      const qty = Number(it.qty ?? 0);
      const price = Number(it.price ?? 0);
      if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
      return sum + Math.max(0, qty) * Math.max(0, price);
    }, 0);

    if (data.items.length === 0 || computedTotal < 0) {
      return actionError("Item transaksi tidak valid");
    }

    const receivedAtTs = new Date();
    const isoReceivedAt = receivedAtTs.toISOString();
    const dueAtTs = new Date(data.dueAt);
    if (!Number.isFinite(dueAtTs.getTime())) return actionError("Tanggal estimasi tidak valid");
    if (dueAtTs.getTime() < receivedAtTs.getTime()) {
      return actionError("Estimasi tidak boleh sebelum tanggal masuk");
    }

    if (role !== "admin") {
      const now = Date.now();
      const received = receivedAtTs.getTime();
      const maxBackMs = 2 * 60 * 60 * 1000;
      const maxFutureMs = 5 * 60 * 1000;
      if (received < now - maxBackMs) {
        return actionError("Tanggal masuk terlalu mundur (maksimal 2 jam)");
      }
      if (received > now + maxFutureMs) {
        return actionError("Tanggal masuk terlalu maju");
      }
    }

    if (data.paymentMethod === "cash") {
      if (typeof data.cashReceived !== "number" || data.cashReceived < computedTotal) {
        return actionError("Uang diterima tidak mencukupi total tagihan");
      }
    }

    // 2. Cari atau buat customer
    let customerId: string;
    
    // Cek dulu apakah ada customer dengan nama & phone yang sama
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("name", data.customer.name)
      .eq("phone", data.customer.phone || "")
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({
          name: data.customer.name,
          phone: data.customer.phone || "",
          notes: data.customer.notes || "",
        })
        .select("id")
        .single();

      if (custError) throw custError;
      customerId = newCustomer.id;
    }

    // 3. Generate Order No (berdasarkan metode bayar)
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix =
      data.paymentMethod === "cash"
        ? "CSH"
        : data.paymentMethod === "transfer"
          ? "TRF"
          : "QRS";
    const orderNo = `${prefix}-${dateStr}-${randStr}`;

    // 4. Insert Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_no: orderNo,
        customer_id: customerId,
        status: data.status,
        received_at: isoReceivedAt,
        due_at: data.dueAt,
        notes: data.customer.notes || "",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (orderError) throw orderError;
    const createdOrderId = order.id;
    orderId = createdOrderId;

    // 5. Insert Items
    const orderItems = data.items.map((it) => ({
      order_id: createdOrderId,
      service_name: it.serviceName,
      qty: it.qty,
      unit: it.unit,
      unit_price: it.price,
      subtotal: it.qty * it.price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", createdOrderId);
      return actionError(itemsError.message || "Gagal menyimpan item transaksi");
    }

    // 6. Insert Payment
    const cashReceived =
      data.paymentMethod === "cash" && typeof data.cashReceived === "number"
        ? data.cashReceived
        : null;
    const change = cashReceived !== null ? cashReceived - computedTotal : null;
    const paymentNotes =
      data.paymentMethod === "cash" && (cashReceived !== null || change !== null)
        ? [cashReceived !== null ? `cash_received=${cashReceived}` : null, change !== null ? `change=${change}` : null]
            .filter(Boolean)
            .join(" | ")
        : null;

    const { data: createdPayment, error: payError } = await supabase
      .from("payments")
      .insert({
        order_id: createdOrderId,
        cash_register_id: shiftId,
        paid_at: data.paymentMethod === "cash" ? new Date().toISOString() : null,
        amount: computedTotal,
        method: data.paymentMethod,
        status: data.paymentMethod === "cash" ? "paid" : "pending",
        received_by: user.id,
        notes: paymentNotes,
      })
      .select("id")
      .single();

    if (payError) {
      await supabase.from("orders").delete().eq("id", createdOrderId);
      return actionError(payError.message || "Gagal menyimpan pembayaran");
    }

    if (data.paymentMethod === "qris_dynamic") {
      if (!env.APP_BASE_URL) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
        return actionError("APP_BASE_URL belum diset");
      }

      const notificationUrl = `${env.APP_BASE_URL.replace(/\/+$/, "")}/api/webhooks/midtrans`;
      const created = await createMidtransQrisCharge({
        orderId: createdPayment.id,
        grossAmount: computedTotal,
        notificationUrl,
      });

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      const { error: qrisUpdateError } = await supabase
        .from("payments")
        .update({
          provider: created.provider,
          provider_ref: created.providerRef,
          provider_status: created.providerStatus,
          provider_payload: created.raw as Json,
          qris_qr_string: created.qrString,
          qris_image_url: created.qrImageUrl,
          qris_expires_at: expiresAt,
        })
        .eq("id", createdPayment.id);

      if (qrisUpdateError) {
        await supabase.from("orders").delete().eq("id", createdOrderId);
        return actionError(qrisUpdateError.message || "Gagal membuat QRIS dinamis");
      }

      try {
        revalidatePath("/kasir/riwayat");
      } catch {}

      if (env.MIDTRANS_IS_PRODUCTION !== "true") {
        console.log(
          `Midtrans QRIS simulator: ${env.APP_BASE_URL.replace(/\/+$/, "")}/api/simulators/midtrans/qris/${createdPayment.id}`,
        );
      }

      return actionSuccess({
        orderNo,
        qris: {
          paymentId: createdPayment.id,
          providerRef: created.providerRef,
          qrString: created.qrString,
          imageUrl: created.qrImageUrl,
          expiresAt,
        },
      });
    }

    try {
      revalidatePath("/kasir/riwayat");
    } catch {}
    
    return actionSuccess({ orderNo });
  } catch (err) {
    console.error("Save transaction error:", err);
    if (orderId) {
      try {
        await supabase.from("orders").delete().eq("id", orderId);
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
    return actionError(message);
  }
}
