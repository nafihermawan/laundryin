"use client";

import { useState } from "react";
import { HeightSender } from "../height-sender";

type PaymentMethod = "all" | "cash" | "transfer" | "qris_manual" | "qris_dynamic";
type PaymentStatus = "all" | "paid" | "pending" | "expired" | "failed";

function normalizeMethod(value: string | null): PaymentMethod {
  if (value === "cash" || value === "transfer" || value === "qris_manual" || value === "qris_dynamic") return value;
  return "all";
}

function normalizeStatus(value: string | null): PaymentStatus {
  if (value === "paid" || value === "pending" || value === "expired" || value === "failed") return value;
  if (value === "all") return "all";
  return "paid";
}

function normalizeDate(value: string | null): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export default function AdminLaporanFilterEmbedPage() {
  const [initial] = useState(() => {
    if (typeof window === "undefined") return { from: "", to: "", method: "all" as PaymentMethod, status: "paid" as PaymentStatus };
    const sp = new URLSearchParams(window.location.search);
    return {
      from: normalizeDate(sp.get("from")),
      to: normalizeDate(sp.get("to")),
      method: normalizeMethod(sp.get("method")),
      status: normalizeStatus(sp.get("status")),
    };
  });

  const [dateFrom, setDateFrom] = useState<string>(initial.from);
  const [dateTo, setDateTo] = useState<string>(initial.to);
  const [method, setMethod] = useState<PaymentMethod>(initial.method);
  const [status, setStatus] = useState<PaymentStatus>(initial.status);

  function postFilters(next: { from: string; to: string; method: PaymentMethod; status: PaymentStatus }) {
    window.parent.postMessage({ type: "admin:laporan-filters", ...next }, "*");
  }

  return (
    <div id="embed-root" className="w-full">
      <HeightSender />
      <div className="w-full rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 p-5">
          <div className="text-sm font-semibold text-zinc-900">Filter Laporan</div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-600">Tanggal dari</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(normalizeDate(e.target.value))}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium text-zinc-600">Tanggal sampai</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(normalizeDate(e.target.value))}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-600">Metode Pembayaran</span>
            <select
              value={method}
              onChange={(e) => setMethod(normalizeMethod(e.target.value))}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
            >
              <option value="all">Semua</option>
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="qris_manual">QRIS Manual</option>
              <option value="qris_dynamic">QRIS Dinamis</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-600">Status Pembayaran</span>
            <select
              value={status}
              onChange={(e) => setStatus(normalizeStatus(e.target.value))}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="failed">Failed</option>
              <option value="all">Semua</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-5">
          <button
            type="button"
            onClick={() => postFilters({ from: "", to: "", method: "all", status: "paid" })}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => postFilters({ from: dateFrom, to: dateTo, method, status })}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}

