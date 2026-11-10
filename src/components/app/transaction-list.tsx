"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, Check, Search, SlidersHorizontal } from "lucide-react";

import { RiwayatFilterSheet } from "@/components/app/riwayat-filter-sheet";
import { DEFAULT_FILTERS, effectiveRange, filtersToQuery, normalizeCucian, type Filters } from "@/lib/riwayat-filters";
import type { TransactionRow } from "@/lib/data/transactions";

type Transaction = TransactionRow;

const PAGE_SIZE = 10;

function formatRp(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

function formatJam(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function jakartaKeyOf(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function formatGroupDate(dateKey: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function orderTotal(t: Transaction) {
  return (t.order_items ?? []).reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0);
}

function isPaid(t: Transaction) {
  return (t.payments ?? []).some((p) => p.status === "paid");
}

function cucianMatches(filter: Filters["cucian"], orderStatus: string) {
  if (filter === "semua") return true;
  const status = normalizeCucian(orderStatus);
  if (filter === "siap-diambil") return status === "siap";
  return status === filter;
}

function StatusPill({ status }: { status: string }) {
  let classes = "bg-slate-100 text-slate-600";
  let label = status;
  if (status === "diterima") {
    classes = "bg-blue-50 text-blue-700";
    label = "Diterima";
  } else if (status === "siap") {
    classes = "bg-emerald-50 text-emerald-700";
    label = "Siap diambil";
  } else if (status === "diambil") {
    classes = "bg-slate-100 text-slate-600";
    label = "Sudah diambil";
  }
  return (
    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function TransactionRowItem({ t, href }: { t: Transaction; href: string }) {
  const name = t.customer?.name || "Tanpa Nama";
  const paid = isPaid(t);

  return (
    <Link href={href} className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-slate-50">
      <div className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900">{name}</span>
        <span className="shrink-0 text-[15px] font-semibold text-slate-900 tabular-nums">
          {formatRp(orderTotal(t))}
        </span>
      </div>

      <div className="flex items-center gap-1 text-[13px] text-slate-500">
        <span className="whitespace-nowrap font-medium">{t.order_no}</span>
        <span>·</span>
        <span className="tabular-nums">{formatJam(t.received_at)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <StatusPill status={normalizeCucian(t.status)} />
        {paid ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Lunas
          </span>
        ) : (
          <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-orange-50 px-2.5 text-xs font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Belum bayar
          </span>
        )}
      </div>
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="card divide-y divide-slate-200 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-6 w-28 animate-pulse rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function RiwayatToolbar({
  searchInput,
  onSearchChange,
  filters,
  onApply,
}: {
  searchInput: string;
  onSearchChange: (value: string) => void;
  filters: Filters;
  onApply: (filters: Filters) => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari no. order atau nama"
            aria-label="Cari transaksi"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-[38px] pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
        <button
          type="button"
          ref={filterButtonRef}
          onClick={() => setFilterOpen(true)}
          aria-label="Filter tanggal dan lainnya"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
      <RiwayatFilterSheet
        open={filterOpen}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={onApply}
        returnFocusTo={filterButtonRef}
      />
    </>
  );
}

export function TransactionList({
  initialTransactions,
  initialFilters = DEFAULT_FILTERS,
  initialQuery = "",
  detailBasePath = "/kasir/riwayat",
}: {
  initialTransactions: Transaction[];
  initialFilters?: Filters;
  initialQuery?: string;
  detailBasePath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isPending, startTransition] = useTransition();

  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStart = useRef<number | null>(null);

  const [hasScrolled, setHasScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const transactions = initialTransactions;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(searchInput);
      setVisibleCount(PAGE_SIZE);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const params = filtersToQuery(filters, query);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }, [filters, query, pathname]);

  useEffect(() => {
    function onScroll() {
      if (window.scrollY > 8) setHasScrolled(true);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ordered = useMemo(() => {
    const range = effectiveRange(filters);
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => {
        const name = (t.customer?.name || "Tanpa Nama").toLowerCase();
        if (q && !(t.order_no.toLowerCase().includes(q) || name.includes(q))) return false;
        if (!cucianMatches(filters.cucian, t.status)) return false;
        if (filters.bayar === "lunas" && !isPaid(t)) return false;
        if (filters.bayar === "belum" && isPaid(t)) return false;
        if (range.dari || range.sampai) {
          const key = jakartaKeyOf(t.received_at);
          if (range.dari && key < range.dari) return false;
          if (range.sampai && key > range.sampai) return false;
        }
        return true;
      })
      .sort((a, b) => (a.received_at < b.received_at ? 1 : -1));
  }, [transactions, query, filters]);

  const visible = ordered.slice(0, visibleCount);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of visible) {
      const key = jakartaKeyOf(t.received_at);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: formatGroupDate(dateKey),
      items,
    }));
  }, [visible]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => (c < ordered.length ? Math.min(ordered.length, c + PAGE_SIZE) : c));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ordered.length]);

  function onTouchStart(e: React.TouchEvent) {
    pullStart.current = window.scrollY <= 0 && !refreshing ? e.touches[0].clientY : null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (pullStart.current === null) return;
    const dy = e.touches[0].clientY - pullStart.current;
    if (dy > 0) setPullY(Math.min(dy * 0.5, 80));
  }

  function onTouchEnd() {
    if (pullStart.current === null) return;
    const trigger = pullY > 50;
    pullStart.current = null;
    if (trigger) {
      setRefreshing(true);
      setPullY(0);
      startTransition(() => router.refresh());
      window.setTimeout(() => setRefreshing(false), 900);
    } else {
      setPullY(0);
    }
  }

  function applyFilters(next: Filters) {
    setVisibleCount(PAGE_SIZE);
    startTransition(() => setFilters(next));
  }

  function resetAll() {
    setSearchInput("");
    setQuery("");
    setVisibleCount(PAGE_SIZE);
    startTransition(() => setFilters(DEFAULT_FILTERS));
  }

  const remaining = ordered.length - visibleCount;
  const showGradient = remaining > 0;
  const showCue = remaining > 0 && !hasScrolled;
  const isEmptyAll = transactions.length === 0;
  const noMatch = !isEmptyAll && ordered.length === 0;

  return (
    <div style={{ overscrollBehaviorY: "contain" }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        aria-hidden={pullY === 0 && !refreshing}
        className="flex items-center justify-center overflow-hidden text-xs text-slate-500 transition-[height] duration-200"
        style={{ height: pullY > 0 ? pullY : refreshing ? 40 : 0 }}
      >
        {refreshing ? "Memuat ulang..." : pullY > 50 ? "Lepaskan untuk memuat ulang" : "Tarik untuk memuat ulang"}
      </div>

      <div className="flex flex-col gap-4">
        <RiwayatToolbar
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          filters={filters}
          onApply={applyFilters}
        />

        {isPending || refreshing ? (
          <ListSkeleton />
        ) : isEmptyAll ? (
          <div className="card px-4 py-16 text-center text-[15px] text-slate-500">
            Belum ada transaksi
          </div>
        ) : noMatch ? (
          <div className="flex flex-col items-center gap-3 card px-4 py-16 text-center">
            <p className="text-[15px] text-slate-500">Tidak ada transaksi yang cocok</p>
            <button
              type="button"
              onClick={resetAll}
              className="text-sm font-semibold text-indigo-600 underline-offset-2 hover:underline"
            >
              Reset filter
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <section key={group.dateKey}>
                <h2 className="mx-1 mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                  {group.label}
                </h2>
                <div className="card divide-y divide-slate-200 overflow-hidden">
                  {group.items.map((t) => (
                    <TransactionRowItem
                      key={t.id || t.order_no}
                      t={t}
                      href={`${detailBasePath}/${encodeURIComponent(t.id || t.order_no)}`}
                    />
                  ))}
                </div>
              </section>
            ))}
            {remaining > 0 ? <div ref={sentinelRef} className="h-4" aria-hidden="true" /> : null}
          </div>
        )}
      </div>

      {showGradient ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[120px]"
          style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0), #FFFFFF 75%)" }}
        />
      ) : null}

      {showCue ? (
        <div
          className="fixed inset-x-0 z-40 flex justify-center transition-opacity duration-200"
          style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: "smooth" })}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
          >
            <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
            {remaining > 0 ? `Gulir untuk ${remaining} transaksi lainnya` : "Gulir untuk lihat lainnya"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
