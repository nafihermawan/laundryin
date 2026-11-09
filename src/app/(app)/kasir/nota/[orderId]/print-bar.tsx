"use client";

import { useEffect, useState } from "react";
import { Bluetooth, Printer, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildReceiptEscPos, type ReceiptModel } from "@/lib/printing/escpos";
import {
  connectPrinter,
  ensureConnected,
  forgetPrinter,
  setPaperWidth,
  type PaperWidth,
} from "@/lib/printing/printer-store";
import { usePrinter } from "@/lib/printing/use-printer";

function columnsFor(paper: PaperWidth) {
  return paper === "80" ? 48 : 32;
}

export function PrintBar({ receipt }: { receipt: ReceiptModel }) {
  const { show } = useToast();
  const { supported, status, name, paper } = usePrinter();
  const [printing, setPrinting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    // Best-effort silent reconnect to a previously granted printer.
    void ensureConnected();
  }, []);

  async function handleConnect() {
    const result = await connectPrinter();
    if (result.printer) show(`Printer terhubung: ${result.printer.name}`);
    else show(result.error ?? "Gagal menghubungkan printer", { type: "error" });
    return result.printer;
  }

  async function doThermalPrint() {
    let printer = await ensureConnected();
    if (!printer) printer = await handleConnect();
    if (!printer) return;

    setPrinting(true);
    try {
      const bytes = buildReceiptEscPos(receipt, { width: columnsFor(paper) });
      await printer.print(bytes);
      show("Nota dikirim ke printer");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal mencetak", {
        type: "error",
        actionLabel: "Coba lagi",
        onAction: doThermalPrint,
      });
    } finally {
      setPrinting(false);
    }
  }

  function doBrowserPrint() {
    setPrinting(true);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        try {
          window.print();
        } finally {
          setPrinting(false);
        }
      }, 50);
    });
  }

  function handleForget() {
    forgetPrinter();
    show("Printer dilupakan");
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white print:hidden">
        <div
          className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-3"
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex min-h-9 items-center gap-1.5 self-start text-left text-xs text-slate-500"
          >
            <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />
            {supported
              ? name
                ? `Printer: ${name} · ${paper}mm`
                : `Printer belum terhubung · ${paper}mm`
              : "Cetak Bluetooth hanya didukung di Chrome Android"}
          </button>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="lg" className="flex-1" onClick={doBrowserPrint} disabled={printing}>
              Browser
            </Button>
            {supported ? (
              <Button
                size="lg"
                className="flex-1"
                onClick={doThermalPrint}
                loading={printing || status === "connecting"}
                loadingText={status === "connecting" ? "Menghubungkan…" : "Mencetak…"}
              >
                <Printer className="h-[18px] w-[18px]" strokeWidth={2} />
                Cetak
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSheetOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pengaturan printer"
            className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-5 sm:rounded-2xl"
            style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
          >
            <h2 className="text-base font-semibold text-slate-900">Pengaturan printer</h2>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                Ukuran kertas
              </div>
              <div className="mt-2 flex gap-2">
                {(["58", "80"] as PaperWidth[]).map((value) => {
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

            <div className="mt-5 rounded-xl border border-slate-200 p-3.5">
              <div className="flex items-center gap-2 text-sm">
                <Bluetooth className="h-4 w-4 text-slate-500" strokeWidth={2} />
                <span className="flex-1 text-slate-900">
                  {name ?? "Belum ada printer terhubung"}
                </span>
              </div>
              {!supported ? (
                <p className="mt-2 text-xs text-slate-500">
                  Cetak Bluetooth hanya didukung di Chrome Android. Di perangkat lain, pakai tombol
                  &quot;Browser&quot;.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
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
              )}
            </div>

            <div className="mt-5">
              <Button variant="outline" fullWidth onClick={() => setSheetOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
