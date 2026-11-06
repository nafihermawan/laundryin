"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";

import {
  checkQrisDynamicPaymentStatus,
  getExistingQrisDynamicForOrder,
  payOrder,
  startQrisDynamicForOrder,
  updateOrderStatus,
  type PayOrderInput,
} from "../actions";

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function QrisCountdown({ expiresAt }: { expiresAt: string }) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const expiryMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiryMs)) return;
    function tick() {
      setRemainingMs(Math.max(0, expiryMs - Date.now()));
    }
    const timeout = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [expiresAt]);

  if (remainingMs === null) return null;
  return <div className="text-xs text-slate-500">Sisa waktu: {formatCountdown(remainingMs)}</div>;
}

type Action =
  | { kind: "status"; label: string; next: string; confirmTitle: string }
  | { kind: "pay"; label: string }
  | null;

function deriveAction(status: string, isPaid: boolean): Action {
  if (status === "diambil") return null;
  if (status === "diterima") {
    return { kind: "status", label: "Tandai siap diambil", next: "siap", confirmTitle: "Tandai siap diambil?" };
  }
  if (!isPaid) return { kind: "pay", label: "Terima pembayaran" };
  return { kind: "status", label: "Tandai sudah diambil", next: "diambil", confirmTitle: "Tandai sudah diambil?" };
}

