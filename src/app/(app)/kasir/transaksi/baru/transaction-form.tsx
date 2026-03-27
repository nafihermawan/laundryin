"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveTransaction } from "./actions";
import { createClient } from "@/lib/supabase/browser";
import { QRCodeCanvas } from "qrcode.react";

type Unit = "kg" | "pcs";

type ServiceOption = {
  id: string;
  name: string;
  unit: string;
  base_price: number;
};

type ItemRow = {
  id: string;
  serviceName: string;
  unit: Unit;
  qty: number;
  price: number;
};

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "qris_manual", label: "QRIS Manual" },
  { value: "qris_dynamic", label: "QRIS Dinamis" },
] as const;

export function TransactionForm() {
  const [mounted, setMounted] = useState(false);
  const nextItemIdRef = useRef(1);
  const [dbServices, setDbServices] = useState<ServiceOption[]>([]);

  useEffect(() => {
    const supabase = createClient();
    async function fetchServices() {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (data) setDbServices(data);
      setMounted(true);
    }
    fetchServices();
  }, []);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [receivedAt, setReceivedAt] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setReceivedAt(localISOTime);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 16);
  });
  const [paymentMethod, setPaymentMethod] = useState<
    (typeof paymentOptions)[number]["value"]
  >("cash");
  const [cashReceived, setCashReceived] = useState("");

  const [items, setItems] = useState<ItemRow[]>(() => [
    { id: "0", serviceName: "", unit: "kg", qty: 1, price: 0 },
  ]);

  const summary = useMemo(() => {
    const lineTotals = items.map((it) => Math.max(0, it.qty) * Math.max(0, it.price));
    const total = lineTotals.reduce((a, b) => a + b, 0);
    const totalQty = items.reduce((a, b) => a + Math.max(0, b.qty), 0);
    return { lineTotals, total, totalQty, itemCount: items.length };
  }, [items]);

  const canSubmit = useMemo(() => {
    if (!customerName.trim()) return false;
    if (items.length === 0) return false;
    if (!items.some((it) => it.serviceName.trim() && it.qty > 0)) return false;
    if (paymentMethod === "cash") {
      const received = toNumber(cashReceived);
      if (!Number.isFinite(received)) return false;
      if (received < summary.total) return false;
    }
    return true;
  }, [cashReceived, customerName, items, paymentMethod, summary.total]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [qrisDynamic, setQrisDynamic] = useState<{
    orderNo: string;
    paymentId: string;
    providerRef: string;
    qrString: string;
    imageUrl: string | null;
    expiresAt: string | null;
  } | null>(null);
  const [qrisPaid, setQrisPaid] = useState(false);

  useEffect(() => {
    if (!saveError && !saveSuccess) return;
    const t = window.setTimeout(() => {
      setSaveError(null);
      setSaveSuccess(null);
    }, 7000);
    return () => window.clearTimeout(t);
  }, [saveError, saveSuccess]);

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

  function resetFormInputs() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerNote("");
    setCashReceived("");
    
    // Reset dates to current local time
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - tzOffset);
    
    setReceivedAt(localNow.toISOString().slice(0, 16));
    
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    const localDue = new Date(d.getTime() - tzOffset);
    setDueAt(localDue.toISOString().slice(0, 16));
    
    setPaymentMethod("cash");
    nextItemIdRef.current = 1;
    setItems([{ id: "0", serviceName: "", unit: "kg", qty: 1, price: 0 }]);
  }

  async function handleSave() {
    if (!customerName.trim()) {
      setSaveError("Nama pelanggan wajib diisi");
      return;
    }

    const validItems = items.filter((it) => it.serviceName.trim() && it.qty > 0);
    if (validItems.length === 0) {
      setSaveError("Minimal 1 item layanan wajib diisi");
      return;
    }

    if (paymentMethod === "cash") {
      const received = toNumber(cashReceived);
      if (!Number.isFinite(received)) {
        setSaveError("Uang diterima wajib diisi");
        return;
      }
      if (received < summary.total) {
        setSaveError("Uang diterima tidak mencukupi total tagihan");
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const result = await saveTransaction({
      customer: {
        name: customerName,
        phone: customerPhone,
        notes: customerNote,
      },
      items: validItems.map((it) => ({
        serviceName: it.serviceName,
        unit: it.unit,
        qty: it.qty,
        price: it.price,
      })),
      status: "diterima",
      paymentMethod,
      cashReceived:
        paymentMethod === "cash" && cashReceived.trim() !== ""
          ? toNumber(cashReceived)
          : undefined,
      receivedAt,
      dueAt,
      total: summary.total,
    });

    if (result.success) {
      setIsSaving(false);
      if (result.data.qris) {
        setQrisPaid(false);
        setQrisDynamic({
          orderNo: result.data.orderNo,
          paymentId: result.data.qris.paymentId,
          providerRef: result.data.qris.providerRef,
          qrString: result.data.qris.qrString,
          imageUrl: result.data.qris.imageUrl,
          expiresAt: result.data.qris.expiresAt,
        });
        setSaveSuccess(`Transaksi ${result.data.orderNo} berhasil dibuat. Menunggu pembayaran QRIS.`);
        resetFormInputs();
      } else {
        resetFormInputs();
        setSaveSuccess(`Transaksi ${result.data.orderNo} berhasil disimpan!`);
      }
    } else {
      setSaveError(result.error || "Gagal menyimpan transaksi");
      setIsSaving(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="text-sm text-zinc-500">Memuat form...</div>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const simulatorImageUrl =
    qrisDynamic && origin ? `${origin}/v2/qris/${qrisDynamic.providerRef}/qr-code` : null;

  return (
    <div className="relative pb-24 lg:pb-0">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-6">
        {saveError ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            <div className="flex-1">{saveError}</div>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-red-600/80 transition hover:bg-red-500/10 hover:text-red-700"
              aria-label="Tutup"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : null}

        {saveSuccess ? (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            <div className="flex-1">{saveSuccess}</div>
            <button
              type="button"
              onClick={() => setSaveSuccess(null)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-emerald-700/80 transition hover:bg-emerald-500/10 hover:text-emerald-800"
              aria-label="Tutup"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : null}

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold tracking-tight">Pelanggan</h2>
              <div className="text-xs text-zinc-500">
                Wajib isi nama pelanggan
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">Nama</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama pelanggan"
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">No. HP</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="08xxxxxxxxxx"
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">Catatan</span>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                className="min-h-[96px] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold tracking-tight">
              Item Layanan
            </h2>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => {
                  const id = String(nextItemIdRef.current++);
                  return [
                    ...prev,
                    { id, serviceName: "", unit: "kg", qty: 1, price: 0 },
                  ];
                })
              }
              className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            >
              Tambah Item
            </button>
          </div>

          <div className="mt-4">
            <div className="hidden grid-cols-[1fr_80px_100px_130px_44px] gap-3 border-b border-zinc-100 pb-3 text-xs font-medium text-zinc-500 sm:grid">
                <div>Layanan</div>
                <div>Satuan</div>
                <div>Qty</div>
                <div>Harga</div>
                <div />
            </div>

            <div className="flex flex-col gap-4 pt-3">
              {items.map((it, idx) => {
                const lineTotal = summary.lineTotals[idx] ?? 0;
                return (
                  <div
                    key={it.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_80px_100px_130px_44px] sm:items-start">
                      <div className="flex flex-col gap-1 sm:contents">
                        <span className="text-xs font-medium text-zinc-500 sm:hidden">
                          Layanan
                        </span>
                        <select
                          value={it.serviceName}
                          onChange={(e) => {
                            const selectedSvc = dbServices.find(s => s.name === e.target.value);
                            setItems((prev) =>
                              prev.map((row) =>
                                row.id === it.id
                                  ? { 
                                      ...row, 
                                      serviceName: e.target.value,
                                      unit: (selectedSvc?.unit as Unit) || row.unit,
                                      price: selectedSvc?.base_price ?? row.price
                                    }
                                  : row
                              )
                            );
                          }}
                          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
                        >
                          <option value="" disabled>
                            Pilih layanan
                          </option>
                          {dbServices.length > 0 ? (
                            dbServices.map((svc) => (
                              <option key={svc.id} value={svc.name}>
                                {svc.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="cuci + setrika">Cuci + Setrika</option>
                              <option value="cuci kering saja">Cuci Kering Saja</option>
                              <option value="setrika saja">Setrika Saja</option>
                              <option value="bed cover">Bed Cover</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:contents">
                        <div className="flex flex-col gap-1 sm:contents">
                          <span className="text-xs font-medium text-zinc-500 sm:hidden">
                            Satuan
                          </span>
                          <select
                            value={it.unit}
                            disabled
                            className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 outline-none appearance-none"
                          >
                            <option value="kg">Kg</option>
                            <option value="pcs">Pcs</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1 sm:contents">
                          <span className="text-xs font-medium text-zinc-500 sm:hidden">
                            Qty
                          </span>
                          <div className="flex flex-col gap-1">
                            <input
                              value={String(it.qty)}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((row) =>
                                    row.id === it.id
                                      ? { ...row, qty: toNumber(e.target.value) }
                                      : row
                                  )
                                )
                              }
                              inputMode="decimal"
                              className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
                            />
                            <div className="text-xs text-zinc-500">
                              Subtotal: {formatIDR(lineTotal)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 sm:contents">
                        <span className="text-xs font-medium text-zinc-500 sm:hidden">
                          Harga
                        </span>
                        <input
                          value={String(it.price)}
                          readOnly
                          tabIndex={-1}
                          inputMode="numeric"
                          placeholder="0"
                          className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-500 outline-none"
                        />
                      </div>

                      <div className="flex items-end justify-end sm:items-center sm:justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setItems((prev) =>
                              prev.length <= 1
                                ? prev
                                : prev.filter((row) => row.id !== it.id)
                            )
                          }
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Hapus item"
                          title="Hapus"
                          disabled={items.length <= 1}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M6 7H18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M10 11V17"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M14 11V17"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M9 7L10 5H14L15 7"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M7 7L8 20H16L17 7"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">Ringkasan</h2>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Layanan Terpilih</span>
              <div className="flex flex-col gap-1.5">
                {items.filter(it => it.serviceName.trim()).length > 0 ? (
                  items.filter(it => it.serviceName.trim()).map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-2">
                      <span className="text-zinc-700 truncate">{it.serviceName}</span>
                      <span className="font-medium text-zinc-900 shrink-0">{it.qty} {it.unit}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-400 italic text-xs">Belum ada layanan</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3">
              <span className="text-zinc-600 font-medium">Total</span>
              <span className="text-base font-semibold tracking-tight text-sky-600">
                {formatIDR(summary.total)}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">
                  Tanggal Masuk
                </span>
                <input
                  type="datetime-local"
                  value={receivedAt}
                  readOnly
                  disabled
                  className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500 outline-none cursor-not-allowed"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">
                  Estimasi Selesai
                </span>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">
                Pembayaran
              </span>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const next = e.target.value as (typeof paymentOptions)[number]["value"];
                  setPaymentMethod(next);
                  if (next === "cash" && cashReceived.trim() === "") {
                    setCashReceived(String(summary.total));
                  }
                }}
                className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
              >
                {paymentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {paymentMethod === "cash" ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">
                  Uang Diterima
                </span>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  inputMode="numeric"
                  placeholder={String(summary.total)}
                  className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
                />
                <span className="text-xs text-zinc-500">
                  Kembalian: {formatIDR(toNumber(cashReceived) - summary.total)}
                </span>
              </label>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={!canSubmit || isSaving}
              onClick={handleSave}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
            >
              {isSaving
                ? "Memproses..."
                : paymentMethod === "cash" || paymentMethod === "qris_dynamic"
                  ? "Bayar"
                  : "Simpan Transaksi"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetFormInputs();
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            >
              Reset
            </button>
          </div>
        </section>
      </aside>
      </div>

      <div className="fixed inset-x-0 bottom-14 z-30 lg:hidden">
        <div className="mx-auto w-full max-w-6xl px-3 pb-2 sm:px-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex flex-col">
              <div className="text-xs font-medium text-zinc-500">Total</div>
              <div className="text-base font-semibold tracking-tight text-sky-600">
                {formatIDR(summary.total)}
              </div>
            </div>
            <div className="text-xs text-zinc-500">{summary.itemCount} item</div>
          </div>
        </div>
      </div>

      {qrisDynamic ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold text-zinc-900">QRIS Dinamis</div>
                <div className="text-xs text-zinc-500">{qrisDynamic.orderNo}</div>
              </div>
              <button
                type="button"
                onClick={() => setQrisDynamic(null)}
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
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                  <QRCodeCanvas value={qrisDynamic.qrString} size={240} />
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
              </div>

              {simulatorImageUrl ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs font-medium text-zinc-600">QR Code Image URL (Sandbox Simulator)</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={simulatorImageUrl}
                      readOnly
                      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const url = simulatorImageUrl;
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

              <div className="text-xs text-zinc-500">
                Scan QR menggunakan aplikasi e-wallet atau mobile banking yang mendukung QRIS.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-5">
              <button
                type="button"
                onClick={() => setQrisDynamic(null)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
