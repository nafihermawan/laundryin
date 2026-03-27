"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { payOrder, startQrisDynamicForOrder, updateOrderStatus, type PayOrderInput } from "../actions";
import { createClient } from "@/lib/supabase/browser";
import { QRCodeCanvas } from "qrcode.react";

function getLaundryStatus(status: string) {
  return status === "diproses" ? "diterima" : status;
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

type Props = {
  orderId: string;
  orderNo: string;
  customerName: string;
  currentStatus: string;
  isPaid: boolean;
  total: number;
};

export function TransactionActions({
  orderId,
  orderNo,
  customerName,
  currentStatus,
  isPaid,
  total,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(getLaundryStatus(currentStatus));
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [payingOpen, setPayingOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PayOrderInput["method"] | "qris_dynamic">("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [referenceNo, setReferenceNo] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isGeneratingQris, setIsGeneratingQris] = useState(false);
  const [qrisDynamic, setQrisDynamic] = useState<{
    paymentId: string;
    qrString: string;
    imageUrl: string | null;
    expiresAt: string | null;
  } | null>(null);
  const [qrisPaid, setQrisPaid] = useState(false);

  useEffect(() => {
    setStatus(getLaundryStatus(currentStatus));
  }, [currentStatus]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  function openPayModal() {
    setPayingOpen(true);
    setPayMethod("cash");
    setCashReceived(total > 0 ? String(total) : "");
    setReferenceNo("");
    setPayNotes("");
    setQrisDynamic(null);
    setQrisPaid(false);
  }

  async function handleStatusChange(nextStatus: string) {
    setStatus(nextStatus);
    const res = await updateOrderStatus(orderId, nextStatus);
    if (res.success) {
      setToast({ type: "success", message: "Status transaksi berhasil diperbarui." });
      router.refresh();
      return;
    }
    setToast({ type: "error", message: res.error || "Gagal memperbarui status." });
  }

  async function handlePayConfirm() {
    if (payMethod === "qris_dynamic") {
      setIsGeneratingQris(true);
      const res = await startQrisDynamicForOrder(orderId);
      setIsGeneratingQris(false);
      if (res.success) {
        setQrisPaid(false);
        setQrisDynamic(res.data);
        return;
      }
      setToast({ type: "error", message: res.error || "Gagal membuat QRIS dinamis." });
      return;
    }

    const cashReceivedNumber =
      payMethod === "cash" && cashReceived.trim() !== "" ? Number(cashReceived) : undefined;

    if (payMethod === "cash") {
      if (typeof cashReceivedNumber !== "number" || cashReceivedNumber < total) {
        setToast({ type: "error", message: "Uang diterima tidak mencukupi total tagihan!" });
        return;
      }
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
      setToast({ type: "success", message: "Pembayaran berhasil disimpan." });
      router.refresh();
      return;
    }
    setToast({ type: "error", message: res.error || "Gagal menyimpan pembayaran." });
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
      if (data?.status === "paid") setQrisPaid(true);
    }

    fetchCurrent();

    const channel = supabase
      .channel(`payments:${paymentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
          filter: `id=eq.${paymentId}`,
        },
        (payload: unknown) => {
          const nextStatus = (payload as { new?: { status?: unknown } })?.new?.status;
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
    if (!qrisPaid) return;
    if (!payingOpen) return;
    setPayingOpen(false);
    setToast({ type: "success", message: "Pembayaran QRIS berhasil (lunas)." });
    router.refresh();
  }, [payingOpen, qrisPaid, router]);

  return (
    <div className="flex flex-col gap-4">
      {toast ? (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : "border-red-500/30 bg-red-500/10 text-red-600"
          }`}
        >
          <div className="flex-1">{toast.message}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-black/5"
            aria-label="Tutup"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base font-semibold tracking-tight">Aksi</div>
          <div className="text-xs text-zinc-500">
            {orderNo} · {customerName}
          </div>
        </div>
        {!isPaid ? (
          <button
            type="button"
            onClick={openPayModal}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Bayar
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium text-zinc-600">Status Cucian</div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
        >
          <option value="diterima" hidden>
            Diterima
          </option>
          <option value="siap">Siap Diambil</option>
          <option value="diambil">Sudah Diambil</option>
        </select>
      </div>

      {payingOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-zinc-900">Bayar Order</div>
                <div className="text-xs text-zinc-500">
                  {orderNo} · {customerName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                aria-label="Tutup"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-zinc-600">Metode</div>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PayOrderInput["method"] | "qris_dynamic")}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
                >
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris_manual">QRIS Manual</option>
                  <option value="qris_dynamic">QRIS Dinamis</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <div className="text-xs font-medium text-zinc-600">Total Tagihan</div>
                  <div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-900">
                    {formatIDR(total)}
                  </div>
                </div>
                {payMethod === "cash" ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-zinc-600">Uang Diterima</div>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
                      inputMode="numeric"
                    />
                    <div className="text-xs text-zinc-500">
                      Kembalian: {formatIDR((Number(cashReceived || 0) || 0) - total)}
                    </div>
                  </div>
                ) : payMethod === "qris_dynamic" ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-zinc-600">QRIS</div>
                    <div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600">
                      {qrisPaid ? "Lunas" : "Menunggu pembayaran"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-zinc-600">No. Referensi (Opsional)</div>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium text-zinc-600">Catatan (Opsional)</div>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
                />
              </div>

              {payMethod === "qris_dynamic" ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                  {qrisDynamic ? (
                    <>
                      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                        <QRCodeCanvas value={qrisDynamic.qrString} size={220} />
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          qrisPaid ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
                        }`}
                      >
                        {qrisPaid ? "Lunas" : "Menunggu Pembayaran"}
                      </div>
                      {qrisDynamic.expiresAt ? (
                        <div className="text-xs text-zinc-500">
                          Kedaluwarsa: {new Date(qrisDynamic.expiresAt).toLocaleString("id-ID")}
                        </div>
                      ) : null}
                      {qrisDynamic.imageUrl ? (
                        <div className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="text-xs font-medium text-zinc-600">QR Code Image URL (Sandbox Simulator)</div>
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={qrisDynamic.imageUrl}
                              readOnly
                              className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-700 outline-none"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const url = qrisDynamic.imageUrl;
                                  if (!url) return;
                                  await navigator.clipboard.writeText(url);
                                } catch {}
                              }}
                              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-xs text-zinc-500">
                      Klik Generate untuk membuat QRIS dinamis, lalu customer scan untuk bayar.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-5">
              <button
                type="button"
                onClick={() => setPayingOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePayConfirm}
                disabled={isPaying || isGeneratingQris}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {payMethod === "qris_dynamic"
                  ? isGeneratingQris
                    ? "Membuat QR..."
                    : qrisDynamic
                      ? "Generate Ulang"
                      : "Generate QR"
                  : isPaying
                    ? "Memproses..."
                    : "Konfirmasi Bayar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
