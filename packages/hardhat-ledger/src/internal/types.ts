import type { Signature, TypedData } from "./dmk-imports.js";
import type { DeviceAction } from "./run-device-action.js";

export type DerivationFunction = (index: number) => string;

export interface LedgerOptions {
  accounts: string[];
  derivationFunction: DerivationFunction | undefined;
}

export type Paths = Record<string, string>; // address -> derivation path

/**
 * The part of `SignerEth` used by the handler. Keeping it small also simplifies
 * test mocks.
 */
export interface LedgerSigner {
  getAddress(
    derivationPath: string,
    options?: { checkOnDevice?: boolean },
  ): DeviceAction<{ address: string; publicKey: string }>;

  signMessage(
    derivationPath: string,
    message: string | Uint8Array,
  ): DeviceAction<Signature>;

  signTypedData(
    derivationPath: string,
    typedData: TypedData,
  ): DeviceAction<Signature>;

  signTransaction(
    derivationPath: string,
    transaction: Uint8Array,
  ): DeviceAction<Signature>;
}

/** A signer bound to an open Ledger session. */
export interface LedgerDevice {
  signer: LedgerSigner;

  /** Closes the session and releases its USB handles. */
  close(): Promise<void>;
}

/** An injectable device factory that lets tests avoid USB. */
export type LedgerDeviceFactory = (timeoutMs: number) => Promise<LedgerDevice>;
