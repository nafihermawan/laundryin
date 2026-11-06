"use client";

import { useEffect } from "react";

import { useToast } from "@/components/ui/toast";

export function BukaShiftToast() {
  const { show } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("buka-shift") !== "1") return;
    show("Buka shift dulu untuk membuat transaksi", { type: "error" });
    window.history.replaceState(null, "", window.location.pathname);
  }, [show]);

  return null;
}
