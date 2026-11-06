import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title="Nota" fallbackHref="/kasir/riwayat" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5" style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-zinc-200 pt-4">
            <Skeleton className="h-3 w-12" />
            <div className="mt-3 flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 border-t border-zinc-200 pt-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="mx-auto mt-8 h-3 w-24" />
        </div>
      </main>
    </div>
  );
}
