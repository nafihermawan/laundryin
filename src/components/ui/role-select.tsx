"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type RoleValue = "admin" | "cashier";

export const ROLE_OPTIONS: { value: RoleValue; label: string; description: string }[] = [
  {
    value: "cashier",
    label: "Kasir",
    description: "Membuat transaksi dan melihat riwayat",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Akses penuh, termasuk laporan dan pengaturan",
  },
];

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: RoleValue;
  onChange: (value: RoleValue) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[0];

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function openMenu() {
    setActiveIndex(Math.max(0, ROLE_OPTIONS.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(ROLE_OPTIONS.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(ROLE_OPTIONS[activeIndex].value);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => (disabled ? undefined : open ? setOpen(false) : openMenu())}
          onKeyDown={onTriggerKeyDown}
          className={`flex h-11 w-full items-center justify-between rounded-[10px] bg-white px-3 text-[15px] font-medium text-slate-900 outline-none transition ${
            open ? "border-2 border-indigo-600" : "border border-slate-200"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <span>{selected.label}</span>
          <ChevronDown
            className={`h-5 w-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>

        {open ? (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
          >
            {ROLE_OPTIONS.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex min-h-[56px] cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 ${
                    isSelected ? "bg-indigo-50" : index === activeIndex ? "bg-slate-50" : ""
                  }`}
                >
                  <span className="flex flex-1 flex-col">
                    <span
                      className={`text-[15px] font-semibold ${
                        isSelected ? "text-indigo-600" : "text-slate-900"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="text-[13px] text-slate-500">{option.description}</span>
                  </span>
                  {isSelected ? <Check className="h-5 w-5 shrink-0 text-indigo-600" /> : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">{selected.description}</p>
    </div>
  );
}
