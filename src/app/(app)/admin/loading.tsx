import { BottomNav } from "@/components/app/bottom-nav";
import { HomeHeader } from "@/components/app/home-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <HomeHeader name="" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[120px] pt-5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Skeleton className="h-[88px] rounded-xl" />
              <Skeleton className="h-[88px] rounded-xl" />
              <Skeleton className="h-[88px] rounded-xl" />
            </div>
          </div>
          {[0, 1].map((g) => (
            <div key={g}>
              <Skeleton className="mx-1 mb-2 h-3 w-20" />
              <div className="divide-y divide-slate-200 card">
                {[0, 1].map((r) => (
                  <div key={r} className="flex items-center gap-3 px-[14px] py-3">
                    <Skeleton className="h-10 w-10" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <BottomNav role="admin" />
    </div>
  );
}
