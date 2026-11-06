import type { ReactNode } from "react";

import { PageHeader } from "./page-header";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({
  title,
  fallbackHref,
  children,
}: {
  title: string;
  fallbackHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title={title} fallbackHref={fallbackHref} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4">
        {children ?? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}
      </main>
    </div>
  );
}
