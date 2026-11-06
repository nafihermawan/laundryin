"use client";

import { Copy } from "lucide-react";

import { useToast } from "@/components/ui/toast";

export function CopyOrderButton({ orderNo }: { orderNo: string }) {
  const { show } = useToast();

  return (
    <button
      type="button"
      aria-label="Salin nomor order"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(orderNo);
          show("Nomor order disalin");
        } catch {}
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
    >
      <Copy className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
