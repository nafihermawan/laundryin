"use client";

import { MenuGroup } from "@/components/app/menu-group";
import { PrinterStatus } from "@/components/app/printer-status";
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

  const connected = status === "terhubung";
  const busy = status === "menyambungkan";

  async function handleConnect() {
    await connect();
  }

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
    show("Printer dilupakan");
  }

  return (
    <MenuGroup title="Printer">
      <div className="flex flex-col gap-4 p-4">
        <PrinterStatus />

        {supported ? (
          <>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="md" onClick={handleTestPrint} disabled={busy}>
                Cetak tes
              </Button>
              <Button
                variant={connected ? "outline" : "primary"}
                onClick={handleConnect}
                loading={busy}
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
                      onClick={() => setPaper(value)}
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
            Cetak Bluetooth hanya didukung di Chrome Android.
          </p>
        )}
      </div>
    </MenuGroup>
  );
}
