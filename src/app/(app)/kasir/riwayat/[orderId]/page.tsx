import { AlertTriangle, Check, Phone } from "lucide-react";

import { CopyUrl } from "@/components/copy-url";
import { PageHeader } from "@/components/app/page-header";
import { ScrollCue } from "@/components/app/scroll-cue";
import { createClient } from "@/lib/supabase/server";

import { DetailBottomBar } from "./detail-bottom-bar";
import { CopyOrderButton } from "./copy-order-button";
import { InvoiceCard } from "./invoice-card";
import { LogAccordion } from "./log-accordion";
import { StatusAccordion, type StatusStep } from "./status-accordion";

function formatDateTime(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatRp(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

function formatPhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
}

function getLaundryStatus(status: string) {
  return status === "diproses" ? "diterima" : status;
}

function getLaundryStatusLabel(status: string) {
  const normalized = getLaundryStatus(status);
  if (normalized === "diterima") return "Diterima";
  if (normalized === "siap") return "Siap diambil";
  if (normalized === "diambil") return "Sudah diambil";
  return normalized;
}

function getLaundryStatusClasses(status: string) {
  const normalized = getLaundryStatus(status);
  if (normalized === "diterima") return "bg-blue-50 text-blue-700";
  if (normalized === "siap") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function paymentMethodLabel(method: string) {
  if (method === "cash") return "Cash";
  if (method === "qris_dynamic") return "QRIS Dinamis";
  if (method === "qris_manual") return "QRIS Manual";
  if (method === "transfer") return "Transfer";
  return method;
}

function paymentStatusPill(status: string) {
  if (status === "paid") return { label: "Lunas", classes: "bg-emerald-50 text-emerald-700" };
  if (status === "pending") return { label: "Pending", classes: "bg-orange-50 text-amber-700" };
  if (status === "expired") return { label: "Kedaluwarsa", classes: "bg-slate-100 text-slate-600" };
  if (status === "failed") return { label: "Gagal", classes: "bg-slate-100 text-slate-600" };
  return { label: status, classes: "bg-slate-100 text-slate-600" };
}

function translateGatewayStatus(value: string) {
  switch (value) {
    case "expire":
      return "kedaluwarsa";
    case "pending":
      return "menunggu";
    case "settlement":
      return "berhasil";
    case "cancel":
      return "dibatalkan";
    case "deny":
      return "ditolak";
    default:
      return value;
  }
}

function parsePaymentNotes(notes: string | null | undefined) {
  const out: Record<string, string> = {};
  if (typeof notes !== "string") return out;
  for (const part of notes.split("|")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function toIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getMidtransApiBase() {
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mx-1 mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{title}</h2>
      {children}
    </section>
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
    payments:payments(id, amount, method, status, paid_at, reference_no, notes, created_at, provider_ref, provider_status, qris_expires_at)
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
    payments:payments(id, amount, method, status, paid_at, reference_no, notes, created_at, provider_ref, provider_status, qris_expires_at)
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

  if (error || !order) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <PageHeader title="Detail Transaksi" fallbackHref="/kasir" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {error ? error.message : "Transaksi tidak ditemukan."}
          </div>
        </main>
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
    provider_ref?: string | null;
    provider_status?: string | null;
    qris_expires_at?: string | null;
  }>;

  const customerRaw = (order.customer ?? null) as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
    | { name?: string; phone?: string | null }
    | null;

  const status = getLaundryStatus(order.status);
  const isPaid = payments.some((p) => p.status === "paid");
  const hasDuplicatePayment = payments.some((p) =>
    (p.notes ?? "").includes("duplicate_payment=refund_needed"),
  );
  const lastQrisAttempt =
    payments
      .filter((p) => p.method === "qris_dynamic")
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))[0] ?? null;
  const orderMeta = order as unknown as { ready_at?: string | null; updated_at?: string | null };

  const readyEventTs =
    typeof orderMeta.ready_at === "string"
      ? toIsoDate(orderMeta.ready_at)
      : status === "siap"
        ? toIsoDate(orderMeta.updated_at)
        : null;

  const completedTs = toIsoDate(order.completed_at);
  const receivedTs = toIsoDate(order.received_at);

  const steps: StatusStep[] = [
    {
      key: "diterima",
      label: "Diterima",
      time: receivedTs ? formatDateTime(receivedTs) : null,
      done: true,
    },
    {
      key: "siap",
      label: "Siap diambil",
      time: readyEventTs ? formatDateTime(readyEventTs) : null,
      done: status === "siap" || status === "diambil",
      estimasi: order.due_at ? formatDateTime(order.due_at) : null,
    },
    {
      key: "diambil",
      label: "Sudah diambil",
      time: completedTs ? formatDateTime(completedTs) : null,
      done: status === "diambil",
    },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const lastDone = [...steps].reverse().find((s) => s.done) ?? steps[0];

  const paymentEntries = payments
    .slice()
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

  const logTimes: string[] = [];
  if (readyEventTs) logTimes.push(readyEventTs);
  if (completedTs) logTimes.push(completedTs);
  for (const p of paymentEntries) {
    const ts = toIsoDate(p.paid_at || p.created_at);
    if (ts) logTimes.push(ts);
  }
  const logCount = (readyEventTs ? 1 : 0) + (completedTs ? 1 : 0) + paymentEntries.length;
  const latestTs = logTimes.reduce((max, ts) => (ts > max ? ts : max), "");
  const logLatest = latestTs ? formatDateTime(latestTs) : null;

  const customerName = customer?.name ?? "Tanpa Nama";
  const phoneDigits = customer?.phone ? customer.phone.replace(/[^\d+]/g, "") : "";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title="Detail Transaksi" fallbackHref="/kasir" />

      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4"
        style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-5">
          {/* Ringkasan */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[13px] tabular-nums text-slate-500">{order.order_no}</span>
                <CopyOrderButton orderNo={order.order_no} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-[20px] font-bold tracking-[-0.01em] text-slate-900">
                    {customerName}
                  </span>
                  {customer?.phone ? (
                    <span className="text-sm tabular-nums text-slate-500">{formatPhone(customer.phone)}</span>
                  ) : null}
                </div>
                {phoneDigits ? (
                  <a
                    href={`tel:${phoneDigits}`}
                    aria-label={`Hubungi ${customerName}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                  >
                    <Phone className="h-5 w-5" strokeWidth={2} />
                  </a>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-200 pt-3.5">
                <span
                  className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${getLaundryStatusClasses(
                    status,
                  )}`}
                >
                  {getLaundryStatusLabel(status)}
                </span>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Lunas
                  </span>
                ) : (
                  <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-orange-50 px-2.5 text-xs font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Belum bayar
                  </span>
                )}
                <span className="ml-auto font-display text-[18px] font-bold tabular-nums text-slate-900">
                  {formatRp(total)}
                </span>
              </div>
            </div>
          </section>

          {!isPaid ? (
            <InvoiceCard
              orderId={order.id}
              total={total}
              lastAttempt={
                lastQrisAttempt
                  ? {
                      paymentId: lastQrisAttempt.id,
                      status: lastQrisAttempt.status,
                      expiresAt: lastQrisAttempt.qris_expires_at ?? null,
                    }
                  : null
              }
            />
          ) : null}

          {hasDuplicatePayment ? (
            <div role="alert" className="rounded-2xl border border-amber-200 bg-orange-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-amber-800">Pembayaran ganda – perlu refund</span>
                  <span className="text-[13px] text-amber-700">
                    Ada lebih dari satu pembayaran QRIS yang berhasil untuk transaksi ini. Perlu pengecekan/refund manual.
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Status cucian */}
          <Section title="Status cucian">
            <StatusAccordion
              steps={steps}
              completed={completedCount}
              total={steps.length}
              summaryLabel={lastDone.label}
              summaryTime={lastDone.time}
            />
          </Section>

          {/* Rincian layanan */}
          <Section title="Rincian layanan">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 pb-4 pt-1">
              <div className="divide-y divide-slate-200">
                {items.map((it, idx) => {
                  const subtotal = Number(it.subtotal ?? (it.qty ?? 0) * (it.unit_price ?? 0));
                  return (
                    <div key={idx} className="flex items-baseline gap-3 py-3">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] font-medium text-slate-900">{it.service_name}</span>
                        <span className="text-[13px] tabular-nums text-slate-500">
                          {it.qty} {it.unit} × {formatRp(Number(it.unit_price ?? 0))}
                        </span>
                      </div>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-900">
                        {formatRp(subtotal)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-slate-300 pt-3">
                <span className="text-[15px] font-semibold text-slate-900">Total</span>
                <span className="font-display text-[18px] font-bold tabular-nums text-slate-900">
                  {formatRp(total)}
                </span>
              </div>
            </div>
          </Section>

          {/* Log transaksi */}
          <section>
            <h2 className="mx-1 mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
              Log transaksi
            </h2>
            <LogAccordion count={logCount} latestTime={logLatest}>
            <ol className="flex list-none flex-col gap-2">
              {readyEventTs ? (
                <li className="flex min-h-[52px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3">
                  <span className="flex-1 text-sm font-semibold text-slate-900">Status: Siap Diambil</span>
                  <span className="whitespace-nowrap text-[13px] tabular-nums text-slate-500">
                    {formatDateTime(readyEventTs)}
                  </span>
                </li>
              ) : null}

              {completedTs ? (
                <li className="flex min-h-[52px] items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3">
                  <span className="flex-1 text-sm font-semibold text-slate-900">Cucian Diambil</span>
                  <span className="whitespace-nowrap text-[13px] tabular-nums text-slate-500">
                    {formatDateTime(completedTs)}
                  </span>
                </li>
              ) : null}

              {paymentEntries.length === 0 ? (
                <li className="rounded-xl border border-slate-200 px-3.5 py-3 text-[13px] text-slate-500">
                  Belum ada aktivitas pembayaran.
                </li>
              ) : (
                paymentEntries.map((p) => {
                  const expiresAtIso = toIsoDate(p.qris_expires_at);
                  const isExpiredByTime =
                    p.method === "qris_dynamic" &&
                    p.status === "pending" &&
                    typeof expiresAtIso === "string" &&
                    expiresAtIso < new Date().toISOString();
                  const effectiveStatus = isExpiredByTime ? "expired" : p.status;
                  const pill = paymentStatusPill(effectiveStatus);
                  const timestamp = p.paid_at || p.created_at;
                  const meta = parsePaymentNotes(p.notes);
                  const cashReceived = meta.cash_received ? Number(meta.cash_received) : null;
                  const cashChange = meta.change ? Number(meta.change) : null;
                  const methodChangedFrom = meta.method_changed_from ?? null;
                  const providerStatusText =
                    isExpiredByTime && p.provider_status === "pending" ? "expire" : p.provider_status ?? null;

                  return (
                    <li key={p.id} className="rounded-xl border border-slate-200 p-3.5">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-3">
                          <span className="flex-1 text-sm font-semibold text-slate-900">
                            {paymentMethodLabel(p.method)} · {formatRp(Number(p.amount ?? 0))}
                          </span>
                          <span
                            className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${pill.classes}`}
                          >
                            {pill.label}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 text-[13px] text-slate-500">
                          <span className="tabular-nums">
                            {timestamp ? formatDateTime(timestamp) : "-"}
                            {providerStatusText ? ` · ${translateGatewayStatus(providerStatusText)}` : ""}
                          </span>
                          {methodChangedFrom ? (
                            <span>
                              Metode diubah: {paymentMethodLabel(methodChangedFrom)} →{" "}
                              {paymentMethodLabel(p.method)}
                            </span>
                          ) : null}
                          {p.reference_no ? <span className="break-all">Ref: {p.reference_no}</span> : null}
                        </div>

                        {p.method === "qris_dynamic" && p.provider_ref && effectiveStatus === "pending" ? (
                          <div className="rounded-[10px] border border-slate-200 bg-white p-3">
                            <div className="text-[11px] font-semibold text-slate-600">Midtrans QR URL</div>
                            <div className="mt-2">
                              <CopyUrl value={`${getMidtransApiBase()}/v2/qris/${p.provider_ref}/qr-code`} />
                            </div>
                          </div>
                        ) : null}

                        {p.method === "cash" && cashReceived !== null ? (
                          <dl className="grid grid-cols-[1fr_auto] gap-y-2 rounded-[10px] bg-slate-100 p-3 text-sm">
                            <dt className="text-slate-500">Diterima</dt>
                            <dd className="text-right font-semibold tabular-nums text-slate-900">
                              {formatRp(cashReceived)}
                            </dd>
                            <dt className="text-slate-500">Kembalian</dt>
                            <dd className="text-right font-semibold tabular-nums text-slate-900">
                              {formatRp(cashChange ?? 0)}
                            </dd>
                          </dl>
                        ) : null}
                      </div>
                    </li>
                  );
                })
              )}
            </ol>
            </LogAccordion>
          </section>
        </div>
      </main>

      <DetailBottomBar
        orderId={order.id}
        orderNo={order.order_no}
        customerName={customerName}
        status={status}
        isPaid={isPaid}
      />
      <ScrollCue barHeight={76} />
    </div>
  );
}
