"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

import { updateOrderStatus } from "../actions";

type Action =
  | { kind: "status"; label: string; next: string; confirmTitle: string; disabled?: boolean }
  | { kind: "pay"; label: string }
  | null;

function deriveAction(status: string, isPaid: boolean): Action {
  if (status === "diambil") return null;
  if (status === "diterima") {
    return {
      kind: "status",
      label: "Tandai siap diambil",
      next: "siap",
      confirmTitle: "Tandai siap diambil?",
      disabled: !isPaid,
    };
  }
  if (!isPaid) return { kind: "pay", label: "Terima pembayaran" };
  return { kind: "status", label: "Tandai sudah diambil", next: "diambil", confirmTitle: "Tandai sudah diambil?" };
}

export function DetailBottomBar({
  orderId,
  orderNo,
  customerName,
  status,
  isPaid,
}: {
  orderId: string;
  orderNo: string;
  customerName: string;
  status: string;
  isPaid: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const action = deriveAction(status, isPaid);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  async function changeStatus(nextStatus: string) {
    setChanging(true);
    const res = await updateOrderStatus(orderId, nextStatus);
    setChanging(false);
    setConfirmOpen(false);
    if (res.success) {
      show("Status transaksi diperbarui");
      router.refresh();
      return;
    }
    show(res.error || "Gagal memperbarui status", { type: "error" });
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div
          className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2.5 px-4 pt-3"
          style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          {action ? (
            <Button
              size="lg"
              className="flex-1 whitespace-nowrap"
              disabled={action.kind === "status" ? action.disabled : undefined}
              onClick={() => {
                if (action.kind === "pay") router.push(`/transaksi/${orderId}/bayar`);
                else setConfirmOpen(true);
              }}
            >
              {action.label}
            </Button>
          ) : null}
          <Link
            href={`/kasir/nota/${orderId}`}
            className={buttonClass({ variant: "outline", size: "lg", className: "ml-auto shrink-0" })}
          >
            Cetak nota
          </Link>
        </div>
      </div>

      {confirmOpen && action?.kind === "status" ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">{action.confirmTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {orderNo} · {customerName}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button loading={changing} loadingText="Memproses…" onClick={() => changeStatus(action.next)}>
                Ya, lanjutkan
              </Button>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
