import type { ReactNode } from "react";

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mx-1 mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
      {children}
    </h2>
  );
}
