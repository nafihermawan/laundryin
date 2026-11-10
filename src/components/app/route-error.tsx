"use client";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export function RouteError({
  title,
  reset,
  fallbackHref,
}: {
  title: string;
  reset: () => void;
  fallbackHref?: string;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title={title} fallbackHref={fallbackHref} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5">
        <div className="card flex flex-col items-center gap-4 px-4 py-16 text-center">
          <p className="text-[15px] text-slate-600">Gagal memuat data</p>
          <Button onClick={() => reset()}>Coba lagi</Button>
        </div>
      </main>
    </div>
  );
}
