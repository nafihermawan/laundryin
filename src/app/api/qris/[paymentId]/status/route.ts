import { createClient } from "@/lib/supabase/server";
import { getMidtransTransactionStatus } from "@/lib/payments/midtrans";
import type { Json } from "@/lib/supabase/database.types";

type ApiResponse =
  | { success: true; data: { status: string; providerStatus: string | null } }
  | { success: false; error: string };

export async function POST(
  _request: Request,
  context: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const body: ApiResponse = { success: false, error: "User tidak terautentikasi" };
    return Response.json(body, { status: 401 });
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, method, status, provider")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    const body: ApiResponse = { success: false, error: error.message || "Gagal mengambil data pembayaran" };
    return Response.json(body, { status: 500 });
  }

  if (!payment) {
    const body: ApiResponse = { success: false, error: "Pembayaran tidak ditemukan" };
    return Response.json(body, { status: 404 });
  }

  if (payment.method !== "qris_dynamic") {
    const body: ApiResponse = { success: false, error: "Metode pembayaran bukan QRIS dinamis" };
    return Response.json(body, { status: 400 });
  }

  if (payment.provider !== "midtrans") {
    const body: ApiResponse = { success: false, error: "Provider pembayaran bukan Midtrans" };
    return Response.json(body, { status: 400 });
  }

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
  if (updateError) {
    const body: ApiResponse = { success: false, error: updateError.message || "Gagal memperbarui status pembayaran" };
    return Response.json(body, { status: 500 });
  }

  const body: ApiResponse = { success: true, data: { status: nextStatus, providerStatus: transactionStatus } };
  return Response.json(
    body,
    { headers: { "Cache-Control": "no-store" } },
  );
}
