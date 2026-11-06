// Web Bluetooth (BLE) ESC/POS printer helper. Client-only; Chrome on Android.
// No global types added — we declare the minimal shape we use and access
// `navigator.bluetooth` defensively.

export interface GattCharacteristicLike {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
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
  device?: { addEventListener(type: string, listener: () => void): void };
}

export interface BluetoothDeviceLike {
  id: string;
  name?: string | null;
  gatt?: GattServerLike;
  addEventListener(type: string, listener: () => void): void;
}

export interface BluetoothLike {
  requestDevice(options: {
    acceptAllDevices?: boolean;
    optionalServices?: string[];
    filters?: Array<{ services: string[] }>;
  }): Promise<BluetoothDeviceLike>;
  getDevices?(): Promise<BluetoothDeviceLike[]>;
}

// Services commonly exposed by BLE thermal printers.
const KNOWN_SERVICES = [
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

const CHUNK = 20;
const CHUNK_DELAY_MS = 18;

function bluetoothApi(): BluetoothLike | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  return api && typeof api.requestDevice === "function" ? api : null;
}

export function isBluetoothPrintingSupported(): boolean {
  return bluetoothApi() !== null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function findWritableCharacteristic(
  server: GattServerLike,
): Promise<GattCharacteristicLike | null> {
  const pick = (chars: GattCharacteristicLike[]) =>
    chars.find((c) => c.properties.writeWithoutResponse || c.properties.write) ?? null;

  for (const uuid of KNOWN_SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const found = pick(await service.getCharacteristics());
      if (found) return found;
    } catch {
      // service not present on this device
    }
  }

  try {
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const found = pick(await service.getCharacteristics());
      if (found) return found;
    }
  } catch {
    // ignore
  }

  return null;
}

export class ThermalPrinter {
  private device: BluetoothDeviceLike;
  private characteristic: GattCharacteristicLike;

  constructor(device: BluetoothDeviceLike, characteristic: GattCharacteristicLike) {
    this.device = device;
    this.characteristic = characteristic;
  }

  get name(): string {
    return this.device.name || "Printer Bluetooth";
  }

  get id(): string {
    return this.device.id;
  }

  static async request(): Promise<ThermalPrinter> {
    const api = bluetoothApi();
    if (!api) throw new Error("Web Bluetooth tidak didukung di browser ini (pakai Chrome Android).");

    const device = await api.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_SERVICES,
    });
    return ThermalPrinter.connect(device);
  }

  static async connect(device: BluetoothDeviceLike): Promise<ThermalPrinter> {
    if (!device.gatt) throw new Error("Perangkat tidak punya layanan GATT.");
    const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
    const characteristic = await findWritableCharacteristic(server);
    if (!characteristic) {
      throw new Error("Printer tidak menyediakan karakteristik tulis (bukan printer ESC/POS?).");
    }
    return new ThermalPrinter(device, characteristic);
  }

  static async remembered(): Promise<BluetoothDeviceLike[]> {
    const api = bluetoothApi();
    if (!api?.getDevices) return [];
    try {
      return await api.getDevices();
    } catch {
      return [];
    }
  }

  async print(bytes: Uint8Array): Promise<void> {
    const { writeWithoutResponse, write } = this.characteristic.properties;
    for (let offset = 0; offset < bytes.length; offset += CHUNK) {
      const slice = bytes.slice(offset, offset + CHUNK);
      if (writeWithoutResponse) await this.characteristic.writeValueWithoutResponse(slice);
      else if (write) await this.characteristic.writeValue(slice);
      else throw new Error("Printer tidak bisa menerima data.");
      await sleep(CHUNK_DELAY_MS);
    }
  }

  disconnect(): void {
    try {
      this.device.gatt?.disconnect();
    } catch {
      // ignore
    }
  }

  onDisconnect(handler: () => void): void {
    try {
      this.device.addEventListener("gattserverdisconnected", handler);
    } catch {
      // ignore
    }
  }
}
