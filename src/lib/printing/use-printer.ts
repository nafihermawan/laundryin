"use client";

import { useSyncExternalStore } from "react";

import { printerStore, type PrinterSnapshot } from "./printer-store";

export function usePrinter(): PrinterSnapshot {
  return useSyncExternalStore(
    printerStore.subscribe,
    printerStore.getSnapshot,
    printerStore.getServerSnapshot,
  );
}
