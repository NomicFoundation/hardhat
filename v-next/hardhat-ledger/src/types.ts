import type { DeviceId, DeviceModelId } from "@ledgerhq/device-management-kit";

export interface LedgerAccount {
  address: string;
  derivationPath: string;
  publicKey: string;
}

export interface LedgerOptions {
  derivationFunction?: (index: number) => string;
  dmkOptions?: DMKOptions;
}

export interface DMKOptions {
  connectionTimeout?: number;
  deviceFilter?: DeviceFilter;
  transportType?: "usb" | "ble";
}

export interface DeviceFilter {
  modelId?: DeviceModelId;
  deviceId?: DeviceId;
}

export interface LedgerConnection {
  deviceId: DeviceId;
  modelId: DeviceModelId;
  accounts: LedgerAccount[];
  isConnected: boolean;
}

export interface SignTransactionRequest {
  transaction: {
    to?: string;
    from: string;
    data?: string;
    value?: bigint;
    nonce?: number;
    gasLimit?: bigint;
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    chainId?: number;
  };
  derivationPath: string;
}

export interface SignMessageRequest {
  message: string | Uint8Array;
  derivationPath: string;
}

export interface SignTypedDataRequest {
  domain: any;
  types: any;
  value: any;
  derivationPath: string;
}

export class LedgerError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "LedgerError";
  }
}

export class DeviceNotConnectedError extends LedgerError {
  constructor(message = "Ledger device is not connected") {
    super(message, "DEVICE_NOT_CONNECTED");
  }
}

export class UserRejectedError extends LedgerError {
  constructor(message = "User rejected the operation on the Ledger device") {
    super(message, "USER_REJECTED");
  }
}

export class AppNotOpenError extends LedgerError {
  constructor(message = "Ethereum app is not open on the Ledger device") {
    super(message, "APP_NOT_OPEN");
  }
}