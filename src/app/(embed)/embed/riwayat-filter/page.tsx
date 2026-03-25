"use client";

import { useState } from "react";
import { HeightSender } from "../height-sender";

type Status = "semua" | "diterima" | "siap" | "diambil";

function normalizeStatus(value: string | null): Status {
  if (value === "diterima" || value === "siap" || value === "diambil") return value;
  return "semua";
}

function normalizeDate(value: string | null): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export default function RiwayatFilterEmbedPage() {
  const [initial] = useState(() => {
    if (typeof window === "undefined") return { status: "semua" as Status, from: "", to: "" };
    const sp = new URLSearchParams(window.location.search);
    return {
      status: normalizeStatus(sp.get("status")),
      from: normalizeDate(sp.get("from")),
      to: normalizeDate(sp.get("to")),
    };
  });

  const [status, setStatus] = useState<Status>(initial.status);
  const [dateFrom, setDateFrom] = useState<string>(initial.from);
  const [dateTo, setDateTo] = useState<string>(initial.to);

  function postFilters(next: { status: Status; dateFrom: string; dateTo: string }) {
    window.parent.postMessage({ type: "riwayat:filters", ...next }, "*");
  }

  return (
    <div id="embed-root" className="w-full">
      <HeightSender />
      <div className="w-full rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 p-5">
          <div className="text-sm font-semibold text-zinc-900">Filter Transaksi</div>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-zinc-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(normalizeStatus(e.target.value))}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
            >
              <option value="semua">Semua Status</option>
              <option value="diterima">Diterima</option>
              <option value="siap">Siap Diambil</option>
              <option value="diambil">Diambil</option>
            </select>
          </label>

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
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 p-5">
          <button
            type="button"
            onClick={() => postFilters({ status: "semua", dateFrom: "", dateTo: "" })}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Hapus Filter
          </button>
          <button
            type="button"
            onClick={() => postFilters({ status, dateFrom, dateTo })}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
