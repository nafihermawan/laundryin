"use client";

import { useEffect, useMemo, useRef, useState, useCallback, useTransition } from "react";
import { TransactionRow } from "@/lib/data/transactions";

type Transaction = TransactionRow;

const statusColors: Record<string, string> = {
  diterima: "bg-blue-100 text-blue-700 border-blue-200",
  diproses: "bg-blue-100 text-blue-700 border-blue-200",
  siap: "bg-emerald-100 text-emerald-700 border-emerald-200",
  diambil: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const paymentColors: Record<"paid" | "pending", string> = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

export function TransactionList({ initialTransactions }: { initialTransactions: Transaction[] }) {
  const [isPending] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<"semua" | "paid" | "unpaid">("semua");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterHeight, setFilterHeight] = useState<number | null>(null);
  const [detailOrder, setDetailOrder] = useState<Transaction | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  const detailFrameRef = useRef<HTMLIFrameElement | null>(null);
  const filterFrameRef = useRef<HTMLIFrameElement | null>(null);

  const transactions = initialTransactions;

  useEffect(() => {
    function update() {
      setViewportHeight(window.innerHeight || 0);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof window === "undefined") return;
      try {
        const eventUrl = new URL(event.origin);
        const appUrl = new URL(window.location.origin);
        const allowedHosts = new Set(["localhost", "127.0.0.1"]);
        const hostOk =
          eventUrl.hostname === appUrl.hostname ||
          (allowedHosts.has(eventUrl.hostname) && allowedHosts.has(appUrl.hostname));
        if (!hostOk) return;
        if (eventUrl.protocol !== appUrl.protocol) return;
        if (eventUrl.port !== appUrl.port) return;
      } catch {
        return;
      }
      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (record.type === "embed:height") {
        const h = record.height;
        if (typeof h !== "number" || !Number.isFinite(h) || h <= 0) return;
        const next = Math.min(Math.max(Math.round(h), 240), 2000);
        const source = event.source as Window | null;
        if (filterFrameRef.current?.contentWindow && source === filterFrameRef.current.contentWindow) {
          setFilterHeight(next);
          return;
        }
        return;
      }

      if (record.type === "embed:close") {
        const source = event.source as Window | null;
        if (detailFrameRef.current?.contentWindow && source === detailFrameRef.current.contentWindow) {
          setDetailOrder(null);
        }
        return;
      }

      if (record.type === "riwayat:filters") {
        const source = event.source as Window | null;
        if (filterFrameRef.current?.contentWindow && source !== filterFrameRef.current.contentWindow) return;

        const status = record.status;
        const paymentStatus = record.paymentStatus;
        const from = record.dateFrom;
        const to = record.dateTo;

        if (typeof status !== "string") return;
        if (typeof paymentStatus !== "string") return;
        if (typeof from !== "string") return;
        if (typeof to !== "string") return;

        const normalizedStatus =
          status === "semua" || status === "diterima" || status === "siap" || status === "diambil"
            ? status
            : "semua";
        const normalizedPaymentStatus =
          paymentStatus === "semua" || paymentStatus === "paid" || paymentStatus === "unpaid"
            ? paymentStatus
            : "semua";
        const normalizedFrom = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : "";
        const normalizedTo = /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : "";

        setFilterStatus(normalizedStatus);
        setFilterPaymentStatus(normalizedPaymentStatus);
        setDateFrom(normalizedFrom);
        setDateTo(normalizedTo);
        setPage(1);
        setFilterOpen(false);
        setFilterHeight(null);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const updateFilterHeightFromFrame = useCallback(() => {
    const frame = filterFrameRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const root =
        (doc.getElementById("embed-root") as HTMLElement | null) ??
        (doc.body.firstElementChild as HTMLElement | null) ??
        doc.body;
      const h = Math.ceil(root.getBoundingClientRect().height);
      if (!Number.isFinite(h) || h <= 0) return;
      setFilterHeight(Math.min(Math.max(Math.round(h), 240), 2000));
    } catch {}
  }, []);

  function isOrderPaid(t: Transaction) {
    return (t.payments ?? []).some((p) => p.status === "paid");
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

  function getPaymentLabel(t: Transaction) {
    return isOrderPaid(t) ? "Sudah Bayar" : "Belum Bayar";
  }

  const filteredTransactions = transactions.filter((t) => {
    const customerName = t.customer?.name || "Tanpa Nama";
    const matchesSearch =
      t.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "semua" || getLaundryStatus(t.status) === filterStatus;
    const paid = isOrderPaid(t);
    const matchesPayment =
      filterPaymentStatus === "semua" ||
      (filterPaymentStatus === "paid" && paid) ||
      (filterPaymentStatus === "unpaid" && !paid);
    const receivedISO = new Date(t.received_at).toISOString().slice(0, 10);
    const matchesFrom = dateFrom ? receivedISO >= dateFrom : true;
    const matchesTo = dateTo ? receivedISO <= dateTo : true;
    return matchesSearch && matchesStatus && matchesPayment && matchesFrom && matchesTo;
  });

  const pageSize = 10;
  const pageCount = useMemo(() => {
    const total = filteredTransactions.length;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [filteredTransactions.length, pageSize]);

  const currentPage = Math.min(page, pageCount);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [currentPage, filteredTransactions, pageSize]);

  const pageStart = filteredTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, filteredTransactions.length);
  const maxModalHeight = viewportHeight > 0 ? Math.round(viewportHeight * 0.85) : null;

  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Cari No. Order / Nama..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setFilterOpen(true);
            setFilterHeight(null);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9v7l4 2v-9l8-9z" />
          </svg>
          Filter
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium text-zinc-500">
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">No. Order / Tanggal</th>
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">Pelanggan</th>
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">Status Cucian</th>
                <th className="whitespace-nowrap px-3 py-3 sm:px-4">Status Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isPending ? (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center text-zinc-500 sm:px-4">
                    Memproses riwayat transaksi...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center text-zinc-500 sm:px-4">
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr key={t.id || t.order_no} className="group hover:bg-zinc-50/50">
                    <td className="px-3 py-3 sm:px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailOrder(t);
                        }}
                        className="block w-full rounded-lg text-left outline-none transition hover:bg-zinc-50 focus:bg-zinc-50 focus:ring-4 focus:ring-sky-400/10"
                      >
                        <div className="flex flex-col">
                          <span className="break-all font-semibold text-zinc-900">{t.order_no}</span>
                          <span className="text-xs text-zinc-500">{formatDate(t.received_at)}</span>
                          <span className="hidden text-xs text-zinc-500 sm:block">
                            Dibuat oleh: {t.created_by_profile?.full_name || "User"}
                          </span>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900">{t.customer?.name || "Tanpa Nama"}</span>
                        <span className="hidden text-xs text-zinc-500 sm:block">{t.customer?.phone || "-"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColors[getLaundryStatus(t.status)] || "bg-zinc-100 text-zinc-700"}`}>
                        {getLaundryStatusLabel(t.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${isOrderPaid(t) ? paymentColors.paid : paymentColors.pending}`}>
                        {getPaymentLabel(t)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-zinc-500">
            Menampilkan <span className="font-medium text-zinc-700">{pageStart}</span>–
            <span className="font-medium text-zinc-700">{pageEnd}</span> dari{" "}
            <span className="font-medium text-zinc-700">{filteredTransactions.length}</span> transaksi
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isPending}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
            >
              Sebelumnya
            </button>
            <div className="text-xs text-zinc-600">
              Halaman <span className="font-medium text-zinc-900">{currentPage}</span> /{" "}
              <span className="font-medium text-zinc-900">{pageCount}</span>
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount || isPending}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {filterOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setFilterOpen(false);
              setFilterHeight(null);
            }
          }}
        >
          <div
            className="w-full max-w-md overflow-auto rounded-2xl shadow-xl"
            style={{
              maxHeight: maxModalHeight ? `${maxModalHeight}px` : "85vh",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <iframe
              src={`/embed/riwayat-filter?status=${encodeURIComponent(filterStatus)}&payment=${encodeURIComponent(filterPaymentStatus)}&from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}`}
              className="w-full rounded-2xl bg-transparent"
              style={{ height: filterHeight ? `${filterHeight}px` : "360px" }}
              frameBorder={0}
              scrolling="no"
              ref={filterFrameRef}
              onLoad={() => {
                updateFilterHeightFromFrame();
                window.setTimeout(updateFilterHeightFromFrame, 50);
                window.setTimeout(updateFilterHeightFromFrame, 200);
                window.setTimeout(updateFilterHeightFromFrame, 500);
              }}
            />
          </div>
        </div>
      ) : null}

      {detailOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDetailOrder(null);
            }
          }}
        >
          {detailOrder.id ? (
            <div
              className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-xl"
              style={{
                height: maxModalHeight ? `${maxModalHeight}px` : "85vh",
              }}
            >
              <iframe
                src={`/embed/riwayat-detail/${detailOrder.id}`}
                className="h-full w-full rounded-2xl bg-transparent"
                frameBorder={0}
                scrolling="yes"
                ref={detailFrameRef}
              />
            </div>
          ) : (
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
              Detail tidak tersedia untuk transaksi ini.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
