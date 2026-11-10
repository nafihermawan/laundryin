"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, List } from "lucide-react";

export function LogAccordion({
  count,
  latestTime,
  children,
}: {
  count: number;
  latestTime: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[60px] w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <List className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-slate-900">{count} aktivitas</span>
          <span className="text-[13px] text-slate-500 tabular-nums">
            Terakhir {latestTime ?? "–"}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      <div
        className="grid"
        inert={open ? undefined : true}
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          transition: reducedMotion ? "none" : "grid-template-rows 220ms ease",
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 p-3.5">{children}</div>
        </div>
      </div>
    </div>
  );
}
