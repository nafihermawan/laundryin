"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LockOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

import { closeShift, openShift } from "./shift/actions";

export const DEFAULT_KAS_AWAL = 50000;

function formatIDR(amount: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(amount))}`;
}

function formatThousands(digits: string) {
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function formatJam(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export function ShiftCard({
  name,
  isOpen,
  registerId,
  openedAt,
  startingCash,
  cashTotal,
}: {
  name: string;
  isOpen: boolean;
  registerId?: string;
  openedAt?: string;
  startingCash: number;
  cashTotal: number;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [dialog, setDialog] = useState<null | "open" | "close">(null);
  const [cashInput, setCashInput] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Local shift state so the card flips immediately after open/close succeeds.
  // The parent keys this component on the shift open/closed state, so it
  // re-initialises from fresh server props once router.refresh() lands.
  const [open, setOpen] = useState(isOpen);
  const [opened, setOpened] = useState<string | undefined>(openedAt);
  const [startCash, setStartCash] = useState(startingCash);
  const [cash, setCash] = useState(cashTotal);

  const expectedCash = startCash + cash;
  const cashNum = Number(cashInput) || 0;
  const variance = cashNum - expectedCash;

  function openDialog(kind: "open" | "close") {
    setCashInput(kind === "open" ? String(DEFAULT_KAS_AWAL) : "");
    setNotes("");
    setError(null);
    setDialog(kind);
  }

  async function submit() {
    setError(null);
    if (cashInput.trim() === "") {
      setError(dialog === "open" ? "Isi kas awal (boleh 0)" : "Isi uang fisik di laci");
      return;
    }
    const value = Number(cashInput);
    if (!Number.isFinite(value) || value < 0) {
      setError("Nominal uang tidak valid");
      return;
    }

    setSubmitting(true);
    const result =
      dialog === "open"
        ? await openShift(value)
        : registerId
          ? await closeShift(registerId, value, notes)
          : { success: false as const, error: "Shift tidak ditemukan" };
    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Terjadi kesalahan");
      return;
    }

    if (dialog === "open") {
      setOpen(true);
      setOpened(new Date().toISOString());
      setStartCash(value);
      setCash(0);
      show("Shift dibuka");
    } else {
      setOpen(false);
      setOpened(undefined);
      setStartCash(0);
      setCash(0);
      show("Shift ditutup");
    }
    setDialog(null);
    router.refresh();
  }

  return (
    <section
      id="shift-card"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            open ? "bg-emerald-100" : "bg-orange-100"
          }`}
        >
          {open ? (
            <LockOpen className="h-5 w-5 text-emerald-700" strokeWidth={2} />
          ) : (
            <Lock className="h-5 w-5 text-orange-700" strokeWidth={2} />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              open ? "text-emerald-700" : "text-orange-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {open && opened ? `Shift aktif sejak ${formatJam(opened)}` : "Shift belum dibuka"}
          </span>
          <span className="truncate font-display text-[17px] font-bold tracking-[-0.01em] text-slate-900">
            {name}
          </span>
        </div>

        {open ? (
          <Button variant="outline" onClick={() => openDialog("close")}>
            Tutup shift
          </Button>
        ) : (
          <Button onClick={() => openDialog("open")}>Buka shift</Button>
        )}
      </div>

      {open ? (
        <dl
          className="grid gap-x-2 gap-y-2.5 border-t border-slate-200 pt-3.5 text-sm"
          style={{ gridTemplateColumns: "auto auto 1fr" }}
        >
          <dt className="text-slate-500">Kas Awal</dt>
          <dd className="text-slate-500">:</dd>
          <dd className="font-semibold text-slate-900">{formatIDR(startCash)}</dd>
          <dt className="text-slate-500">Tunai</dt>
          <dd className="text-slate-500">:</dd>
          <dd className="font-semibold text-slate-900">{formatIDR(cash)}</dd>
        </dl>
      ) : (
        <p className="border-t border-slate-200 pt-[14px] text-[13px] leading-[1.5] text-slate-500">
          Buka shift dan catat uang kas awal sebelum mulai menerima transaksi.
        </p>
      )}

      {dialog ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-semibold text-slate-900">
              {dialog === "open" ? "Buka shift" : "Tutup shift"}
            </h2>

            <div className="mt-4 flex flex-col gap-4">
              <Field
                label={dialog === "open" ? "Kas awal" : "Uang Fisik di Laci (Actual)"}
                htmlFor="shiftCash"
                error={error ?? undefined}
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    Rp
                  </span>
                  <input
                    id="shiftCash"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formatThousands(cashInput)}
                    onChange={(e) => setCashInput(e.target.value.replace(/\D/g, ""))}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="0"
                    disabled={submitting}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>

              {dialog === "close" ? (
                <>
                  <div
                    className={`flex items-center justify-between rounded-xl border p-3 text-sm font-medium ${
                      variance === 0
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : variance < 0
                          ? "border-red-100 bg-red-50 text-red-700"
                          : "border-amber-100 bg-amber-50 text-amber-700"
                    }`}
                  >
                    <span>Selisih</span>
                    <span>
                      {variance > 0 ? "+" : ""}
                      {formatIDR(variance)}
                    </span>
                  </div>
                  <Field label="Catatan (opsional)" htmlFor="shiftNotes">
                    <textarea
                      id="shiftNotes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder={variance !== 0 ? "Jelaskan alasan selisih uang..." : "Catatan tambahan..."}
                      disabled={submitting}
                      className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </Field>
                </>
              ) : null}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={submit}
                  loading={submitting}
                  loadingText={dialog === "open" ? "Membuka shift…" : "Menutup shift…"}
                >
                  {dialog === "open" ? "Buka shift" : "Tutup shift"}
                </Button>
                <Button variant="outline" onClick={() => setDialog(null)}>
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
