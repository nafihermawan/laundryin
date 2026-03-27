import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { NextRequest } from "next/server";

function getMidtransApiBase() {
  const isProd = env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function getBasicAuthHeader(serverKey: string) {
  const token = Buffer.from(`${serverKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ transactionId: string }> },
) {
  if (!env.MIDTRANS_SERVER_KEY) {
    return new Response("MIDTRANS_SERVER_KEY belum diset", { status: 500 });
  }

  const { transactionId } = await context.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("payments")
    .select("id")
    .eq("provider", "midtrans")
    .eq("provider_ref", transactionId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return new Response("Failed to fetch payment", { status: 500 });
  }

  if (!data?.id) {
    return new Response("Not found", { status: 404 });
  }

  const res = await fetch(`${getMidtransApiBase()}/v2/qris/${transactionId}/qr-code`, {
    headers: { Authorization: getBasicAuthHeader(env.MIDTRANS_SERVER_KEY) },
  });

  if (!res.ok) {
    return new Response("Failed to fetch QR", { status: 502 });
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  return new Response(buf, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/png",
      "Cache-Control": "no-store",
    },
  });
}
