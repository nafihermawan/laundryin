import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { paymentMethodLabel, parseCashBreakdown } from "@/lib/printing/escpos";
import { STORE_PHONE } from "@/lib/store-config";
import { createClient } from "@/lib/supabase/server";

import { PrintBar } from "./print-bar";

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

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-right font-semibold text-zinc-900">{value}</span>
    </div>
  );
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

  const receipt = {
    orderNo: order.order_no,
    receivedAt: order.received_at,
    dueAt: order.due_at ?? null,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    items: items.map((it) => ({
      name: it.service_name,
      qty: Number(it.qty ?? 0),
      unit: it.unit,
      unitPrice: Number(it.unit_price ?? 0),
      subtotal: Number(it.subtotal ?? (it.qty ?? 0) * (it.unit_price ?? 0)),
    })),
    total,
    paid: paidPayment
      ? {
          method: paidPayment.method,
          amount: Number(paidPayment.amount ?? 0),
          paidAt: paidPayment.paid_at ?? null,
          referenceNo: paidPayment.reference_no ?? null,
          notes: paidPayment.notes ?? null,
        }
      : null,
    notes: order.notes ?? null,
  };

  const isPaid = paidPayment !== null;
  const isCash = paidPayment?.method?.toLowerCase() === "cash";
  const { cashReceived, change } = parseCashBreakdown(paidPayment?.notes ?? null);
  const methodLabel = paymentMethodLabel(paidPayment?.method ?? null);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title="Nota" className="print:hidden" />
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5"
        style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}
      >
      <div className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-col items-center gap-1">
          <div className="text-base font-semibold tracking-tight">laundry.in</div>
          <div className="text-[12px] text-[#64748B]">Telp {STORE_PHONE}</div>
          <div className="text-[12px] text-[#64748B]">Nota transaksi</div>
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
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <PaymentRow label="Metode pembayaran" value={methodLabel} />
            <PaymentRow label="Status" value={isPaid ? "Lunas" : "Belum bayar"} />
            {isPaid && paidPayment?.paid_at ? (
              <PaymentRow label="Dibayar" value={formatDate(paidPayment.paid_at)} />
            ) : null}
            {!isPaid ? (
              <PaymentRow label="Sisa tagihan" value={formatIDR(total)} />
            ) : null}
            {isPaid && isCash && cashReceived !== null ? (
              <PaymentRow label="Diterima" value={formatIDR(cashReceived)} />
            ) : null}
            {isPaid && isCash && change !== null ? (
              <PaymentRow label="Kembalian" value={formatIDR(change)} />
            ) : null}
          </div>
        </div>

        {order.notes ? (
          <div className="mt-6 border-t border-zinc-200 pt-4 text-sm">
            <div className="text-xs font-medium text-zinc-500">CATATAN</div>
            <div className="mt-2 text-zinc-900">{order.notes}</div>
          </div>
        ) : null}

        <div className="mt-6 rounded-[10px] border border-dashed border-slate-400 px-3 py-2.5 text-center text-[13px] font-semibold text-zinc-900">
          Harap bawa nota ini saat mengambil cucian.
        </div>

        <div className="mt-6 flex flex-col items-center gap-1 text-center text-[12px] leading-[1.5]">
          <p className="text-[#64748B]">
            Periksa kembali cucian Anda sebelum meninggalkan tempat.
          </p>
          <p className="font-semibold text-zinc-900">
            Terima kasih telah mempercayakan cucian Anda kepada kami.
          </p>
        </div>
      </div>
      </div>
      </main>
      <PrintBar receipt={receipt} />
    </div>
  );
}
