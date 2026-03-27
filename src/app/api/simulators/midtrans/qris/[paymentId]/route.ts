import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await context.params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("payments")
    .select("provider, provider_ref")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) return new Response("Failed", { status: 500 });
  if (!data || data.provider !== "midtrans" || !data.provider_ref) {
    return new Response("Not found", { status: 404 });
  }

  const qrCodeUrl = `${req.nextUrl.origin}/v2/qris/${data.provider_ref}/qr-code`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Redirecting...</title>
  </head>
  <body>
    <form id="f" method="post" action="https://simulator.sandbox.midtrans.com/v2/qris/payment">
      <input type="hidden" name="qrCodeUrl" value="${qrCodeUrl}" />
      <noscript>
        <p>Javascript diperlukan untuk redirect otomatis.</p>
        <button type="submit">Buka Simulator</button>
      </noscript>
    </form>
    <script>document.getElementById('f').submit();</script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
