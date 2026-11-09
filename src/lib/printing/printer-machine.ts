import { toast } from "sonner";

import {
  connectPrinterDevice,
  disconnectDevice,
  isBluetoothPrintingSupported,
  listRememberedDevices,
  requestPrinterDevice,
  sendBytes,
  watchDeviceAdvertisements,
  type BluetoothDeviceLike,
  type GattCharacteristicLike,
  type PrinterConnection,
} from "./bluetooth-printer";
import { isPaperWidth, type PaperWidth } from "./paper";

export type PrinterStatus = "terhubung" | "menyambungkan" | "terputus" | "belum diatur";

export type PrinterSnapshot = {
  supported: boolean;
  status: PrinterStatus;
  name: string | null;
  paper: PaperWidth;
};

type StoredPrinter = {
  id: string;
  name: string;
  serviceUuid?: string;
  characteristicUuid?: string;
};

const PRINTER_KEY = "thermal-printer";
const PAPER_KEY = "thermal-paper-width";
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000];

const SERVER_SNAPSHOT: PrinterSnapshot = {
  supported: false,
  status: "belum diatur",
  name: null,
  paper: "58",
};

let device: BluetoothDeviceLike | null = null;
let characteristic: GattCharacteristicLike | null = null;
let serviceUuid: string | undefined;
let characteristicUuid: string | undefined;
let manual = false;
let initialized = false;
let snapshot: PrinterSnapshot = SERVER_SNAPSHOT;
let reconnectPromise: Promise<boolean> | null = null;

const listeners = new Set<() => void>();
const listenedDevices = new WeakSet<BluetoothDeviceLike>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function emit(): void {
  for (const listener of listeners) listener();
}

function update(patch: Partial<PrinterSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  emit();
}

function readStoredPrinter(): StoredPrinter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PRINTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPrinter>;
    if (!parsed?.id) return null;
    return {
      id: parsed.id,
      name: parsed.name ?? "Printer Bluetooth",
      serviceUuid: parsed.serviceUuid,
      characteristicUuid: parsed.characteristicUuid,
    };
  } catch {
    return null;
  }
}

function writeStoredPrinter(value: StoredPrinter): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRINTER_KEY, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function clearStoredPrinter(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PRINTER_KEY);
  } catch {
    // ignore
  }
}

function readStoredPaper(): PaperWidth {
  if (typeof window === "undefined") return "58";
  try {
    const value = window.localStorage.getItem(PAPER_KEY);
    if (isPaperWidth(value)) return value;
  } catch {
    // ignore
  }
  return "58";
}

function writeStoredPaper(width: PaperWidth): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAPER_KEY, width);
  } catch {
    // ignore
  }
}

function attachDisconnectListener(target: BluetoothDeviceLike): void {
  if (listenedDevices.has(target)) return;
  listenedDevices.add(target);
  try {
    target.addEventListener("gattserverdisconnected", () => {
      characteristic = null;
      if (manual) return;
      toast.info("Printer terputus. Mencoba menyambung ulang…");
      void ensureReconnecting(false);
    });
  } catch {
    // ignore
  }
}

function applyConnection(connection: PrinterConnection): void {
  device = connection.device;
  characteristic = connection.characteristic;
  serviceUuid = connection.serviceUuid;
  characteristicUuid = connection.characteristicUuid;

  const printerName = connection.device.name || readStoredPrinter()?.name || "Printer Bluetooth";
  writeStoredPrinter({
    id: connection.device.id,
    name: printerName,
    serviceUuid: connection.serviceUuid,
    characteristicUuid: connection.characteristicUuid,
  });
  update({ status: "terhubung", name: printerName });
  attachDisconnectListener(connection.device);
}

async function runReconnect(silent: boolean): Promise<boolean> {
  const target = device;
  if (!target) return false;
  if (target.gatt?.connected && characteristic) {
    update({ status: "terhubung" });
    return true;
  }

  update({ status: "menyambungkan" });
  for (let attempt = 0; attempt <= RECONNECT_DELAYS.length; attempt++) {
    if (manual) return false;
    try {
      const connection = await connectPrinterDevice(target, { serviceUuid, characteristicUuid });
      applyConnection(connection);
      if (!silent) toast.success("Printer tersambung kembali");
      return true;
    } catch {
      if (attempt < RECONNECT_DELAYS.length) await sleep(RECONNECT_DELAYS[attempt]);
    }
  }
  if (!manual) update({ status: "terputus" });
  return false;
}

function ensureReconnecting(silent: boolean): Promise<boolean> {
  if (reconnectPromise) return reconnectPromise;
  reconnectPromise = runReconnect(silent).finally(() => {
    reconnectPromise = null;
  });
  return reconnectPromise;
}

async function connect(): Promise<boolean> {
  if (!isBluetoothPrintingSupported()) return false;

  manual = false;
  update({ status: "menyambungkan" });
  const stored = readStoredPrinter();

  try {
    const target = await requestPrinterDevice({ namePrefix: stored?.name ?? null });
    device = target;
    serviceUuid = stored?.serviceUuid;
    characteristicUuid = stored?.characteristicUuid;
    const connection = await connectPrinterDevice(target, {
      serviceUuid: stored?.serviceUuid,
      characteristicUuid: stored?.characteristicUuid,
    });
    applyConnection(connection);
    toast.success(`Printer terhubung: ${connection.device.name || "Printer"}`);
    return true;
  } catch (err) {
    update({ status: stored?.id ? "terputus" : "belum diatur" });
    toast.error(err instanceof Error ? err.message : "Gagal menghubungkan printer");
    return false;
  }
}

async function ensureConnected(): Promise<boolean> {
  if (device && characteristic && device.gatt?.connected) return true;
  if (device) return ensureReconnecting(false);

  const stored = readStoredPrinter();
  if (!stored?.id) return false;

  const devices = await listRememberedDevices();
  const match = devices.find((candidate) => candidate.id === stored.id);
  if (!match) return false;

  device = match;
  serviceUuid = stored.serviceUuid;
  characteristicUuid = stored.characteristicUuid;
  return ensureReconnecting(false);
}

function forget(): void {
  manual = true;
  if (device) disconnectDevice(device);
  device = null;
  characteristic = null;
  serviceUuid = undefined;
  characteristicUuid = undefined;
  clearStoredPrinter();
  update({ status: "belum diatur", name: null });
}

function setPaper(width: PaperWidth): void {
  writeStoredPaper(width);
  update({ paper: width });
}

async function send(bytes: Uint8Array): Promise<void> {
  if (!characteristic) throw new Error("Printer belum terhubung.");
  await sendBytes(characteristic, bytes);
}

async function restoreRemembered(stored: StoredPrinter): Promise<void> {
  const devices = await listRememberedDevices();
  const match = devices.find((candidate) => candidate.id === stored.id);
  if (!match) return;

  device = match;
  serviceUuid = stored.serviceUuid;
  characteristicUuid = stored.characteristicUuid;
  await watchDeviceAdvertisements(match);
  await ensureReconnecting(true);
}

function init(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const supported = isBluetoothPrintingSupported();
  const stored = readStoredPrinter();
  snapshot = {
    supported,
    status: "belum diatur",
    name: stored?.name ?? null,
    paper: readStoredPaper(),
  };
  emit();

  if (!supported) return;

  if (stored?.id) {
    update({ status: "terputus" });
    void restoreRemembered(stored);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (device && !device.gatt?.connected && !manual) void ensureReconnecting(false);
  });
}

export const printerMachine = {
  init,
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
  connect,
  ensureConnected,
  forget,
  setPaper,
  send,
};

if (typeof window !== "undefined") init();
