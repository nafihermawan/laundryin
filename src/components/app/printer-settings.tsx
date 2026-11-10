"use client";

import { useState } from "react";

import { PrinterStatusView } from "@/components/app/printer-status";
import { SectionHeading } from "@/components/app/section-heading";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildReceiptEscPos, type ReceiptModel } from "@/lib/printing/escpos";
import { columnsForPaper, type PaperWidth } from "@/lib/printing/paper";
import { usePrinter } from "@/lib/printing/printer-provider";

const PAPER_OPTIONS: PaperWidth[] = ["58", "80"];

function buildTestReceipt(): ReceiptModel {
  return {
    orderNo: "TES",
    receivedAt: new Date().toISOString(),
    customerName: "Pelanggan Contoh",
    items: [{ name: "Cetak tes", qty: 1, unit: "pcs", unitPrice: 0, subtotal: 0 }],
    total: 0,
    paid: null,
    notes: "Printer siap digunakan",
  };
}

export function PrinterSettings() {
  const { show } = useToast();
  const { supported, status, name, paper, connect, ensureConnected, forget, setPaper, send } =
    usePrinter();

  const [confirmForget, setConfirmForget] = useState(false);
  const configured = Boolean(name);
  const busy = status === "menyambungkan";

  async function handleTestPrint() {
    const ready = (await ensureConnected()) || (await connect());
    if (!ready) return;

    try {
      await send(buildReceiptEscPos(buildTestReceipt(), { width: columnsForPaper(paper) }));
      show("Nota uji dikirim ke printer");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal mencetak", { type: "error" });
    }
  }

  function handleForget() {
    forget();
    setConfirmForget(false);
    show("Printer dilupakan");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <PrinterStatusView size="lg" />
      </section>

      {supported ? (
        <>
          {configured ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleTestPrint} disabled={busy}>
                Cetak tes
              </Button>
              <Button
                variant="outline"
                onClick={connect}
                loading={busy}
                loadingText="Menyambungkan…"
              >
                Ganti printer
              </Button>
            </div>
          ) : (
            <Button fullWidth onClick={connect} loading={busy} loadingText="Menyambungkan…">
              Pilih printer
            </Button>
          )}

          <section>
            <SectionHeading>Ukuran kertas</SectionHeading>
            <div className="flex gap-2">
              {PAPER_OPTIONS.map((value) => {
                const active = paper === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPaper(value)}
                    className={`min-h-11 flex-1 rounded-[10px] text-sm ${
                      active
                        ? "border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600"
                        : "border border-slate-200 bg-white font-medium text-slate-600"
                    }`}
                  >
                    {value} mm
                  </button>
                );
              })}
            </div>
          </section>

          {configured ? (
            <button
              type="button"
              onClick={() => setConfirmForget(true)}
              className="self-center py-2 text-sm font-semibold text-red-700"
            >
              Lupakan printer
            </button>
          ) : null}
        </>
      ) : null}

      {confirmForget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmForget(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forget-printer-title"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 id="forget-printer-title" className="text-base font-semibold text-slate-900">
              Lupakan printer?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Printer yang tersimpan akan dihapus dari perangkat ini.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="danger" onClick={handleForget}>
                Ya, lupakan
              </Button>
              <Button variant="outline" onClick={() => setConfirmForget(false)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
