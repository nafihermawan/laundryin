import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { CopyUrl } from "@/components/copy-url";

import { TransactionActions } from "./transaction-actions";

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
    timeZone: "Asia/Jakarta",
  }).format(new Date(dateStr));
}

function getLaundryStatus(status: string) {
  return status === "diproses" ? "diterima" : status;
}

function getLaundryStatusLabel(status: string) {
  const normalized = getLaundryStatus(status);
  if (normalized === "diterima") return "Diterima";
  if (normalized === "siap") return "Siap Diambil";
  if (normalized === "diambil") return "Sudah Diambil";
  return normalized;
}

function getLaundryStatusClasses(status: string) {
  const normalized = getLaundryStatus(status);
  if (normalized === "diterima") return "bg-blue-100 text-blue-700 border-blue-200";
  if (normalized === "siap") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (normalized === "diambil") return "bg-zinc-100 text-zinc-700 border-zinc-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function getPaymentMethodLabel(method: string) {
  if (method === "cash") return "Cash";
  if (method === "qris_dynamic") return "QRIS Dinamis";
  if (method === "qris_manual") return "QRIS Manual";
  if (method === "transfer") return "Transfer";
  return method;
}

function getPaymentStatusLabel(status: string) {
  if (status === "paid") return "Lunas";
  if (status === "pending") return "Pending";
  if (status === "expired") return "Kedaluwarsa";
  if (status === "failed") return "Gagal";
  return status;
}

