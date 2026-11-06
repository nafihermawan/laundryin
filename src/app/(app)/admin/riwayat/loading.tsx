import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title="Riwayat Transaksi" fallbackHref="/admin" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <input
                placeholder="Cari no. order atau nama"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-[38px] pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              aria-label="Filter tanggal dan lainnya"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>
          <div>
            <Skeleton className="mx-1 mb-2 h-3 w-24" />
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-[40%]" />
                    <Skeleton className="h-4 w-[20%]" />
                  </div>
                  <Skeleton className="h-3 w-[60%]" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
