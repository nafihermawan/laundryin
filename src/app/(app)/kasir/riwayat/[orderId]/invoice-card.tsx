"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { checkQrisDynamicPaymentStatus } from "@/app/(app)/kasir/riwayat/actions";

function formatRp(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function formatClock(value: string) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function InvoiceCard({
  orderId,
  total,
  lastAttempt,
}: {
  orderId: string;
  total: number;
  lastAttempt: { paymentId: string; status: string; expiresAt: string | null } | null;
}) {
  const router = useRouter();
  const { show } = useToast();

  const [status, setStatus] = useState(lastAttempt?.status ?? null);
  const [hidden, setHidden] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const refreshed = useRef(false);

  const expiresMs = lastAttempt?.expiresAt ? new Date(lastAttempt.expiresAt).getTime() : null;
  const remaining = expiresMs !== null ? expiresMs - nowMs : null;
  const active = status === "pending" && remaining !== null && remaining > 0;
  const hasAttempt = lastAttempt !== null;

  useEffect(() => {
    if (!lastAttempt?.paymentId || hidden) return;
    if (status !== "pending") return;
    const pid = lastAttempt.paymentId;
    let busy = false;

    async function poll() {
      if (busy) return;
      busy = true;
      try {
        const res = await checkQrisDynamicPaymentStatus(pid);
        if (res.success) {
          setStatus(res.data.status);
          if (res.data.status === "paid") {
            setHidden(true);
            if (!refreshed.current) {
              refreshed.current = true;
              show("Pembayaran QRIS diterima");
              router.refresh();
            }
          }
        }
      } catch {
      } finally {
        busy = false;
      }
    }

    poll();
    const t = window.setInterval(poll, 5000);
    return () => window.clearInterval(t);
  }, [lastAttempt?.paymentId, hidden, status, router, show]);

  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);

  if (hidden) return null;

  let description: string;
  if (!hasAttempt) {
    description = `Tagihan ${formatRp(total)}`;
  } else if (active) {
    description = `Menunggu pembayaran QRIS · s/d ${lastAttempt?.expiresAt ? formatClock(lastAttempt.expiresAt) : "-"}`;
  } else {
    description = `QRIS kedaluwarsa ${lastAttempt?.expiresAt ? formatDateTime(lastAttempt.expiresAt) : ""}`.trim();
  }

  const label = active ? "Lihat QR" : "Bayar sekarang";

  function handleClick() {
    if (active) {
      router.push(`/transaksi/${orderId}/bayar?method=qris_dynamic&qr=1`);
      return;
    }
    router.push(`/transaksi/${orderId}/bayar${hasAttempt ? "?method=qris_dynamic" : ""}`);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-orange-100">
        <Clock className="h-5 w-5 text-orange-700" strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-orange-800">Belum dibayar</span>
        <span className="text-[13px] text-orange-800">{description}</span>
      </div>
      <Button onClick={handleClick} className="shrink-0 whitespace-nowrap">
        {label}
      </Button>
    </div>
  );
}
