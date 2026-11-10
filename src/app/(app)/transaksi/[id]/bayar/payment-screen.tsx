"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Clock, Copy, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import {
  checkQrisDynamicPaymentStatus,
  payOrder,
  startQrisDynamicForOrder,
} from "@/app/(app)/kasir/riwayat/actions";

type Method = "cash" | "qris_dynamic" | "later";

const METHODS = [
  { value: "cash", label: "Tunai", desc: "Bayar sekarang dengan uang tunai", icon: Banknote },
  { value: "qris_dynamic", label: "QRIS", desc: "Pelanggan scan kode QR", icon: QrCode },
  { value: "later", label: "Bayar nanti", desc: "Lunas saat cucian diambil", icon: Clock },
] as const;

function formatRp(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

function formatThousands(digits: string) {
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PaymentScreen({
  orderId,
  orderNo,
  customerName,
  serviceCount,
  total,
  isNew,
  defaultMethod = "cash",
  autoShowQr = false,
}: {
  orderId: string;
  orderNo: string;
  customerName: string;
  serviceCount: number;
  total: number;
  isNew: boolean;
  defaultMethod?: Method;
  autoShowQr?: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();

  const [method, setMethod] = useState<Method>(defaultMethod);
  const [cash, setCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  const [qris, setQris] = useState<{
    paymentId: string;
    midtransOrderId: string;
    providerRef: string;
    imageUrl: string | null;
    qrString: string;
    expiresAt: string | null;
  } | null>(null);
  const [isLocal, setIsLocal] = useState(false);
  const [qrisVisible, setQrisVisible] = useState(false);
  const [qrisPaid, setQrisPaid] = useState(false);
  const [qrisStatus, setQrisStatus] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const navigated = useRef(false);
  const autoOpened = useRef(false);
  const openQrisRef = useRef<() => void>(() => {});

  const cashNumber = Number(cash) || 0;
  const change = cashNumber - total;
  const detailHref = `/kasir/riwayat/${orderNo}`;

  function goToDetail() {
    router.replace(detailHref);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      show(`${label} disalin`);
    } catch {
      show("Gagal menyalin", { type: "error" });
    }
  }

  useEffect(() => {
    if (!qris?.paymentId || qrisPaid || !qrisVisible) return;
    const pid = qris.paymentId;
    let busy = false;

    async function poll() {
      if (busy) return;
      busy = true;
      try {
        const res = await checkQrisDynamicPaymentStatus(pid);
        if (res.success) {
          setQrisStatus(res.data.status);
          if (res.data.status === "paid") setQrisPaid(true);
        }
      } catch {
      } finally {
        busy = false;
      }
    }

    poll();
    const t = window.setInterval(poll, 5000);
    return () => window.clearInterval(t);
  }, [qris?.paymentId, qrisVisible, qrisPaid]);

  useEffect(() => {
    if (!qrisPaid || navigated.current) return;
    navigated.current = true;
    show("Pembayaran QRIS diterima");
    router.replace(detailHref);
  }, [qrisPaid, router, detailHref, show]);

  useEffect(() => {
    if (!qris?.expiresAt || qrisPaid) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [qris?.expiresAt, qrisPaid]);

  useEffect(() => {
    const detect = () => setIsLocal(["localhost", "127.0.0.1", "::1"].includes(window.location.hostname));
    detect();
  }, []);

  useEffect(() => {
    if (!autoShowQr || autoOpened.current) return;
    autoOpened.current = true;
    openQrisRef.current();
  }, [autoShowQr]);

  async function handleCash() {
    if (loading || cash === "" || cashNumber < total) return;
    setLoading(true);
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 10000);
    const res = await payOrder(orderId, { method: "cash", cashReceived: cashNumber });
    window.clearTimeout(timer);
    if (res.success) {
      show("Pembayaran diterima");
      goToDetail();
      return;
    }
    setLoading(false);
    setSlow(false);
    show(res.error || "Gagal menerima pembayaran", {
      type: "error",
      actionLabel: "Coba lagi",
      onAction: () => {
        void handleCash();
      },
    });
  }

  async function handleQris() {
    if (loading) return;
    setLoading(true);
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 10000);
    const res = await startQrisDynamicForOrder(orderId);
    window.clearTimeout(timer);
    setLoading(false);
    setSlow(false);
    if (!res.success) {
      show(res.error || "Gagal membuat QRIS", {
        type: "error",
        actionLabel: "Coba lagi",
        onAction: () => {
          void handleQris();
        },
      });
      return;
    }
    applyQrisResult(res.data);
    setQrisVisible(true);
  }

  function applyQrisResult(data: {
    paymentId: string;
    midtransOrderId: string;
    providerRef: string;
    imageUrl: string | null;
    qrString: string;
    expiresAt: string | null;
  }) {
    setQrisPaid(false);
    setQrisStatus("pending");
    setNowMs(Date.now());
    setQris({
      paymentId: data.paymentId,
      midtransOrderId: data.midtransOrderId,
      providerRef: data.providerRef,
      imageUrl: data.imageUrl,
      qrString: data.qrString,
      expiresAt: data.expiresAt,
    });
  }

  async function regenerateQris() {
    if (regenerating) return;
    setRegenerating(true);
    const res = await startQrisDynamicForOrder(orderId);
    setRegenerating(false);
    if (!res.success) {
      show(res.error || "Gagal membuat QR baru", {
        type: "error",
        actionLabel: "Coba lagi",
        onAction: () => {
          void regenerateQris();
        },
      });
      return;
    }
    applyQrisResult(res.data);
  }

  function handleLater() {
    if (loading) return;
    setLoading(true);
    show("Transaksi disimpan, belum dibayar");
    goToDetail();
  }

  openQrisRef.current = handleQris;

  const qrisExpiresMs = qris?.expiresAt ? new Date(qris.expiresAt).getTime() : null;
  const qrisRemaining = qrisExpiresMs ? qrisExpiresMs - nowMs : null;
  const qrisExpired =
    qrisStatus === "expired" || qrisStatus === "failed" || (qrisRemaining !== null && qrisRemaining <= 0);
  const qrisExpiryClock = qris?.expiresAt
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(qris.expiresAt))
    : "";

  const actionLabel = method === "cash" ? "Terima pembayaran" : method === "qris_dynamic" ? "Tampilkan QR" : "Selesai";
  const actionDisabled = loading || (method === "cash" && (cash === "" || cashNumber < total));
  const action = method === "cash" ? handleCash : method === "qris_dynamic" ? handleQris : handleLater;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title="Pembayaran" fallbackHref={detailHref} onBack={() => router.replace(detailHref)} />

      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4"
        style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3.5 card p-4">
            {isNew ? (
              <div role="status" className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-3 w-3 text-emerald-700" strokeWidth={3} />
                </span>
                <span className="text-[13px] font-semibold text-emerald-700">Transaksi tersimpan</span>
              </div>
            ) : null}

            <div className="flex flex-col gap-1">
              <span className="text-[15px] font-semibold text-slate-900">{customerName}</span>
              <span className="text-[13px] tabular-nums text-slate-500">
                {orderNo} · {serviceCount} layanan
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3.5">
              <span className="text-sm text-slate-500">Total tagihan</span>
              <span className="font-display text-[24px] font-bold tabular-nums text-slate-900">
                {formatRp(total)}
              </span>
            </div>
          </section>

          <section>
            <h2 className="mx-1 mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
              Metode pembayaran
            </h2>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Metode pembayaran</legend>
              {METHODS.map((opt) => {
                const active = method === opt.value;
                const Icon = opt.icon;
                return (
                  <label
                    key={opt.value}
                    className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-xl has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-indigo-600 ${
                      active
                        ? "border-2 border-indigo-600 bg-indigo-50 px-[13px] py-[11px]"
                        : "border border-slate-200 bg-white px-3.5 py-3"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={active}
                      onChange={() => setMethod(opt.value)}
                      className="sr-only"
                    />
                    <Icon
                      className={`h-5 w-5 shrink-0 ${active ? "text-indigo-600" : "text-slate-500"}`}
                      strokeWidth={2}
                    />
                    <span className="flex flex-1 flex-col">
                      <span className="text-[15px] font-semibold text-slate-900">{opt.label}</span>
                      <span className="text-[12px] text-slate-500">{opt.desc}</span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        active ? "border-indigo-600" : "border-slate-300"
                      }`}
                    >
                      {active ? <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> : null}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </section>

          <div
            className="grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none"
            inert={method === "cash" ? undefined : true}
            style={{ gridTemplateRows: method === "cash" ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-3 card p-4">
                <label htmlFor="cashReceived" className="text-sm font-medium text-slate-900">
                  Uang diterima
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">Rp</span>
                  <input
                    id="cashReceived"
                    type="text"
                    inputMode="numeric"
                    value={formatThousands(cash)}
                    onChange={(e) => setCash(e.target.value.replace(/\D/g, ""))}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="0"
                    disabled={loading}
                    className="h-11 w-full rounded-[10px] border border-slate-200 bg-white pl-10 pr-3 text-[15px] font-semibold tabular-nums text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:opacity-60"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const step = total < 10000 ? 5000 : 10000;
                    const first = Math.ceil((total + 1) / step) * step;
                    const second = first + step;
                    return [total, first, second];
                  })().map((amount, idx) => {
                    const active = cash !== "" && cashNumber === amount;
                    return (
                      <button
                        key={`${amount}-${idx}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setCash(String(amount))}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors ${
                          active
                            ? "border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600"
                            : "border border-slate-200 bg-white font-medium text-slate-600"
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                        {amount === total ? "Uang pas" : new Intl.NumberFormat("id-ID").format(amount)}
                      </button>
                    );
                  })}
                </div>

                {cash !== "" ? (
                  cashNumber >= total ? (
                    <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
                      <span className="text-sm text-slate-500">Kembalian</span>
                      <span className="font-display text-[18px] font-bold tabular-nums text-slate-900">
                        {formatRp(change)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
                      <span className="text-sm text-amber-700">Kurang</span>
                      <span className="font-display text-[18px] font-bold tabular-nums text-amber-700">
                        {formatRp(total - cashNumber)}
                      </span>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div
          className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 pt-3"
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          <Button size="lg" onClick={action} disabled={actionDisabled} loading={loading} loadingText={slow ? "Masih memproses…" : "Memproses…"}>
            {actionLabel}
          </Button>
        </div>
      </div>

      {qris && qrisVisible ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-5 text-center">
              <div className="text-sm font-semibold text-slate-900">QRIS</div>
              <div className="text-xs tabular-nums text-slate-500">{orderNo}</div>
            </div>
            <div className="flex flex-col items-center gap-3 p-5">
              <div className="relative rounded-2xl border border-slate-200 bg-white p-3">
                <QRCodeCanvas value={qris.qrString} size={260} />
                {qrisExpired && !qrisPaid ? (
                  <div className="absolute inset-3 flex items-center justify-center rounded-xl bg-slate-100/95">
                    <span className="text-sm font-semibold text-slate-700">QR kedaluwarsa</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-[13px] text-slate-500">Total</span>
                <span className="font-display text-[18px] font-bold tabular-nums text-slate-900">
                  {formatRp(total)}
                </span>
              </div>

              {qrisPaid ? (
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Lunas
                </div>
              ) : qrisExpired ? (
                <div className="text-xs font-semibold text-red-600">QR kedaluwarsa</div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Menunggu pembayaran…
                  </div>
                  {qrisRemaining !== null ? (
                    <div className="text-xs tabular-nums text-slate-500">
                      Berlaku sampai {qrisExpiryClock} ({formatCountdown(qrisRemaining)})
                    </div>
                  ) : null}
                </div>
              )}

              {qrisExpired && !qrisPaid ? (
                <div className="flex w-full flex-col gap-2">
                  <Button onClick={regenerateQris} loading={regenerating} loadingText="Membuat…">
                    Buat QR baru
                  </Button>
                  <Button variant="outline" onClick={() => setQrisVisible(false)}>
                    Ganti metode
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setQrisVisible(false)}
                  className="text-xs font-semibold text-slate-500 underline"
                >
                  Tutup
                </button>
              )}

              {isLocal ? (
                <div className="mt-1 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-left">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Debug (localhost)
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { label: "Midtrans Order ID", value: qris.midtransOrderId, link: false },
                      { label: "Payment ID", value: qris.paymentId, link: false },
                      {
                        label: "QR Code Image URL (lokal)",
                        value: `${window.location.origin}/api/qris/${qris.paymentId}/qr`,
                        link: true,
                      },
                      {
                        label: "QR Code Image URL (Midtrans)",
                        value: qris.imageUrl ?? `${window.location.origin}/v2/qris/${qris.providerRef}/qr-code`,
                        link: true,
                      },
                      { label: "QR string", value: qris.qrString, link: false },
                    ].map((row) => (
                      <div key={row.label} className="flex flex-col gap-1">
                        <span className="text-[11px] text-slate-500">{row.label}</span>
                        <div className="flex items-start gap-2">
                          {row.link ? (
                            <a
                              href={row.value}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 break-all rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-indigo-600 underline"
                            >
                              {row.value}
                            </a>
                          ) : (
                            <code className="flex-1 break-all rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">
                              {row.value}
                            </code>
                          )}
                          <button
                            type="button"
                            aria-label={`Salin ${row.label}`}
                            onClick={() => copy(row.value, row.label)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
                          >
                            <Copy className="h-4 w-4" strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    Tempel Payment ID + nominal di Midtrans Sandbox Simulator, atau buka QR Image URL untuk melihat
                    gambar QR.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
