import type { TypedData } from "./dmk-imports.js";
import type { DeviceAction } from "./run-device-action.js";

export type DerivationFunction = (index: number) => string;

export interface LedgerOptions {
  accounts: string[];
  derivationFunction: DerivationFunction | undefined;
}

export type Paths = Record<string, string>; // { address: 0x-string }

/**
 * A signature as the Device Management Kit reports it, with `r` and `s`
 * `0x`-prefixed.
 */
export interface DeviceSignature {
  r: string;
  s: string;
  v: number;
}

/**
 * The part of the DMK's `SignerEth` that we use. Declaring the subset ourselves
 * keeps the handler decoupled from the signer kit's internal device-action
 * types, and lets tests supply a mock without implementing the methods we never
 * call (`verifySafeAddress`, `signDelegationAuthorization`).
 */
export interface LedgerSigner {
  getAddress(
    derivationPath: string,
    options?: { checkOnDevice?: boolean },
  ): DeviceAction<{ address: string; publicKey: string }>;

  signMessage(
    derivationPath: string,
    message: string | Uint8Array,
  ): DeviceAction<DeviceSignature>;

  signTypedData(
    derivationPath: string,
    typedData: TypedData,
  ): DeviceAction<DeviceSignature>;

  signTransaction(
    derivationPath: string,
    transaction: Uint8Array,
  ): DeviceAction<DeviceSignature>;
}

/**
 * A connected Ledger device: a signer bound to an open device session, plus the
 * teardown for that session.
 */
export interface LedgerDevice {
  signer: LedgerSigner;

  /**
   * Closes the device session and releases the USB handles. This must be called
   * before the process exits; see the comment in `connect-device.ts`.
   */
  close(): Promise<void>;
}

/**
 * Opens a connection to a Ledger device. Injected so that tests never touch USB.
 */
export type LedgerDeviceFactory = (timeoutMs: number) => Promise<LedgerDevice>;
