import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { PaymentScreen } from "./payment-screen";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ baru?: string; method?: string; qr?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const isNew = sp.baru === "1";
  const defaultMethod =
    sp.method === "cash" || sp.method === "qris_dynamic" || sp.method === "later" ? sp.method : undefined;
  const autoShowQr = sp.qr === "1";

  const supabase = await createClient();
  const base = supabase.from("orders").select(
    `
      id,
      order_no,
      status,
      customer:customers(name),
      items:order_items(subtotal),
      payments:payments(status)
    `,
  );

  const { data: order } = await (isUuid(id) ? base.eq("id", id) : base.eq("order_no", id)).maybeSingle();

  if (!order) notFound();

  const items = (order.items ?? []) as Array<{ subtotal?: number }>;
  const total = items.reduce((sum, it) => sum + Number(it.subtotal ?? 0), 0);
  const serviceCount = items.length;

  const payments = (order.payments ?? []) as Array<{ status: string }>;
  const isPaid = payments.some((p) => p.status === "paid");

  if (isPaid) redirect(`/kasir/riwayat/${order.order_no}`);

  const customerRaw = (order.customer ?? null) as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
    | { name?: string }
    | null;

  return (
    <PaymentScreen
      orderId={order.id}
      orderNo={order.order_no}
      customerName={customer?.name ?? "Tanpa Nama"}
      serviceCount={serviceCount}
      total={total}
      isNew={isNew}
      defaultMethod={defaultMethod}
      autoShowQr={autoShowQr}
    />
  );
}
