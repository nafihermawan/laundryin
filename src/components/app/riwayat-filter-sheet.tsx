"use client";

import { useState } from "react";
import { Calendar, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  DEFAULT_FILTERS,
  type Bayar,
  type Cucian,
  type Filters,
  type TanggalPreset,
} from "@/lib/riwayat-filters";

function formatShort(dateKey: string) {
  if (!dateKey) return "";
  const d = new Date(`${dateKey}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors ${
        active
          ? "border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600"
          : "border border-slate-200 bg-white font-medium text-slate-600"
      }`}
    >
      {active ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
      {children}
    </button>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-slate-500">{label}</span>
      <div className="relative">
        <div className="flex h-11 items-center justify-between rounded-[10px] border border-slate-200 bg-white px-3 text-[15px]">
          <span className={value ? "text-slate-900" : "text-slate-400"}>
            {value ? formatShort(value) : "Pilih tanggal"}
          </span>
          <Calendar className="h-4 w-4 text-slate-400" strokeWidth={2} />
        </div>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </label>
  );
}

const CUCIAN_OPTIONS: { key: Cucian; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "diterima", label: "Diterima" },
  { key: "siap-diambil", label: "Siap diambil" },
  { key: "diambil", label: "Sudah diambil" },
];

const BAYAR_OPTIONS: { key: Bayar; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "lunas", label: "Lunas" },
  { key: "belum", label: "Belum bayar" },
];

const TANGGAL_OPTIONS: { key: Exclude<TanggalPreset, "none">; label: string }[] = [
  { key: "hari-ini", label: "Hari ini" },
  { key: "7-hari", label: "7 hari" },
  { key: "30-hari", label: "30 hari" },
  { key: "custom", label: "Pilih tanggal" },
];

function FilterForm({
  value,
  onClose,
  onApply,
}: {
  value: Filters;
  onClose: () => void;
  onApply: (filters: Filters) => void;
}) {
  const [draft, setDraft] = useState<Filters>(value);

  const rangeInvalid =
    draft.tanggal === "custom" && draft.dari !== "" && draft.sampai !== "" && draft.sampai < draft.dari;

  return (
    <>
      <div className="flex items-center justify-between gap-2 py-1 pl-5 pr-1.5">
        <h2 className="font-display text-[18px] font-bold text-slate-900">Filter</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup filter"
          className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-[22px] px-5 pb-5 pt-2">
        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold text-slate-900">Status cucian</legend>
          <div className="flex flex-wrap gap-2">
            {CUCIAN_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                active={draft.cucian === opt.key}
                onClick={() => setDraft({ ...draft, cucian: opt.key })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold text-slate-900">Pembayaran</legend>
          <div className="flex flex-wrap gap-2">
            {BAYAR_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                active={draft.bayar === opt.key}
                onClick={() => setDraft({ ...draft, bayar: opt.key })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold text-slate-900">Tanggal</legend>
          <div className="flex flex-wrap gap-2">
            {TANGGAL_OPTIONS.map((opt) => (
              <Chip
                key={opt.key}
                active={draft.tanggal === opt.key}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    tanggal: opt.key === "custom" ? "custom" : prev.tanggal === opt.key ? "none" : opt.key,
                  }))
                }
              >
                {opt.label}
              </Chip>
            ))}
          </div>

          {draft.tanggal === "custom" ? (
            <div className="mt-3.5 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <DateField label="Dari" value={draft.dari} onChange={(dari) => setDraft({ ...draft, dari })} />
                <DateField
                  label="Sampai"
                  value={draft.sampai}
                  onChange={(sampai) => setDraft({ ...draft, sampai })}
                />
              </div>
              {rangeInvalid ? (
                <p className="text-xs text-red-600">“Sampai” tidak boleh sebelum “Dari”.</p>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      </div>

      <div
        className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 pt-3"
        style={{ paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setDraft(DEFAULT_FILTERS)}
          className="-ml-4 inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Reset
        </button>
        <Button
          size="lg"
          disabled={rangeInvalid}
          onClick={() => {
            onApply(draft);
            onClose();
          }}
        >
          Terapkan
        </Button>
      </div>
    </>
  );
}

export function RiwayatFilterSheet({
  open,
  value,
  onClose,
  onApply,
  returnFocusTo,
}: {
  open: boolean;
  value: Filters;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <Drawer open={open} onClose={onClose} returnFocusTo={returnFocusTo}>
      <FilterForm value={value} onClose={onClose} onApply={onApply} />
    </Drawer>
  );
}
