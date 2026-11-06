import { createAdminClient } from "@/lib/supabase/admin";
import { cancelMidtransTransaction, verifyMidtransSignature } from "@/lib/payments/midtrans";

type PaymentRow = { id: string; order_id: string; status: string };

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!verifyMidtransSignature(payload)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const obj = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};

  const midtransOrderId = typeof obj.order_id === "string" ? obj.order_id : null;
  if (!midtransOrderId) {
    return new Response("OK", { status: 200 });
  }

  const transactionStatus = typeof obj.transaction_status === "string" ? obj.transaction_status : null;
  const fraudStatus = typeof obj.fraud_status === "string" ? obj.fraud_status : null;
  const transactionId = typeof obj.transaction_id === "string" ? obj.transaction_id : null;

  const admin = createAdminClient();

  // Find the attempt by its Midtrans order_id ({order_no}-{n}); fall back to legacy id lookup.
  let payment: PaymentRow | null = null;
  const byMidtrans = await admin
    .from("payments")
    .select("id, order_id, status")
    .eq("midtrans_order_id", midtransOrderId)
    .maybeSingle();
  if (!byMidtrans.error) {
    payment = (byMidtrans.data as PaymentRow | null) ?? null;
  }
  if (!payment) {
    const byId = await admin
      .from("payments")
      .select("id, order_id, status")
      .eq("id", midtransOrderId)
      .maybeSingle();
    payment = (byId.data as PaymentRow | null) ?? null;
  }
  if (!payment) {
    return new Response("OK", { status: 200 });
  }

  const baseUpdate: Record<string, unknown> = {
    provider: "midtrans",
    provider_ref: transactionId,
    provider_status: transactionStatus,
    provider_payload: obj,
    reference_no: transactionId,
  };

  const shouldMarkPaid =
    transactionStatus === "settlement" && (fraudStatus === "accept" || fraudStatus === null);

  if (shouldMarkPaid) {
    // Idempotent: already settled.
    if (payment.status === "paid") {
      await admin.from("payments").update(baseUpdate).eq("id", payment.id);
      return new Response("OK", { status: 200 });
    }

    const wasCancelled = payment.status !== "pending";

    const { data: otherPaid } = await admin
      .from("payments")
      .select("id")
      .eq("order_id", payment.order_id)
      .eq("status", "paid")
      .neq("id", payment.id)
      .limit(1);

    const isDuplicate = (otherPaid?.length ?? 0) > 0;
    const notes = isDuplicate ? "duplicate_payment=refund_needed" : wasCancelled ? "settled_after_cancel" : null;

    await admin
      .from("payments")
      .update({
        ...baseUpdate,
        status: "paid",
        paid_at: new Date().toISOString(),
        notes,
      })
      .eq("id", payment.id);

    // Cancel other still-pending attempts for the same order.
    if (!isDuplicate) {
      const { data: pendingOthers } = await admin
        .from("payments")
        .select("id, midtrans_order_id")
        .eq("order_id", payment.order_id)
        .eq("status", "pending")
        .neq("id", payment.id);

      for (const other of (pendingOthers ?? []) as Array<{ id: string; midtrans_order_id: string | null }>) {
        if (other.midtrans_order_id) {
          try {
            await cancelMidtransTransaction(other.midtrans_order_id);
          } catch {}
        }
        await admin
          .from("payments")
          .update({
            status: "failed",
            provider_status: "cancel",
            paid_at: null,
            notes: "auto_cancelled=settled_other_attempt",
          })
          .eq("id", other.id)
          .eq("status", "pending");
      }
    }
  } else if (transactionStatus === "expire") {
    await admin
      .from("payments")
      .update({ ...baseUpdate, status: "expired", paid_at: null })
      .eq("id", payment.id);
  } else if (transactionStatus === "cancel" || transactionStatus === "deny") {
    await admin
      .from("payments")
      .update({ ...baseUpdate, status: "failed", paid_at: null })
      .eq("id", payment.id);
  } else {
    await admin.from("payments").update(baseUpdate).eq("id", payment.id);
  }

  return new Response("OK", { status: 200 });
}
