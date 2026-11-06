"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type StatusStep = {
  key: string;
  label: string;
  time: string | null;
  done: boolean;
  estimasi?: string | null;
};

export function StatusAccordion({
  steps,
  completed,
  total,
  summaryLabel,
  summaryTime,
}: {
  steps: StatusStep[];
  completed: number;
  total: number;
  summaryLabel: string;
  summaryTime: string | null;
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[60px] w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600">
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-slate-900">{summaryLabel}</span>
          <span className="text-[13px] text-slate-500 tabular-nums">
            {summaryTime ?? "–"} · {completed} dari {total} tahap
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
          <div className="border-t border-slate-200 px-3.5 py-4">
            <ol>
              {steps.map((step, index) => (
                <li key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        step.done ? "bg-indigo-600" : "border-2 border-slate-300"
                      }`}
                    >
                      {step.done ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                    </span>
                    {index < steps.length - 1 ? (
                      <span className={`w-0.5 flex-1 ${step.done ? "bg-indigo-600" : "bg-slate-200"}`} />
                    ) : null}
                  </div>
                  <div className={`flex-1 ${index < steps.length - 1 ? "pb-[18px]" : ""}`}>
                    <div className={`text-sm font-semibold ${step.done ? "text-slate-900" : "text-slate-500"}`}>
                      {step.label}
                    </div>
                    <div className="text-[13px] text-slate-500 tabular-nums">{step.time ?? "–"}</div>
                    {step.estimasi ? (
                      <div className="mt-1 text-xs text-slate-500 tabular-nums">Estimasi {step.estimasi}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
