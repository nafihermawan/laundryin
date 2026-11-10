import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title="Detail Transaksi" fallbackHref="/kasir/riwayat" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4" style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}>
        <div className="flex flex-col gap-6">
          <div className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-9" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
            <div className="mt-3 flex items-center gap-2.5 border-t border-slate-200 pt-3.5">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-5 w-24" />
            </div>
          </div>

          <div>
            <Skeleton className="mx-1 mb-2 h-3 w-24" />
            <Skeleton className="h-[60px] w-full rounded-2xl" />
          </div>

          <div>
            <Skeleton className="mx-1 mb-2 h-3 w-24" />
            <Skeleton className="h-[60px] w-full rounded-2xl" />
          </div>

          <div>
            <Skeleton className="mx-1 mb-2 h-3 w-28" />
            <div className="card px-4 pb-4 pt-1">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 border-b border-slate-200 py-3 last:border-0">
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
