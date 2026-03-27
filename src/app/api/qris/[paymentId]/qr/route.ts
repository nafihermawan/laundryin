import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await context.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("payments")
    .select("qris_qr_string")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    return new Response("Failed to fetch QRIS", { status: 500 });
  }

  const qrString = data?.qris_qr_string;
  if (!qrString) {
    return new Response("QRIS not found", { status: 404 });
  }

  const png = await QRCode.toBuffer(qrString, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
