"use client";

import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";

import { usePrinter } from "@/lib/printing/printer-provider";
import type { PrinterStatus as PrinterStatusValue } from "@/lib/printing/printer-machine";

type Size = "sm" | "md" | "lg";

const DOT_CLASS: Record<Exclude<PrinterStatusValue, "belum diatur">, string> = {
  terhubung: "bg-emerald-500",
  menyambungkan: "bg-amber-500",
  terputus: "bg-slate-400",
};

const TEXT_CLASS: Record<PrinterStatusValue, string> = {
  terhubung: "text-emerald-700",
  menyambungkan: "text-amber-700",
  terputus: "text-slate-500",
  "belum diatur": "text-slate-500",
};

const SIZES: Record<
  Size,
  { box: string; icon: string; dot: string; name: string; detail: string; gap: string }
> = {
  sm: {
    box: "h-9 w-9 rounded-[10px]",
    icon: "h-[18px] w-[18px]",
    dot: "h-2.5 w-2.5",
    name: "text-[13px]",
    detail: "text-[12px]",
    gap: "gap-2.5",
  },
  md: {
    box: "h-10 w-10 rounded-[10px]",
    icon: "h-5 w-5",
    dot: "h-3 w-3",
    name: "text-[15px]",
    detail: "text-[13px]",
    gap: "gap-3",
  },
  lg: {
    box: "h-14 w-14 rounded-[14px]",
    icon: "h-6 w-6",
    dot: "h-3.5 w-3.5",
    name: "text-[17px]",
    detail: "text-[14px]",
    gap: "gap-3.5",
  },
};

type Description = {
  unsupported: boolean;
  name: string | null;
  detail: string;
  dot: string | null;
  pulsing: boolean;
  textClass: string;
};

function describe(snapshot: {
  supported: boolean;
  status: PrinterStatusValue;
  name: string | null;
  paper: string;
}): Description {
  if (!snapshot.supported) {
    return {
      unsupported: true,
      name: null,
      detail: "Cetak Bluetooth hanya di Chrome Android",
      dot: null,
      pulsing: false,
      textClass: "text-slate-500",
    };
  }

  if (snapshot.status === "belum diatur") {
    return {
      unsupported: false,
      name: "Printer belum diatur",
      detail: "Ketuk untuk mengatur",
      dot: null,
      pulsing: false,
      textClass: "text-slate-500",
    };
  }

  const printerName = snapshot.name ?? "Printer Bluetooth";
  const { status, paper } = snapshot;

  return {
    unsupported: false,
    name: printerName,
    detail:
      status === "terhubung"
        ? `Terhubung · ${paper} mm`
        : status === "menyambungkan"
          ? "Menyambungkan…"
          : `Terputus · ${paper} mm`,
    dot: DOT_CLASS[status],
    pulsing: status === "menyambungkan",
    textClass: TEXT_CLASS[status],
  };
}

export function PrinterStatusView({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  const snapshot = usePrinter();
  const info = describe(snapshot);
  const s = SIZES[size];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-w-0 items-center ${s.gap} ${className}`}
    >
      <span className={`relative flex shrink-0 items-center justify-center bg-slate-100 ${s.box}`}>
        <Printer className={`${s.icon} text-slate-700`} strokeWidth={2} />
        {info.dot ? (
          <span
            className={`absolute -bottom-px -right-px rounded-full border-2 border-white ${s.dot} ${info.dot} ${
              info.pulsing ? "animate-pulse" : ""
            }`}
          />
        ) : null}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        {info.unsupported ? (
          <span className={`${s.detail} font-medium text-slate-500`}>{info.detail}</span>
        ) : (
          <>
            <span className={`truncate font-semibold text-slate-900 ${s.name}`}>{info.name}</span>
            <span className={`font-medium ${s.detail} ${info.textClass}`}>{info.detail}</span>
          </>
        )}
      </span>
    </div>
  );
}

/** Compact, tappable status used in the nota print bar. */
export function PrinterStatus({ setupHref = "/kasir/akun" }: { setupHref?: string }) {
  const router = useRouter();
  const { supported, status, connect } = usePrinter();

  if (!supported) return null;

  const isSetup = status === "belum diatur";
  const isDisconnected = status === "terputus";

  const onTap = isDisconnected
    ? () => {
        void connect();
      }
    : isSetup
      ? () => router.push(setupHref)
      : undefined;

  if (onTap) {
    return (
      <button type="button" onClick={onTap} className="block w-full min-w-0 text-left">
        <PrinterStatusView size="sm" />
      </button>
    );
  }

  return <PrinterStatusView size="sm" />;
}
