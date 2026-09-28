import type { DmkError } from "./dmk-imports.js";

import { CustomError } from "@nomicfoundation/hardhat-utils/error";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Wraps a `DmkError`, which is a plain object (`{ _tag, originalError?,
 * message? }`) and not an `Error`, so that the handler can keep using
 * `try`/`catch`, `ensureError` and the `cause` chain. The `tag` is what we
 * classify on, replacing the `instanceof` checks of `@ledgerhq/errors`.
 */
export class LedgerDeviceError extends CustomError {
  public readonly tag: string;

  constructor(dmkError: DmkError) {
    const message =
      dmkError.message !== undefined && dmkError.message !== ""
        ? `${dmkError._tag}: ${dmkError.message}`
        : dmkError._tag;

    super(message, toCause(dmkError.originalError));

    this.tag = dmkError._tag;
  }
}

/**
 * Thrown when a device action ends without producing a result or an error.
 */
export class LedgerDeviceActionStoppedError extends CustomError {
  constructor() {
    super("The Ledger device action was stopped before it completed");
  }
}

/**
 * Thrown while connecting, when no Ledger device is plugged in. The DMK reports
 * that as an empty device list rather than an error, so we produce it ourselves.
 */
export class LedgerNoDeviceFoundError extends CustomError {
  constructor() {
    super("No Ledger device was found");
  }
}

/**
 * Thrown when a request needs the device after the network connection that owns
 * the handler has been closed. Reconnecting then would leave a session that
 * nothing will ever close.
 */
export class LedgerConnectionClosedError extends CustomError {
  constructor() {
    super("The Ledger connection was closed");
  }
}

/**
 * Thrown when the device session is dropped between opening it and using it,
 * which happens when a concurrent request on the same connection reconnects.
 */
export class LedgerSessionLostError extends CustomError {
  constructor() {
    super(
      "The Ledger device session was dropped before the request could use it",
    );
  }
}

/**
 * Tags meaning the device went away mid-operation. Recoverable: we drop the
 * session and connect again.
 *
 * `NodeHidSendReportError` is the transport's own write failure, which is what
 * surfaces when a write fails before the DMK sees the USB detach event.
 */
const RECONNECTABLE_ERROR_TAGS = new Set([
  "DeviceDisconnectedBeforeSendingApdu",
  "DeviceDisconnectedWhileSendingError",
  "DeviceNotInitializedError",
  "DisconnectError",
  "NodeHidSendReportError",
  "ReconnectionFailedError",
]);

/**
 * Tags meaning the device is reachable but not ready, i.e. at the PIN screen or
 * busy. Recoverable by waiting for the user.
 *
 * There is no "Ethereum app is not open" tag: the signer opens the app itself,
 * so the `0x6511` status word we used to check for never reaches us.
 */
const DEVICE_NOT_READY_ERROR_TAGS = new Set([
  "DeviceBusyError",
  "DeviceLockedError",
]);

/**
 * Tags meaning we could not reach a device at all while connecting.
 *
 * The DMK exports `OpeningConnectionError` but tags it `ConnectionOpeningError`.
 * We classify on the tag; the class name is listed too, in case Ledger ever
 * aligns the two.
 */
const DEVICE_NOT_CONNECTED_ERROR_TAGS = new Set([
  "ConnectionOpeningError",
  "DeviceNotRecognizedError",
  "NoAccessibleDeviceError",
  "OpeningConnectionError",
  "UnknownDeviceError",
]);

export function isReconnectableError(error: Error): boolean {
  return error instanceof LedgerDeviceError
    ? RECONNECTABLE_ERROR_TAGS.has(error.tag)
    : false;
}

export function isDeviceNotReadyError(error: Error): boolean {
  return error instanceof LedgerDeviceError
    ? DEVICE_NOT_READY_ERROR_TAGS.has(error.tag)
    : false;
}

export function isDeviceLockedError(error: Error): boolean {
  return error instanceof LedgerDeviceError
    ? error.tag === "DeviceLockedError"
    : false;
}

export function isDeviceNotConnectedError(error: Error): boolean {
  if (error instanceof LedgerNoDeviceFoundError) {
    return true;
  }

  return error instanceof LedgerDeviceError
    ? DEVICE_NOT_CONNECTED_ERROR_TAGS.has(error.tag)
    : false;
}

/**
 * The tag to show in the connection error message. It plays the role that
 * `TransportError#id` used to play with the old Ledger packages.
 */
export function getErrorTag(error: Error): string {
  return error instanceof LedgerDeviceError ? error.tag : "";
}

/**
 * Normalizes anything a DMK call rejects with into an `Error`.
 *
 * `DeviceManagementKit#connect()` rejects with a raw `DmkError`, a plain object
 * that `ensureError` would rethrow untouched, leaving the handler unable to
 * classify or wrap it. Everything crossing the DMK boundary goes through here.
 */
export function toLedgerError(thrown: unknown): Error {
  if (thrown instanceof Error) {
    return thrown;
  }

  return new LedgerDeviceError(
    isDmkError(thrown)
      ? thrown
      : { _tag: "UnknownDAError", originalError: thrown },
  );
}

function isDmkError(value: unknown): value is DmkError {
  return isObject(value) && typeof value._tag === "string";
}

function toCause(originalError: unknown): Error | undefined {
  return originalError instanceof Error ? originalError : undefined;
}
