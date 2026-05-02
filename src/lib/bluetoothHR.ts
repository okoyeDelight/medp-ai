// Web Bluetooth heart rate monitor integration.
// Standard GATT: Heart Rate Service (0x180D), Heart Rate Measurement char (0x2A37).

export interface HRConnection {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
  disconnect: () => void;
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && !!(navigator as any).bluetooth;
}

/**
 * Parse the Heart Rate Measurement characteristic per Bluetooth GATT spec.
 * Bit 0 of the flags byte: 0 = uint8 BPM, 1 = uint16 BPM.
 */
export function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16bit = (flags & 0x01) === 0x01;
  return is16bit ? value.getUint16(1, true) : value.getUint8(1);
}

/**
 * Request a Bluetooth heart rate monitor, connect, and stream BPM values
 * to `onBpm`. Returns a handle you can use to disconnect.
 */
export async function connectToHeartRateMonitor(
  onBpm: (bpm: number) => void,
): Promise<HRConnection> {
  if (!isWebBluetoothSupported()) {
    throw new Error("WEB_BLUETOOTH_UNSUPPORTED");
  }

  const device = await (navigator as any).bluetooth.requestDevice({
    filters: [{ services: ["heart_rate"] }],
  });

  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("heart_rate");
  const characteristic = await service.getCharacteristic("heart_rate_measurement");

  // Read once for an immediate value.
  try {
    const initial = await characteristic.readValue();
    onBpm(parseHeartRate(initial));
  } catch {
    // Some devices only support notifications — ignore read failure.
  }

  // Subscribe to notifications for live updates.
  const handler = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) onBpm(parseHeartRate(target.value));
  };
  characteristic.addEventListener("characteristicvaluechanged", handler);
  await characteristic.startNotifications();

  const disconnect = () => {
    try {
      characteristic.removeEventListener("characteristicvaluechanged", handler);
      characteristic.stopNotifications().catch(() => {});
      device.gatt?.disconnect();
    } catch {
      // ignore
    }
  };

  return { device, characteristic, disconnect };
}
