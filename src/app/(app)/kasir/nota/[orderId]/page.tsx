import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { PrintButton } from "./print-button";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

export const dynamic = "force-dynamic";

export default async function NotaPage({
  params,
}: {
  params: { orderId: string } | Promise<{ orderId: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const orderKey = resolvedParams.orderId;
  const supabase = await createClient();

  const baseQuery = supabase.from("orders").select(
    `
      id,
      order_no,
      status,
      received_at,
      due_at,
      notes,
      customer:customers(name, phone),
      items:order_items(service_name, qty, unit, unit_price, subtotal),
      payments:payments(amount, method, status, paid_at, reference_no, notes)
    `,
  );

  const { data: order, error } = await (isUuid(orderKey)
    ? baseQuery.eq("id", orderKey)
    : baseQuery.eq("order_no", orderKey)
  ).maybeSingle();

  if (error || !order) notFound();

  const items = (order.items ?? []) as Array<{
    service_name: string;
    qty: number;
    unit: string;
    unit_price?: number;
    subtotal?: number;
  }>;

  const total = items.reduce((sum, it) => sum + Number(it.subtotal ?? (it.qty ?? 0) * (it.unit_price ?? 0)), 0);

  const payments = (order.payments ?? []) as Array<{
    amount: number;
    method: string;
    status: string;
    paid_at?: string | null;
    reference_no?: string | null;
    notes?: string | null;
  }>;

  const paidPayment = payments.find((p) => p.status === "paid") ?? null;
  const customerRaw = (order.customer ?? null) as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
    | { name?: string; phone?: string | null }
    | null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Nota</h1>
          <p className="text-sm text-zinc-600">{order.order_no}</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-col items-center gap-1">
          <div className="text-base font-semibold tracking-tight">laundry.in</div>
          <div className="text-xs text-zinc-500">Nota transaksi</div>
        </div>

        <div className="mt-6 grid gap-2 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="text-zinc-500">No. Order</span>
            <span className="font-medium text-zinc-900">{order.order_no}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-zinc-500">Masuk</span>
            <span className="text-zinc-900">{formatDate(order.received_at)}</span>
          </div>
          {order.due_at ? (
            <div className="flex items-start justify-between gap-4">
              <span className="text-zinc-500">Estimasi</span>
              <span className="text-zinc-900">{formatDate(order.due_at)}</span>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-4">
            <span className="text-zinc-500">Pelanggan</span>
            <span className="text-right text-zinc-900">
              {customer?.name ?? "-"}
              {customer?.phone ? (
                <span className="block text-xs text-zinc-500">{customer.phone}</span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <div className="text-xs font-medium text-zinc-500">ITEM</div>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-zinc-900">{it.service_name}</span>
                  <span className="text-xs text-zinc-500">
                    {it.qty} {it.unit} × {formatIDR(Number(it.unit_price ?? 0))}
                  </span>
                </div>
                <span className="font-medium text-zinc-900">{formatIDR(Number(it.subtotal ?? 0))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-zinc-900">TOTAL</span>
            <span className="text-sm font-semibold text-zinc-900">{formatIDR(total)}</span>
          </div>
          <div className="mt-2 flex items-start justify-between gap-4 text-sm">
            <span className="text-zinc-500">Pembayaran</span>
            <span className="text-right text-zinc-900">
              {paidPayment ? (
                <>
                  <span className="font-medium">{paidPayment.method}</span>
                  <span className="block text-xs text-zinc-500">
                    {paidPayment.paid_at ? formatDate(paidPayment.paid_at) : "-"} ·{" "}
                    {formatIDR(Number(paidPayment.amount ?? 0))}
                  </span>
                  {paidPayment.reference_no ? (
                    <span className="block text-xs text-zinc-500">Ref: {paidPayment.reference_no}</span>
                  ) : null}
                </>
              ) : (
                <span className="font-medium text-amber-700">Belum lunas</span>
              )}
            </span>
          </div>
        </div>

        {order.notes ? (
          <div className="mt-6 border-t border-zinc-200 pt-4 text-sm">
            <div className="text-xs font-medium text-zinc-500">CATATAN</div>
            <div className="mt-2 text-zinc-900">{order.notes}</div>
          </div>
        ) : null}

        <div className="mt-8 text-center text-xs text-zinc-500">
          Terima kasih.
        </div>
      </div>
    </div>
  );
}
