"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import type { PaperWidth } from "./paper";
import { printerMachine, type PrinterSnapshot } from "./printer-machine";

export type PrinterApi = PrinterSnapshot & {
  connect: () => Promise<boolean>;
  ensureConnected: () => Promise<boolean>;
  forget: () => void;
  setPaper: (width: PaperWidth) => void;
  send: (bytes: Uint8Array) => Promise<void>;
};

export function PrinterProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    printerMachine.init();
  }, []);

  return <>{children}</>;
}

export function usePrinter(): PrinterApi {
  const snapshot = useSyncExternalStore(
    printerMachine.subscribe,
    printerMachine.getSnapshot,
    printerMachine.getServerSnapshot,
  );

  return {
    ...snapshot,
    connect: printerMachine.connect,
    ensureConnected: printerMachine.ensureConnected,
    forget: printerMachine.forget,
    setPaper: printerMachine.setPaper,
    send: printerMachine.send,
  };
}
