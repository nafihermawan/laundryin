"use client";

import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";

import { usePrinter } from "@/lib/printing/printer-provider";
import type { PrinterStatus as PrinterStatusValue } from "@/lib/printing/printer-machine";

const DOT_COLORS: Record<Exclude<PrinterStatusValue, "belum diatur">, string> = {
  terhubung: "#10B981",
  menyambungkan: "#F59E0B",
  terputus: "#94A3B8",
};

const TEXT_COLORS: Record<PrinterStatusValue, string> = {
  terhubung: "#047857",
  menyambungkan: "#B45309",
  terputus: "#64748B",
  "belum diatur": "#64748B",
};

const TEXT_LABELS: Record<Exclude<PrinterStatusValue, "belum diatur">, string> = {
  terhubung: "Terhubung",
  menyambungkan: "Menyambungkan…",
  terputus: "Terputus · Ketuk untuk sambungkan",
};

export function PrinterStatus({ accountHref = "/kasir/akun" }: { accountHref?: string }) {
  const router = useRouter();
  const { supported, status, name, connect } = usePrinter();

  if (!supported) return null;

  const isSetup = status === "belum diatur";
  const isDisconnected = status === "terputus";
  const dotColor = isSetup ? null : DOT_COLORS[status];
  const label = isSetup ? "Printer belum diatur" : TEXT_LABELS[status];

  const onTap = isDisconnected
    ? () => {
        void connect();
      }
    : isSetup
      ? () => router.push(accountHref)
      : undefined;

  const content = (
    <>
      <span
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: "#F1F5F9" }}
      >
        <Printer className="h-[18px] w-[18px] text-slate-700" strokeWidth={2} />
        {dotColor ? (
          <span
            className={`absolute bottom-0 right-0 h-[10px] w-[10px] rounded-full border-2 border-white ${
              status === "menyambungkan" ? "animate-pulse" : ""
            }`}
            style={{ backgroundColor: dotColor }}
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col">
        {name ? (
          <span className="truncate text-[13px] font-semibold text-slate-900">{name}</span>
        ) : null}
        <span className="text-[12px] font-medium" style={{ color: TEXT_COLORS[status] }}>
          {label}
        </span>
      </span>
    </>
  );

  return (
    <div role="status" aria-live="polite" className="min-w-0">
      {onTap ? (
        <button
          type="button"
          onClick={onTap}
          className="flex w-full min-w-0 items-center gap-2.5 text-left"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-2.5">{content}</div>
      )}
    </div>
  );
}
