"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

import { PrinterStatusView } from "@/components/app/printer-status";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { buildReceiptEscPos, type ReceiptModel } from "@/lib/printing/escpos";
import { columnsForPaper, type PaperWidth } from "@/lib/printing/paper";
import { usePrinter } from "@/lib/printing/printer-provider";

const PAPER_OPTIONS: PaperWidth[] = ["58", "80"];
const ACTION_RADIUS: CSSProperties = { borderRadius: 10 };

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

  // Default closed, except when there is no printer yet — then open so the
  // "Pilih printer" action is immediately visible. Once the user toggles, their
  // choice wins.
  const [toggled, setToggled] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const isSetup = status === "belum diatur";
  const expanded = toggled ? open : isSetup;
  const configured = Boolean(name);
  const busy = status === "menyambungkan";

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  function toggle() {
    setToggled(true);
    setOpen((o) => !o);
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
    setConfirmForget(false);
    show("Printer dilupakan");
  }

  return (
    <div className="card overflow-hidden">
      {supported ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={toggle}
          className="flex min-h-[68px] w-full items-center gap-3 px-[14px] py-3 text-left"
        >
          <PrinterStatusView size="md" className="flex-1" />
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            strokeWidth={2}
          />
        </button>
      ) : (
        <div className="flex min-h-[68px] items-center gap-3 px-[14px] py-3">
          <PrinterStatusView size="md" className="flex-1" />
        </div>
      )}

      {supported ? (
        <div
          className="grid"
          inert={expanded ? undefined : true}
          style={{
            gridTemplateRows: expanded ? "1fr" : "0fr",
            transition: reducedMotion ? "none" : "grid-template-rows 200ms ease",
          }}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-4 border-t border-slate-200 px-[14px] pt-4 pb-2">
              {configured ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="min-h-11"
                    style={ACTION_RADIUS}
                    onClick={handleTestPrint}
                    disabled={busy}
                  >
                    Cetak tes
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    style={ACTION_RADIUS}
                    onClick={connect}
                    loading={busy}
                    loadingText="Menyambungkan…"
                  >
                    Ganti printer
                  </Button>
                </div>
              ) : (
                <Button
                  className="min-h-11"
                  style={ACTION_RADIUS}
                  fullWidth
                  onClick={connect}
                  loading={busy}
                  loadingText="Menyambungkan…"
                >
                  Pilih printer
                </Button>
              )}

              <div>
                <div className="text-sm font-medium text-slate-900">Ukuran kertas</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PAPER_OPTIONS.map((value) => {
                    const active = paper === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setPaper(value)}
                        className={`min-h-11 rounded-[10px] text-sm ${
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
              </div>

              {configured ? (
                <button
                  type="button"
                  onClick={() => setConfirmForget(true)}
                  className="mx-auto flex min-h-11 items-center px-2 text-sm font-medium text-red-700"
                >
                  Lupakan printer
                </button>
              ) : null}
            </div>
          </div>
        </div>
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
