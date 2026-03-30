import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

import { HeightSender } from "../../height-sender";
import { TransactionActions } from "@/app/(app)/kasir/riwayat/[orderId]/transaction-actions";
import { PrintNotaButton } from "./print-nota-button";
import { CloseEmbedButton } from "./close-embed-button";

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

function getPaymentMethodLabel(method: string) {
  if (method === "cash") return "Cash";
  if (method === "qris_dynamic") return "QRIS Dinamis";
  if (method === "qris_manual") return "QRIS Manual";
  if (method === "transfer") return "Transfer";
  return method;
}

function getPaymentStatusLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  if (status === "expired") return "Expired";
  if (status === "failed") return "Failed";
  return status;
}

function getMidtransApiBase() {
  const isProd = env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const dynamic = "force-dynamic";

export default async function RiwayatDetailEmbedPage({
  params,
}: {
  params: { orderId: string } | Promise<{ orderId: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await Promise.resolve(params);
  const orderKey = resolvedParams.orderId;

  const baseQuery = supabase
    .from("orders")
    .select(
      `
        id,
        order_no,
        status,
        received_at,
        due_at,
        completed_at,
        notes,
        customer:customers(name, phone),
        items:order_items(service_name, qty, unit, unit_price, subtotal),
        payments:payments(id, amount, method, status, paid_at, reference_no, notes, created_at, qris_image_url, qris_expires_at, provider_ref, provider_status)
      `,
    );

  const { data: order } = await (isUuid(orderKey) ? baseQuery.eq("id", orderKey) : baseQuery.eq("order_no", orderKey))
    .maybeSingle();

  if (!order) {
    return (
      <div id="embed-root" className="w-full">
        <HeightSender />
        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-xl">
          Detail transaksi tidak tersedia.
        </div>
      </div>
    );
  }

  const items = (order.items ?? []) as Array<{
    service_name: string;
    qty: number;
    unit: string;
    unit_price?: number;
    subtotal?: number;
  }>;

  const total = items.reduce(
    (sum, it) => sum + Number(it.subtotal ?? (it.qty ?? 0) * (it.unit_price ?? 0)),
    0,
  );

  const payments = (order.payments ?? []) as Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    paid_at?: string | null;
    reference_no?: string | null;
    notes?: string | null;
    created_at?: string | null;
    qris_image_url?: string | null;
    qris_expires_at?: string | null;
    provider_ref?: string | null;
    provider_status?: string | null;
  }>;

  const isPaid = payments.some((p) => p.status === "paid");

  const customerRaw = (order.customer ?? null) as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
    | { name?: string; phone?: string | null }
    | null;

  return (
    <div id="embed-root" className="w-full">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              height: 100% !important;
              overflow: auto !important;
              -webkit-overflow-scrolling: touch;
            }
          `,
        }}
      />
      <HeightSender />
      <div className="w-full rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex-none flex items-start justify-between gap-4 border-b border-zinc-100 bg-white p-5">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold text-zinc-900">Detail Transaksi</div>
            <div className="text-xs text-zinc-500">{order.order_no}</div>
          </div>
          <PrintNotaButton orderId={order.id} />
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                  <div className="text-xs font-medium text-zinc-500">Pelanggan</div>
                  <div className="mt-1 font-semibold text-zinc-900">{customer?.name ?? "Tanpa Nama"}</div>
                  <div className="text-sm text-zinc-600">{customer?.phone ?? "-"}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      order.status === "siap"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : order.status === "diambil"
                          ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                          : "bg-blue-100 text-blue-700 border-blue-200"
                    }`}
                  >
                    {order.status === "diproses"
                      ? "Diterima"
                      : order.status === "siap"
                        ? "Siap Diambil"
                        : order.status === "diambil"
                          ? "Sudah Diambil"
                          : "Diterima"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      isPaid
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    }`}
                  >
                    {isPaid ? "Sudah Bayar" : "Belum Bayar"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <div className="text-xs font-medium text-zinc-500">Masuk</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900">{formatDate(order.received_at)}</div>
                </div>
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <div className="text-xs font-medium text-zinc-500">Estimasi</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900">
                    {order.due_at ? formatDate(order.due_at) : "-"}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium text-zinc-500">
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Harga</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="px-4 py-3 font-medium text-zinc-900">{it.service_name}</td>
                          <td className="px-4 py-3 text-zinc-700">
                            {it.qty}
                            {it.unit}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">{formatIDR(Number(it.unit_price ?? 0))}</td>
                          <td className="px-4 py-3 text-right font-medium text-zinc-900">
                            {formatIDR(Number(it.subtotal ?? 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-zinc-200 bg-white">
                        <td className="px-4 py-3 text-sm font-semibold text-zinc-900" colSpan={3}>
                          Total
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">{formatIDR(total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {order.notes ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs font-medium text-zinc-500">Catatan</div>
                  <div className="mt-2 text-sm text-zinc-900">{order.notes}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <TransactionActions
                orderId={order.id}
                orderNo={order.order_no}
                customerName={customer?.name ?? "Tanpa Nama"}
                currentStatus={order.status}
                isPaid={isPaid}
                total={total}
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-base font-semibold tracking-tight">Log Transaksi</div>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {order.completed_at ? (
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-zinc-900">Cucian Diambil</div>
                      <span className="text-xs font-medium text-emerald-700">{formatDate(order.completed_at)}</span>
                    </div>
                  </div>
                ) : null}
                {payments.length === 0 ? (
                  <div className="text-sm text-zinc-500">Belum ada aktivitas pembayaran.</div>
                ) : (
                  payments
                    .slice()
                    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
                    .map((p, idx) => {
                      const statusClasses =
                        p.status === "paid"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : p.status === "expired" || p.status === "failed"
                            ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                            : "bg-amber-100 text-amber-700 border-amber-200";
                      const timestamp = p.paid_at || p.created_at;
                      const qrisImageUrl = typeof p.qris_image_url === "string" ? p.qris_image_url : null;
                      const internalQrUrl = p.id ? `/api/qris/${encodeURIComponent(p.id)}/qr` : null;
                      const midtransQrCodeUrl =
                        typeof p.provider_ref === "string" && p.provider_ref
                          ? `${getMidtransApiBase()}/v2/qris/${p.provider_ref}/qr-code`
                          : null;
                      const proxyQrCodeUrl =
                        typeof p.provider_ref === "string" && p.provider_ref
                          ? `/v2/qris/${encodeURIComponent(p.provider_ref)}/qr-code`
                          : null;

                      return (
                        <div key={idx} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-zinc-900">
                              {getPaymentMethodLabel(p.method)} · {formatIDR(Number(p.amount ?? 0))}
                            </div>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses}`}>
                              {getPaymentStatusLabel(p.status)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-zinc-600">
                            {timestamp ? formatDate(timestamp) : "-"}
                            {p.provider_status ? ` · ${p.provider_status}` : ""}
                          </div>
                          {p.reference_no ? <div className="mt-1 text-xs text-zinc-600">Ref: {p.reference_no}</div> : null}
                          {p.notes ? <div className="mt-1 text-xs text-zinc-600">{p.notes}</div> : null}
                          {p.method === "qris_dynamic" && p.status === "pending" ? (
                            <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="text-[11px] font-semibold text-zinc-700">QRIS Tools</div>
                              <div className="mt-2 grid gap-1.5 text-[11px] text-zinc-600">
                                {midtransQrCodeUrl ? (
                                  <div className="grid grid-cols-[110px_1fr] items-start gap-2">
                                    <div className="text-zinc-500">Midtrans QR URL</div>
                                    <a
                                      href={midtransQrCodeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-sky-700 hover:text-sky-800 break-all"
                                    >
                                      {midtransQrCodeUrl}
                                    </a>
                                  </div>
                                ) : null}
                                {proxyQrCodeUrl ? (
                                  <div className="grid grid-cols-[110px_1fr] items-start gap-2">
                                    <div className="text-zinc-500">Proxy QR URL</div>
                                    <a
                                      href={proxyQrCodeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-sky-700 hover:text-sky-800 break-all"
                                    >
                                      {proxyQrCodeUrl}
                                    </a>
                                  </div>
                                ) : null}
                                {qrisImageUrl ? (
                                  <div className="grid grid-cols-[110px_1fr] items-start gap-2">
                                    <div className="text-zinc-500">QR Image URL</div>
                                    <a
                                      href={qrisImageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-sky-700 hover:text-sky-800 break-all"
                                    >
                                      {qrisImageUrl}
                                    </a>
                                  </div>
                                ) : null}
                                {internalQrUrl ? (
                                  <div className="grid grid-cols-[110px_1fr] items-start gap-2">
                                    <div className="text-zinc-500">QR String PNG</div>
                                    <a
                                      href={internalQrUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-medium text-sky-700 hover:text-sky-800 break-all"
                                    >
                                      {internalQrUrl}
                                    </a>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-none border-t border-zinc-100 bg-white p-4">
          <div className="flex items-center justify-end">
            <CloseEmbedButton />
          </div>
        </div>
      </div>
    </div>
  );
}
