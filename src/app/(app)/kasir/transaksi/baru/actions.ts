"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { success as actionSuccess, error as actionError, type ActionResponse } from "@/lib/action-response";

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
  paymentMethod: "cash" | "transfer" | "qris_manual";
  cashReceived?: number;
  receivedAt: string;
  dueAt: string;
  total: number;
};

export async function saveTransaction(data: TransactionData): Promise<ActionResponse<{ orderNo: string }>> {
  const supabase = await createClient();

  // 1. Dapatkan user ID pembuat
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError("User tidak terautentikasi");
  }

  let orderId: string | null = null;

  try {
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
        received_at: data.receivedAt,
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
    const change = cashReceived !== null ? cashReceived - data.total : null;
    const paymentNotes =
      data.paymentMethod === "cash" && (cashReceived !== null || change !== null)
        ? [cashReceived !== null ? `cash_received=${cashReceived}` : null, change !== null ? `change=${change}` : null]
            .filter(Boolean)
            .join(" | ")
        : null;

    const { error: payError } = await supabase
      .from("payments")
      .insert({
        order_id: createdOrderId,
        paid_at: data.paymentMethod === "cash" ? new Date().toISOString() : null,
        amount: data.total,
        method: data.paymentMethod,
        status: data.paymentMethod === "cash" ? "paid" : "pending",
        received_by: user.id,
        notes: paymentNotes,
      });

    if (payError) {
      await supabase.from("orders").delete().eq("id", createdOrderId);
      return actionError(payError.message || "Gagal menyimpan pembayaran");
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