function getMidtransApiBase() {
  const isProd = env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function parsePaymentNotes(notes: string | null | undefined) {
  const out: Record<string, string> = {};
  if (typeof notes !== "string") return out;
  const parts = notes
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

function toIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt.toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({
  params,
}: {
  params: { orderId: string } | Promise<{ orderId: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await Promise.resolve(params);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const orderKey = resolvedParams.orderId;
  const selectWithReadyAt = `
    id,
    order_no,
    status,
    received_at,
    due_at,
    updated_at,
    ready_at,
    completed_at,
    notes,
    customer:customers(name, phone),
    items:order_items(service_name, qty, unit, unit_price, subtotal),
    payments:payments(id, amount, method, status, paid_at, reference_no, notes, created_at, qris_image_url, qris_expires_at, provider_ref, provider_status)
  `;
  const selectWithoutReadyAt = `
    id,
    order_no,
    status,
    received_at,
    due_at,
    updated_at,
    completed_at,
    notes,
    customer:customers(name, phone),
    items:order_items(service_name, qty, unit, unit_price, subtotal),
    payments:payments(id, amount, method, status, paid_at, reference_no, notes, created_at, qris_image_url, qris_expires_at, provider_ref, provider_status)
  `;

  const withReadyQuery = isUuid(orderKey)
    ? supabase.from("orders").select(selectWithReadyAt).eq("id", orderKey)
    : supabase.from("orders").select(selectWithReadyAt).eq("order_no", orderKey);
  let { data: order, error } = await withReadyQuery.maybeSingle();

  if (error && typeof error.message === "string" && error.message.toLowerCase().includes("ready_at")) {
    const withoutReadyQuery = isUuid(orderKey)
      ? supabase.from("orders").select(selectWithoutReadyAt).eq("id", orderKey)
      : supabase.from("orders").select(selectWithoutReadyAt).eq("order_no", orderKey);
    ({ data: order, error } = await withoutReadyQuery.maybeSingle());
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Detail Transaksi</h1>
            <div className="text-sm text-zinc-600">Gagal memuat transaksi.</div>
          </div>
          <Link
            href="/kasir/riwayat"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Kembali
          </Link>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
          {error.message}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Detail Transaksi</h1>
            <div className="text-sm text-zinc-600">Transaksi tidak ditemukan.</div>
          </div>
          <Link
            href="/kasir/riwayat"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Kembali
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          {user ? (
            <div>Order ID/No: {orderKey}</div>
          ) : (
            <div>Silakan login ulang lalu coba lagi.</div>
          )}
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
  const orderMeta = order as unknown as { ready_at?: string | null; updated_at?: string | null };
  const nowIso = new Date().toISOString();
  const readyEventTs =
    typeof orderMeta.ready_at === "string"
      ? toIsoDate(orderMeta.ready_at)
      : getLaundryStatus(order.status) === "siap"
        ? toIsoDate(orderMeta.updated_at)
        : null;

  const customerRaw = (order.customer ?? null) as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
    | { name?: string; phone?: string | null }
    | null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Detail Transaksi</h1>
          <div className="text-sm text-zinc-600">{order.order_no}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/kasir/riwayat"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Kembali
          </Link>
          <Link
            href={`/kasir/nota/${order.id}`}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Nota
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getLaundryStatusClasses(
                    order.status,
                  )}`}
                >
                  {getLaundryStatusLabel(order.status)}
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
              {order.completed_at ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 sm:col-span-2">
                  <div className="text-xs font-medium text-zinc-500">Diambil pada</div>
                  <div className="mt-1 text-sm font-medium text-emerald-700">
                    {formatDate(order.completed_at)}
                  </div>
                </div>
              ) : null}
              {order.ready_at ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 sm:col-span-2">
                  <div className="text-xs font-medium text-zinc-500">Siap diambil pada</div>
                  <div className="mt-1 text-sm font-medium text-sky-700">
                    {formatDate(order.ready_at)}
                  </div>
                </div>
              ) : getLaundryStatus(order.status) === "siap" ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 sm:col-span-2">
                  <div className="text-xs font-medium text-zinc-500">Siap diambil pada</div>
                  <div className="mt-1 text-sm font-medium text-sky-700">
                    {order.updated_at ? formatDate(order.updated_at) : "-"}
                  </div>
                </div>
              ) : null}
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
                      <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                        {formatIDR(total)}
                      </td>
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
            <div className="mt-4 flex flex-col gap-3 text-xs">
              {readyEventTs ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-zinc-900">Status: Siap Diambil</div>
                    <span className="text-xs font-medium text-sky-700">{formatDate(readyEventTs)}</span>
                  </div>
                </div>
              ) : null}
              {order.completed_at ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-zinc-900">Cucian Diambil</div>
                    <span className="text-xs font-medium text-emerald-700">{formatDate(order.completed_at)}</span>
                  </div>
                </div>
              ) : null}

              {payments.length === 0 ? (
                <div className="text-xs text-zinc-500">Belum ada aktivitas pembayaran.</div>
              ) : (
                payments
                  .slice()
                  .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
                  .map((p, idx) => {
                    const expiresAtIso = toIsoDate(p.qris_expires_at);
                    const isExpiredByTime =
                      p.method === "qris_dynamic" &&
                      p.status === "pending" &&
                      typeof expiresAtIso === "string" &&
                      expiresAtIso < nowIso;
                    const effectiveStatus =
                      isExpiredByTime ? "expired" : p.status;
                    const statusClasses =
                      effectiveStatus === "paid"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : effectiveStatus === "expired" || effectiveStatus === "failed"
                          ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                          : "bg-amber-100 text-amber-700 border-amber-200";

                    const timestamp = p.paid_at || p.created_at;
                    const midtransQrCodeUrl =
                      typeof p.provider_ref === "string" && p.provider_ref
                        ? `${getMidtransApiBase()}/v2/qris/${p.provider_ref}/qr-code`
                        : null;
                    const meta = parsePaymentNotes(p.notes);
                    const cashReceived = meta.cash_received ? Number(meta.cash_received) : null;
                    const cashChange = meta.change ? Number(meta.change) : null;
                    const methodChangedFrom = meta.method_changed_from ?? null;
                    const showRawNotes =
                      typeof p.notes === "string" &&
                      p.notes.length > 0 &&
                      !(p.method === "cash" && (p.notes.includes("cash_received=") || p.notes.includes("change=")));
                    const providerStatusText =
                      isExpiredByTime && p.provider_status === "pending" ? "expired" : p.provider_status;

                    return (
                      <div key={idx} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-zinc-900">
                            {getPaymentMethodLabel(p.method)} · {formatIDR(Number(p.amount ?? 0))}
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses}`}>
                            {getPaymentStatusLabel(effectiveStatus)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-600">
                          {timestamp ? formatDate(timestamp) : "-"}
                          {providerStatusText ? ` · ${providerStatusText}` : ""}
                        </div>
                        {methodChangedFrom ? (
                          <div className="mt-1 text-xs text-zinc-600">
                            Metode diubah: {getPaymentMethodLabel(methodChangedFrom)} → {getPaymentMethodLabel(p.method)}
                          </div>
                        ) : null}
                        {p.reference_no ? <div className="mt-1 text-xs text-zinc-600">Ref: {p.reference_no}</div> : null}
                        {p.method === "cash" && Number.isFinite(cashReceived ?? NaN) ? (
                          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
                            <div className="text-zinc-500">Diterima</div>
                            <div className="text-right font-semibold text-zinc-900">{formatIDR(cashReceived ?? 0)}</div>
                            <div className="text-zinc-500">Kembalian</div>
                            <div className="text-right font-semibold text-zinc-900">{formatIDR(cashChange ?? 0)}</div>
                          </div>
                        ) : null}
                        {showRawNotes ? <div className="mt-1 text-xs text-zinc-600">{p.notes}</div> : null}
                        {p.method === "qris_dynamic" && effectiveStatus === "pending" ? (
                          midtransQrCodeUrl ? (
                            <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="text-[11px] font-semibold text-zinc-700">Midtrans QR URL</div>
                              <div className="mt-2">
                                <CopyUrl value={midtransQrCodeUrl} />
                              </div>
                            </div>
                          ) : null
                        ) : null}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
