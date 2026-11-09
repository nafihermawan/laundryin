"use client";

import { useState } from "react";

import { PrinterStatus } from "@/components/app/printer-status";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildReceiptEscPos, type ReceiptModel } from "@/lib/printing/escpos";
import { columnsForPaper } from "@/lib/printing/paper";
import { usePrinter } from "@/lib/printing/printer-provider";

export function PrintBar({ receipt }: { receipt: ReceiptModel }) {
  const { show } = useToast();
  const { supported, paper, ensureConnected, connect, send } = usePrinter();
  const [printing, setPrinting] = useState(false);

  async function doThermalPrint() {
    setPrinting(true);
    try {
      // Same tap: reuse the saved connection, reconnect silently, or finally
      // ask the user to pick the printer — then print without a second tap.
      const ready = (await ensureConnected()) || (await connect());
      if (!ready) return;

      const bytes = buildReceiptEscPos(receipt, { width: columnsForPaper(paper) });
      await send(bytes);
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white print:hidden">
      <div
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        <div className="min-w-0 flex-1">
          <PrinterStatus />
        </div>
        <Button
          size="lg"
          className="shrink-0"
          onClick={supported ? doThermalPrint : doBrowserPrint}
          loading={printing}
          loadingText="Mencetak…"
        >
          Cetak
        </Button>
      </div>
    </div>
  );
}
