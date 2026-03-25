"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openShift, closeShift } from "./actions";

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type ShiftFormProps = {
  isOpen: boolean;
  registerId?: string;
  expectedCash?: number;
  startingCash?: number;
  openedAt?: string;
};

export function ShiftForm({ isOpen, registerId, expectedCash = 0, startingCash = 0, openedAt }: ShiftFormProps) {
  const router = useRouter();
  const [cashInput, setCashInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const cashValue = Number(cashInput);
    if (isNaN(cashValue) || cashValue < 0) {
      setError("Nominal uang tidak valid");
      setIsSubmitting(false);
      return;
    }

    if (!isOpen) {
      // Buka Kas
      const result = await openShift(cashValue);
      if (result.success) {
        setSuccessMsg("Shift kasir berhasil dibuka. Anda sudah bisa memulai transaksi.");
        setCashInput("");
        router.refresh();
      } else {
        setError(result.error || "Gagal membuka shift");
      }
    } else {
      // Tutup Kas
      if (!registerId) return;
      
      const result = await closeShift(registerId, cashValue, notes);
      if (result.success) {
        setSuccessMsg("Shift kasir berhasil ditutup.");
        setCashInput("");
        setNotes("");
        router.refresh();
      } else {
        setError(result.error || "Gagal menutup shift");
      }
    }
    
    setIsSubmitting(false);
  }

  const cashNum = Number(cashInput) || 0;
  const variance = cashNum - expectedCash;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {isOpen && (
        <div className="flex flex-col gap-4 rounded-xl bg-zinc-50 p-4 border border-zinc-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Waktu Buka</span>
            <span className="font-medium text-zinc-900">
              {openedAt ? new Date(openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Modal Awal</span>
            <span className="font-medium text-zinc-900">{formatIDR(startingCash)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-zinc-200">
            <span className="font-medium text-zinc-700">Sistem (Expected)</span>
            <span className="font-bold text-sky-600">{formatIDR(expectedCash)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="cashInput" className="text-sm font-medium text-zinc-700">
          {isOpen ? "Uang Fisik di Laci (Actual)" : "Modal Awal (Starting Cash)"}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">Rp</span>
          <input
            id="cashInput"
            type="number"
            required
            min="0"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            placeholder="0"
          />
        </div>
      </div>

      {isOpen && (
        <>
          <div className={`flex justify-between items-center rounded-xl p-3 text-sm font-medium border ${
            variance === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
            variance < 0 ? "bg-red-50 text-red-700 border-red-100" : "bg-amber-50 text-amber-700 border-amber-100"
          }`}>
            <span>Selisih (Variance)</span>
            <span>
              {variance > 0 ? "+" : ""}{formatIDR(variance)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="text-sm font-medium text-zinc-700">
              Catatan (Opsional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder={variance !== 0 ? "Jelaskan alasan ada selisih uang..." : "Catatan tambahan..."}
              rows={3}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {isSubmitting ? "Memproses..." : isOpen ? "Tutup Shift" : "Buka Shift"}
      </button>
    </form>
  );
}
