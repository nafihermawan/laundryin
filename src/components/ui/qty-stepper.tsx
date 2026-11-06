"use client";

import { Minus, Plus } from "lucide-react";

function formatQty(value: number) {
  return String(value).replace(".", ",");
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function QtyStepper({
  qty,
  unit,
  onChange,
}: {
  qty: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const isKg = unit === "kg";
  const step = isKg ? 0.5 : 1;
  const min = isKg ? 0.5 : 1;
  const display = formatQty(qty);

  function handleInput(raw: string) {
    const cleaned = raw.replace(/[^\d,.]/g, "").replace(".", ",");
    const parsed = Number(cleaned.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      onChange(min);
      return;
    }
    onChange(parsed);
  }

  return (
    <div className="flex h-11 items-center rounded-[10px] border border-slate-200 bg-white">
      <button
        type="button"
        aria-label="Kurangi jumlah"
        disabled={qty <= min}
        onClick={() => onChange(Math.max(min, round1(qty - step)))}
        className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-600 disabled:opacity-40"
      >
        <Minus className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </button>

      <span className="flex flex-1 items-baseline justify-center gap-1">
        <input
          inputMode="decimal"
          value={display}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={() => {
            if (!Number.isFinite(qty) || qty < min) onChange(min);
          }}
          style={{ width: `${Math.min(6, Math.max(2, display.length))}ch` }}
          className="min-w-[2ch] max-w-[6ch] bg-transparent text-right text-[15px] font-semibold tabular-nums text-slate-900 outline-none"
        />
        <span className="text-sm text-slate-500">{unit}</span>
      </span>

      <button
        type="button"
        aria-label="Tambah jumlah"
        onClick={() => onChange(round1(qty + step))}
        className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-600"
      >
        <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
      </button>
    </div>
  );
}
