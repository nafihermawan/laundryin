"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type ServiceOption = {
  id: string;
  name: string;
  unit: string;
  base_price: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(value));
}

export function ServiceSelect({
  open,
  onOpenChange,
  services,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: ServiceOption[];
  value: string | null;
  onChange: (service: ServiceOption) => void;
}) {
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = services.find((s) => s.id === value) ?? null;
  const filtered = services.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      setQuery("");
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    // Only the currently-open instance may close on an outside mousedown.
    // Without this guard every row's listener reacted to a click inside ANOTHER
    // row's open dropdown (it looks "outside" to them), closing the shared
    // open state on mousedown before the option click landed — so items 2+ never
    // received their selection.
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onOpenChange(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className="relative flex-1"
      onKeyDown={(e) => {
        if (e.key === "Escape") onOpenChange(false);
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={`flex h-11 w-full items-center justify-between rounded-[10px] bg-white px-3 text-[15px] outline-none ${
          open ? "border-2 border-indigo-600" : "border border-slate-200"
        }`}
      >
        <span className={selected ? "font-semibold text-slate-900" : "text-slate-400"}>
          {selected ? selected.name : "Pilih layanan"}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari layanan"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto p-1.5 pt-0">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">Tidak ada layanan</li>
            ) : (
              filtered.map((s) => {
                const isSelected = s.id === value;
                return (
                  <li key={s.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(s);
                        onOpenChange(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${isSelected ? "bg-indigo-50" : ""}`}
                    >
                      <span className="flex flex-1 flex-col">
                        <span className={`text-[15px] font-semibold ${isSelected ? "text-indigo-600" : "text-slate-900"}`}>
                          {s.name}
                        </span>
                        <span className="text-[12px] text-slate-500">
                          Rp {formatNumber(s.base_price)} / {s.unit}
                        </span>
                      </span>
                      {isSelected ? <Check className="h-4 w-4 shrink-0 text-indigo-600" strokeWidth={2.5} /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
