"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bluetooth, Printer, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  ThermalPrinter,
  isBluetoothPrintingSupported,
  type BluetoothDeviceLike,
} from "@/lib/printing/bluetooth-printer";
import { buildReceiptEscPos, type ReceiptModel } from "@/lib/printing/escpos";

const PAPER_KEY = "thermal-paper-width";
const PRINTER_KEY = "thermal-printer";

type PaperWidth = "58" | "80";

function columnsFor(paper: PaperWidth) {
  return paper === "80" ? 48 : 32;
}

export function PrintBar({ receipt }: { receipt: ReceiptModel }) {
  const { show } = useToast();
  const printerRef = useRef<ThermalPrinter | null>(null);
  const [supported, setSupported] = useState(false);
  const [paper, setPaper] = useState<PaperWidth>("58");
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rememberPrinter = useCallback((printer: ThermalPrinter | null) => {
    printerRef.current = printer;
    const name = printer?.name ?? null;
    setPrinterName(name);
    try {
      if (printer) localStorage.setItem(PRINTER_KEY, JSON.stringify({ id: printer.id, name: printer.name }));
      else localStorage.removeItem(PRINTER_KEY);
    } catch {}
  }, []);

  useEffect(() => {
    setSupported(isBluetoothPrintingSupported());
    try {
      const storedPaper = localStorage.getItem(PAPER_KEY);
      if (storedPaper === "80" || storedPaper === "58") setPaper(storedPaper);
    } catch {}

    // Best-effort silent reconnect to a previously granted printer.
    let cancelled = false;
    (async () => {
      let stored: { id?: string; name?: string } | null = null;
      try {
        stored = JSON.parse(localStorage.getItem(PRINTER_KEY) || "null");
      } catch {}
      if (!stored?.id || !isBluetoothPrintingSupported()) return;
      const devices = await ThermalPrinter.remembered();
      const match = devices.find((d: BluetoothDeviceLike) => d.id === stored?.id);
      if (!match || cancelled) return;
      try {
        const printer = await ThermalPrinter.connect(match);
        if (!cancelled) rememberPrinter(printer);
      } catch {
        // needs a fresh user gesture; ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rememberPrinter]);

  function changePaper(next: PaperWidth) {
    setPaper(next);
    try {
      localStorage.setItem(PAPER_KEY, next);
    } catch {}
  }

  async function connectPrinter(): Promise<ThermalPrinter | null> {
    setConnecting(true);
    try {
      const printer = await ThermalPrinter.request();
      printer.onDisconnect(() => rememberPrinter(null));
      rememberPrinter(printer);
      show(`Printer terhubung: ${printer.name}`);
      return printer;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghubungkan printer";
      show(message, { type: "error" });
      return null;
    } finally {
      setConnecting(false);
    }
  }

  async function doThermalPrint() {
    let printer = printerRef.current;
    if (!printer) printer = await connectPrinter();
    if (!printer) return;

    setPrinting(true);
    try {
      const bytes = buildReceiptEscPos(receipt, { width: columnsFor(paper) });
      await printer.print(bytes);
      show("Nota dikirim ke printer");
    } catch (err) {
      rememberPrinter(null);
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
              ? printerName
                ? `Printer: ${printerName} · ${paper}mm`
                : `Printer belum terhubung · ${paper}mm`
              : "Cetak thermal butuh Chrome Android"}
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
                loading={printing || connecting}
                loadingText={connecting ? "Menghubungkan…" : "Mencetak…"}
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
                      onClick={() => changePaper(value)}
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
                  {printerName ?? "Belum ada printer terhubung"}
                </span>
              </div>
              {!supported ? (
                <p className="mt-2 text-xs text-slate-500">
                  Web Bluetooth hanya tersedia di Chrome Android (HTTPS). Di perangkat lain, pakai tombol
                  &quot;Browser&quot;.
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <Button onClick={connectPrinter} loading={connecting} loadingText="Menghubungkan…">
                    {printerName ? "Ganti printer" : "Hubungkan printer"}
                  </Button>
                  {printerName ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        printerRef.current?.disconnect();
                        rememberPrinter(null);
                        show("Printer dilupakan");
                      }}
                    >
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
