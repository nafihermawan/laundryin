import { createAdminClient } from "@/lib/supabase/admin";
import { verifyMidtransSignature } from "@/lib/payments/midtrans";

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

  const paymentId = typeof obj.order_id === "string" ? obj.order_id : null;
  if (!paymentId) {
    return new Response("OK", { status: 200 });
  }

  const transactionStatus = typeof obj.transaction_status === "string" ? obj.transaction_status : null;
  const fraudStatus = typeof obj.fraud_status === "string" ? obj.fraud_status : null;
  const transactionId = typeof obj.transaction_id === "string" ? obj.transaction_id : null;

  const shouldMarkPaid =
    transactionStatus === "settlement" && (fraudStatus === "accept" || fraudStatus === null);

  const updatePayload: Record<string, unknown> = {
    provider: "midtrans",
    provider_ref: transactionId,
    provider_status: transactionStatus,
    provider_payload: obj,
    reference_no: transactionId,
  };

  if (shouldMarkPaid) {
    updatePayload.status = "paid";
    updatePayload.paid_at = new Date().toISOString();
  } else if (transactionStatus === "expire") {
    updatePayload.status = "expired";
    updatePayload.paid_at = null;
  } else if (transactionStatus === "cancel" || transactionStatus === "deny") {
    updatePayload.status = "failed";
    updatePayload.paid_at = null;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("payments")
    .update(updatePayload)
    .eq("id", paymentId)
    .eq("status", "pending");

  if (error) {
    return new Response("Failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