export function DetailBottomBar({
  orderId,
  orderNo,
  customerName,
  status,
  isPaid,
  total,
}: {
  orderId: string;
  orderNo: string;
  customerName: string;
  status: string;
  isPaid: boolean;
  total: number;
}) {
  const router = useRouter();
  const { show } = useToast();
  const showQrisDebug = process.env.NEXT_PUBLIC_QRIS_DEBUG === "true";
  const action = deriveAction(status, isPaid);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  const [payingOpen, setPayingOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "qris_dynamic">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isGeneratingQris, setIsGeneratingQris] = useState(false);
  const [isCheckingQris, setIsCheckingQris] = useState(false);
  const [existingQris, setExistingQris] = useState<{
    paymentId: string;
    providerRef: string;
    qrString: string;
    imageUrl: string | null;
    expiresAt: string | null;
    status: string;
  } | null>(null);
  const [qrisDynamic, setQrisDynamic] = useState<{
    paymentId: string;
    providerRef: string;
    qrString: string;
    imageUrl: string | null;
    expiresAt: string | null;
  } | null>(null);
  const [qrisPaid, setQrisPaid] = useState(false);
  const [qrisDynamicStatus, setQrisDynamicStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchExisting() {
      if (isPaid) return;
      const res = await getExistingQrisDynamicForOrder(orderId);
      if (cancelled) return;
      setExistingQris(res.success ? res.data : null);
    }
    fetchExisting();
    return () => {
      cancelled = true;
    };
  }, [isPaid, orderId]);

  function openPayModal() {
    setPayingOpen(true);
    setPayMethod("cash");
    setCashReceived(total > 0 ? String(total) : "");
    setReferenceNo("");
    setPayNotes("");
    setQrisDynamic(null);
    setQrisPaid(false);
    setQrisDynamicStatus(null);
  }

  async function changeStatus(nextStatus: string) {
    setChanging(true);
    const res = await updateOrderStatus(orderId, nextStatus);
    setChanging(false);
    setConfirmOpen(false);
    if (res.success) {
      show("Status transaksi diperbarui");
      router.refresh();
      return;
    }
    show(res.error || "Gagal memperbarui status");
  }

  async function handlePayConfirm() {
    if (payMethod === "qris_dynamic") {
      setIsGeneratingQris(true);
      const res = await startQrisDynamicForOrder(orderId);
      setIsGeneratingQris(false);
      if (res.success) {
        setQrisPaid(false);
        setQrisDynamic(res.data);
        setQrisDynamicStatus("pending");
        return;
      }
      show(res.error || "Gagal membuat QRIS dinamis");
      return;
    }

    const cashReceivedNumber = cashReceived.trim() !== "" ? Number(cashReceived) : undefined;
    if (typeof cashReceivedNumber !== "number" || cashReceivedNumber < total) {
      show("Uang diterima tidak mencukupi total tagihan");
      return;
    }

    setIsPaying(true);
    const res = await payOrder(orderId, {
      method: payMethod as PayOrderInput["method"],
      cashReceived: cashReceivedNumber,
      referenceNo: referenceNo.trim() || undefined,
      notes: payNotes.trim() || undefined,
    });
    setIsPaying(false);

    if (res.success) {
      setPayingOpen(false);
      show("Pembayaran berhasil disimpan");
      router.refresh();
      return;
    }
    show(res.error || "Gagal menyimpan pembayaran");
  }

  useEffect(() => {
    if (!qrisDynamic) return;
    const paymentId = qrisDynamic.paymentId;
    const supabase = createClient();
    let cancelled = false;

    async function fetchCurrent() {
      const { data } = await supabase
        .from("payments")
        .select("status")
        .eq("id", paymentId)
        .maybeSingle();
      if (cancelled) return;
      if (typeof data?.status === "string") setQrisDynamicStatus(data.status);
      if (data?.status === "paid") setQrisPaid(true);
    }
    fetchCurrent();

    const channel = supabase
      .channel(`payments:${paymentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `id=eq.${paymentId}` },
        (payload: unknown) => {
          const nextStatus = (payload as { new?: { status?: unknown } })?.new?.status;
          if (typeof nextStatus === "string") setQrisDynamicStatus(nextStatus);
          if (nextStatus === "paid") setQrisPaid(true);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [qrisDynamic]);

  useEffect(() => {
    if (!qrisPaid || !payingOpen) return;
    setPayingOpen(false);
    show("Pembayaran QRIS berhasil (lunas)");
    router.refresh();
  }, [payingOpen, qrisPaid, router, show]);

  useEffect(() => {
    if (!payingOpen || payMethod !== "qris_dynamic" || qrisPaid || qrisDynamic || isGeneratingQris) return;
    let cancelled = false;
    async function generate() {
      if (existingQris?.status === "pending") {
        setQrisPaid(false);
        setQrisDynamic({
          paymentId: existingQris.paymentId,
          providerRef: existingQris.providerRef,
          qrString: existingQris.qrString,
          imageUrl: existingQris.imageUrl,
          expiresAt: existingQris.expiresAt,
        });
        setQrisDynamicStatus(existingQris.status);
        return;
      }
      setIsGeneratingQris(true);
      try {
        const res = await startQrisDynamicForOrder(orderId);
        if (cancelled) return;
        if (res.success) {
          setQrisPaid(false);
          setQrisDynamic(res.data);
          setQrisDynamicStatus("pending");
          return;
        }
        show(res.error || "Gagal membuat QRIS dinamis");
      } finally {
        if (!cancelled) setIsGeneratingQris(false);
      }
    }
    generate();
    return () => {
      cancelled = true;
    };
  }, [existingQris, isGeneratingQris, orderId, payMethod, payingOpen, qrisDynamic, qrisPaid, show]);

  const qrisExpiredByTime =
    !!qrisDynamic?.expiresAt &&
    !qrisPaid &&
    Number.isFinite(new Date(qrisDynamic.expiresAt).getTime()) &&
    new Date(qrisDynamic.expiresAt).getTime() < Date.now();
  const qrisExpired =
    qrisDynamicStatus === "expired" || qrisDynamicStatus === "failed" || qrisExpiredByTime;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div
          className="mx-auto flex w-full max-w-6xl items-center gap-2.5 px-4 pt-3"
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          {action ? (
            <Button
              size="lg"
              onClick={() => (action.kind === "pay" ? openPayModal() : setConfirmOpen(true))}
            >
              {action.label}
            </Button>
          ) : null}
          <Link
            href={`/kasir/nota/${orderId}`}
            className={buttonClass({ variant: "outline", size: "lg", className: "ml-auto" })}
          >
            Cetak nota
          </Link>
        </div>
      </div>

      {confirmOpen && action?.kind === "status" ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">{action.confirmTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {orderNo} · {customerName}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button disabled={changing} onClick={() => changeStatus(action.next)}>
                {changing ? "Memproses..." : "Ya, lanjutkan"}
              </Button>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {payingOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex flex-none items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-slate-900">Terima Pembayaran</div>
                <div className="text-xs text-slate-500">
                  {orderNo} · {customerName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingOpen(false)}
                aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5" style={{ WebkitOverflowScrolling: "touch" }}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-slate-600">Metode</div>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as "cash" | "qris_dynamic")}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="cash">Cash</option>
                    <option value="qris_dynamic">QRIS Dinamis</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-slate-600">Total Tagihan</div>
                    <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums text-slate-900">
                      {formatIDR(total)}
                    </div>
                  </div>
                  {payMethod === "cash" ? (
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-medium text-slate-600">Uang Diterima</div>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        inputMode="numeric"
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm tabular-nums outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <div className="text-xs tabular-nums text-slate-500">
                        Kembalian: {formatIDR((Number(cashReceived) || 0) - total)}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-medium text-slate-600">QRIS</div>
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                        {qrisPaid ? "Lunas" : "Menunggu pembayaran"}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-slate-600">Ref (opsional)</div>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-slate-600">Catatan (opsional)</div>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {payMethod === "qris_dynamic" ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    {qrisDynamic ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <QRCodeCanvas value={qrisDynamic.qrString} size={220} />
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            qrisPaid
                              ? "bg-emerald-50 text-emerald-700"
                              : qrisExpired
                                ? "bg-red-50 text-red-700"
                                : "bg-orange-50 text-amber-700"
                          }`}
                        >
                          {qrisPaid ? "Lunas" : qrisExpired ? "Kedaluwarsa" : "Menunggu Pembayaran"}
                        </div>
                        {qrisDynamic.expiresAt ? <QrisCountdown expiresAt={qrisDynamic.expiresAt} /> : null}

                        <div className="w-full">
                          {showQrisDebug && qrisDynamic.imageUrl ? (
                            <div className="mb-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="text-xs font-medium text-slate-600">QRIS image URL (sandbox)</div>
                              <input
                                value={qrisDynamic.imageUrl}
                                readOnly
                                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none"
                              />
                            </div>
                          ) : null}

                          {qrisExpired && !qrisPaid ? (
                            <button
                              type="button"
                              disabled={isGeneratingQris}
                              onClick={async () => {
                                setIsGeneratingQris(true);
                                try {
                                  const res = await startQrisDynamicForOrder(orderId);
                                  if (res.success) {
                                    setQrisPaid(false);
                                    setQrisDynamic(res.data);
                                    setQrisDynamicStatus("pending");
                                    show("QR baru berhasil dibuat");
                                    router.refresh();
                                    return;
                                  }
                                  show(res.error || "Gagal membuat QR baru");
                                } finally {
                                  setIsGeneratingQris(false);
                                }
                              }}
                              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                            >
                              {isGeneratingQris ? "Membuat QR..." : "Generate QR Baru"}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            disabled={isCheckingQris || qrisPaid}
                            onClick={async () => {
                              setIsCheckingQris(true);
                              try {
                                const res = await checkQrisDynamicPaymentStatus(qrisDynamic.paymentId);
                                if (res.success) {
                                  setQrisDynamicStatus(res.data.status);
                                  if (res.data.status === "paid") {
                                    setQrisPaid(true);
                                    show("Pembayaran QRIS berhasil (lunas)");
                                  } else if (res.data.status === "pending") {
                                    show("Pembayaran masih pending");
                                  } else if (res.data.status === "expired") {
                                    show("QRIS sudah kedaluwarsa");
                                  } else if (res.data.status === "failed") {
                                    show("Pembayaran gagal/ditolak");
                                  }
                                  router.refresh();
                                } else {
                                  show(res.error || "Gagal cek status pembayaran");
                                }
                              } finally {
                                setIsCheckingQris(false);
                              }
                            }}
                            className={`${
                              qrisExpired && !qrisPaid ? "mt-2 " : ""
                            }inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60`}
                          >
                            {qrisPaid ? "Sudah Dibayar" : isCheckingQris ? "Mengecek..." : "Cek Status Pembayaran"}
                          </button>
                        </div>
                      </>
                    ) : isGeneratingQris ? (
                      <div className="text-xs text-slate-500">Membuat QRIS dinamis...</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {payMethod !== "qris_dynamic" ? (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-5">
                <Button variant="outline" onClick={() => setPayingOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handlePayConfirm} disabled={isPaying || isGeneratingQris}>
                  {isPaying ? "Memproses..." : "Konfirmasi Bayar"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
