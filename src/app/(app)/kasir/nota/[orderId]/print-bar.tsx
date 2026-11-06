"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function PrintBar() {
  const { show } = useToast();
  const [printing, setPrinting] = useState(false);

  function doPrint() {
    setPrinting(true);
    // Give React a frame to paint the disabled/spinner state before the blocking print dialog.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        try {
          window.print();
          setPrinting(false);
        } catch {
          setPrinting(false);
          show("Gagal membuka dialog cetak", { actionLabel: "Coba lagi", onAction: doPrint });
        }
      }, 50);
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white print:hidden">
      <div
        className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 pt-3"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        <Button size="lg" onClick={doPrint} disabled={printing}>
          {printing ? (
            <>
              <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
              Mencetak…
            </>
          ) : (
            <>
              <Printer className="h-[18px] w-[18px]" strokeWidth={2} />
              Cetak
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
