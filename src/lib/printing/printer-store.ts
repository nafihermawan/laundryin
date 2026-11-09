import {
  ThermalPrinter,
  isBluetoothPrintingSupported,
  type BluetoothDeviceLike,
} from "./bluetooth-printer";

export type PaperWidth = "58" | "80";

export type PrinterStatus = "unsupported" | "disconnected" | "connecting" | "connected";

export type PrinterSnapshot = {
  supported: boolean;
  status: PrinterStatus;
  name: string | null;
  paper: PaperWidth;
};

const PRINTER_KEY = "thermal-printer";
const PAPER_KEY = "thermal-paper-width";

const SERVER_SNAPSHOT: PrinterSnapshot = {
  supported: false,
  status: "unsupported",
  name: null,
  paper: "58",
};

let printer: ThermalPrinter | null = null;
let storedId: string | null = null;
let snapshot: PrinterSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function readStoredPrinter(): { id: string | null; name: string | null } {
  if (typeof window === "undefined") return { id: null, name: null };
  try {
    const raw = window.localStorage.getItem(PRINTER_KEY);
    if (!raw) return { id: null, name: null };
    const parsed = JSON.parse(raw) as { id?: string; name?: string };
    return { id: parsed?.id ?? null, name: parsed?.name ?? null };
  } catch {
    return { id: null, name: null };
  }
}

function readStoredPaper(): PaperWidth {
  if (typeof window === "undefined") return "58";
  try {
    const value = window.localStorage.getItem(PAPER_KEY);
    if (value === "80" || value === "58") return value;
  } catch {
    // ignore
  }
  return "58";
}

function persistPrinter(value: { id: string; name: string } | null): void {
  storedId = value?.id ?? null;
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(PRINTER_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(PRINTER_KEY);
  } catch {
    // ignore
  }
}

function update(patch: Partial<PrinterSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

function attach(next: ThermalPrinter): void {
  printer = next;
  next.onDisconnect(() => {
    if (printer === next) printer = null;
    update({ status: "disconnected" });
  });
  persistPrinter({ id: next.id, name: next.name });
  update({ status: "connected", name: next.name });
}

if (typeof window !== "undefined") {
  const supported = isBluetoothPrintingSupported();
  const stored = readStoredPrinter();
  storedId = stored.id;
  snapshot = {
    supported,
    status: supported ? "disconnected" : "unsupported",
    name: stored.name,
    paper: readStoredPaper(),
  };
}

export const printerStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): PrinterSnapshot {
    return snapshot;
  },
  getServerSnapshot(): PrinterSnapshot {
    return SERVER_SNAPSHOT;
  },
};

export async function connectPrinter(): Promise<{ printer: ThermalPrinter | null; error?: string }> {
  if (!isBluetoothPrintingSupported()) {
    return {
      printer: null,
      error: "Web Bluetooth tidak didukung di browser ini (pakai Chrome Android).",
    };
  }

  update({ status: "connecting" });
  try {
    const next = await ThermalPrinter.request();
    attach(next);
    return { printer: next };
  } catch (err) {
    update({ status: "disconnected" });
    return {
      printer: null,
      error: err instanceof Error ? err.message : "Gagal menghubungkan printer",
    };
  }
}

export async function ensureConnected(): Promise<ThermalPrinter | null> {
  if (printer) return printer;
  if (!isBluetoothPrintingSupported() || !storedId) return null;

  const devices = await ThermalPrinter.remembered();
  const match = devices.find((device: BluetoothDeviceLike) => device.id === storedId);
  if (!match) return null;

  update({ status: "connecting" });
  try {
    const next = await ThermalPrinter.connect(match);
    attach(next);
    return next;
  } catch {
    update({ status: "disconnected" });
    return null;
  }
}

export function disconnectPrinter(): void {
  try {
    printer?.disconnect();
  } catch {
    // ignore
  }
  printer = null;
  update({ status: "disconnected" });
}

export function forgetPrinter(): void {
  disconnectPrinter();
  persistPrinter(null);
  update({ name: null });
}

export function setPaperWidth(width: PaperWidth): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PAPER_KEY, width);
    } catch {
      // ignore
    }
  }
  update({ paper: width });
}
