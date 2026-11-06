import { PageShell } from "@/components/app/page-shell";

export default function Loading() {
  return (
    <PageShell title="Pengguna">
      <div className="flex flex-col gap-4">
        <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex min-h-[64px] items-center gap-3 px-[14px] py-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-56 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
