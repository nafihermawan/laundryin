// Web Bluetooth (BLE) ESC/POS printer helpers. Client-only; Chrome on Android.
// No global types added — we declare the minimal shape we use and access
// `navigator.bluetooth` defensively.

export interface GattCharacteristicLike {
  uuid?: string;
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue(value: Uint8Array): Promise<void>;
  writeValueWithoutResponse(value: Uint8Array): Promise<void>;
}

export interface GattServiceLike {
  uuid: string;
  getCharacteristics(): Promise<GattCharacteristicLike[]>;
}

export interface GattServerLike {
  connected: boolean;
  connect(): Promise<GattServerLike>;
  disconnect(): void;
  getPrimaryServices(): Promise<GattServiceLike[]>;
  getPrimaryService(uuid: string): Promise<GattServiceLike>;
}

export interface BluetoothDeviceLike {
  id: string;
  name?: string | null;
  gatt?: GattServerLike;
  addEventListener(type: string, listener: () => void): void;
  watchAdvertisements?(): Promise<void>;
}

export interface BluetoothLike {
  requestDevice(options: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
    filters?: Array<{ namePrefix?: string; services?: string[] }>;
  }): Promise<BluetoothDeviceLike>;
  getDevices?(): Promise<BluetoothDeviceLike[]>;
}

// Services commonly exposed by BLE thermal printers.
export const PRINTER_SERVICES = [
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

// Small writes keep BLE buffers happy on long receipts. Fall back to the
// MTU-safe minimum if the printer rejects larger chunks.
const CHUNK_SIZE = 128;
const MIN_CHUNK_SIZE = 20;
const CHUNK_DELAY_MS = 10;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function bluetoothApi(): BluetoothLike | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  return api && typeof api.requestDevice === "function" ? api : null;
}

export function isBluetoothPrintingSupported(): boolean {
  return bluetoothApi() !== null;
}

export type PrinterConnection = {
  device: BluetoothDeviceLike;
  characteristic: GattCharacteristicLike;
  serviceUuid: string;
  characteristicUuid: string;
};

type WritableCharacteristic = {
  characteristic: GattCharacteristicLike;
  serviceUuid: string;
  characteristicUuid: string;
};

async function findWritableCharacteristic(
  server: GattServerLike,
  preferred?: { serviceUuid?: string; characteristicUuid?: string },
): Promise<WritableCharacteristic | null> {
  const pick = (chars: GattCharacteristicLike[]) =>
    chars.find((c) => c.properties.writeWithoutResponse || c.properties.write) ?? null;

  if (preferred?.serviceUuid) {
    try {
      const service = await server.getPrimaryService(preferred.serviceUuid);
      const found = pick(await service.getCharacteristics());
      if (found) {
        return {
          characteristic: found,
          serviceUuid: service.uuid,
          characteristicUuid: found.uuid ?? "",
        };
      }
    } catch {
      // preferred service no longer present; fall through to discovery
    }
  }

  for (const uuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const found = pick(await service.getCharacteristics());
      if (found) {
        return {
          characteristic: found,
          serviceUuid: service.uuid,
          characteristicUuid: found.uuid ?? "",
        };
      }
    } catch {
      // service not present on this device
    }
  }

  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const found = pick(await service.getCharacteristics());
      if (found) {
        return {
          characteristic: found,
          serviceUuid: service.uuid,
          characteristicUuid: found.uuid ?? "",
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function requestPrinterDevice(options?: {
  namePrefix?: string | null;
}): Promise<BluetoothDeviceLike> {
  const api = bluetoothApi();
  if (!api) {
    throw new Error("Web Bluetooth tidak didukung di browser ini (pakai Chrome Android).");
  }

  const namePrefix = options?.namePrefix?.trim();
  return api.requestDevice({
    optionalServices: PRINTER_SERVICES,
    ...(namePrefix ? { filters: [{ namePrefix }] } : { acceptAllDevices: true }),
  });
}

export async function connectPrinterDevice(
  device: BluetoothDeviceLike,
  hints?: { serviceUuid?: string; characteristicUuid?: string },
): Promise<PrinterConnection> {
  if (!device.gatt) throw new Error("Perangkat tidak punya layanan GATT.");
  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const found = await findWritableCharacteristic(server, hints);
  if (!found) {
    throw new Error("Printer tidak menyediakan karakteristik tulis (bukan printer ESC/POS?).");
  }
  return {
    device,
    characteristic: found.characteristic,
    serviceUuid: found.serviceUuid,
    characteristicUuid: found.characteristicUuid,
  };
}

export async function listRememberedDevices(): Promise<BluetoothDeviceLike[]> {
  const api = bluetoothApi();
  if (!api?.getDevices) return [];
  try {
    return await api.getDevices();
  } catch {
    return [];
  }
}

export async function watchDeviceAdvertisements(device: BluetoothDeviceLike): Promise<void> {
  if (typeof device.watchAdvertisements !== "function") return;
  try {
    await device.watchAdvertisements();
  } catch {
    // watching may be unavailable or require a gesture; ignore
  }
}

export function disconnectDevice(device: BluetoothDeviceLike): void {
  try {
    device.gatt?.disconnect();
  } catch {
    // ignore
  }
}

export async function sendBytes(
  characteristic: GattCharacteristicLike,
  bytes: Uint8Array,
): Promise<void> {
  const { writeWithoutResponse, write } = characteristic.properties;

  const writeChunk = async (slice: Uint8Array) => {
    if (writeWithoutResponse) await characteristic.writeValueWithoutResponse(slice);
    else if (write) await characteristic.writeValue(slice);
    else throw new Error("Printer tidak bisa menerima data.");
  };

  let chunkSize = CHUNK_SIZE;
  let offset = 0;

  while (offset < bytes.length) {
    const slice = bytes.slice(offset, offset + chunkSize);
    try {
      await writeChunk(slice);
      offset += slice.length;
      await sleep(CHUNK_DELAY_MS);
    } catch (err) {
      if (chunkSize > MIN_CHUNK_SIZE) {
        chunkSize = MIN_CHUNK_SIZE;
        continue;
      }
      throw err;
    }
  }
}
