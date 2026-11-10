import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title="Pengguna" fallbackHref="/admin" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <input
              placeholder="Cari nama, email, atau no. HP"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-[38px] pr-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          {[0, 1].map((g) => (
            <div key={g}>
              <Skeleton className="mx-1 mb-2 h-3 w-16" />
              <div className="divide-y divide-slate-200 card">
                {[0, 1].map((r) => (
                  <div key={r} className="flex min-h-[64px] items-center gap-3 px-[14px] py-3">
                    <Skeleton className="h-10 w-10" rounded="full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
