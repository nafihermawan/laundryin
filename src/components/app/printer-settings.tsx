"use client";

import { Printer } from "lucide-react";

import { MenuGroup } from "@/components/app/menu-group";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  connectPrinter,
  forgetPrinter,
  setPaperWidth,
  type PaperWidth,
} from "@/lib/printing/printer-store";
import { usePrinter } from "@/lib/printing/use-printer";

const PAPER_OPTIONS: PaperWidth[] = ["58", "80"];

export function PrinterSettings() {
  const { show } = useToast();
  const { supported, status, name, paper } = usePrinter();

  const statusText =
    status === "connected"
      ? name ?? "Terhubung"
      : status === "connecting"
        ? "Menghubungkan…"
        : name
          ? `${name} (terputus)`
          : "Belum terhubung";

  async function handleConnect() {
    const result = await connectPrinter();
    if (result.printer) show(`Printer terhubung: ${result.printer.name}`);
    else show(result.error ?? "Gagal menghubungkan printer", { type: "error" });
  }

  function handleForget() {
    forgetPrinter();
    show("Printer dilupakan");
  }

  return (
    <MenuGroup title="Printer">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-slate-100 text-slate-900">
            <Printer className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold text-slate-900">Printer nota</span>
            <span className="text-[13px] text-slate-500">{statusText}</span>
          </div>
        </div>

        {supported ? (
          <>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleConnect}
                loading={status === "connecting"}
                loadingText="Menghubungkan…"
              >
                {name ? "Ganti printer" : "Hubungkan printer"}
              </Button>
              {name ? (
                <Button variant="outline" onClick={handleForget}>
                  Lupakan printer
                </Button>
              ) : null}
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                Ukuran kertas
              </div>
              <div className="mt-2 flex gap-2">
                {PAPER_OPTIONS.map((value) => {
                  const active = paper === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPaperWidth(value)}
                      className={`min-h-11 flex-1 rounded-[10px] text-sm ${
                        active
                          ? "border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600"
                          : "border border-slate-200 bg-white font-medium text-slate-600"
                      }`}
                    >
                      {value}mm
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-slate-500">
            Cetak Bluetooth hanya didukung di Chrome Android. Di perangkat lain, gunakan tombol
            &quot;Browser&quot; pada halaman nota.
          </p>
        )}
      </div>
    </MenuGroup>
  );
}
