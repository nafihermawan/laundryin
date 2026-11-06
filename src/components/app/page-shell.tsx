import type { ReactNode } from "react";

import { PageHeader } from "./page-header";

export function PageShell({
  title,
  fallbackHref,
  children,
}: {
  title: string;
  fallbackHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader title={title} fallbackHref={fallbackHref} />
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    </div>
  );
}
