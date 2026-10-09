import type { DmkError } from "./dmk-imports.js";

import { CustomError } from "@nomicfoundation/hardhat-utils/error";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

/**
 * Wraps a plain-object `DmkError` so Error-based code can classify it by tag.
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

export class LedgerDeviceActionStoppedError extends CustomError {
  constructor() {
    super("The Ledger device action was stopped before it completed");
  }
}

export class LedgerNoDeviceFoundError extends CustomError {
  constructor() {
    super("No Ledger device was found");
  }
}

export class LedgerConnectionClosedError extends CustomError {
  constructor() {
    super("The Ledger connection was closed");
  }
}

export class LedgerSessionLostError extends CustomError {
  constructor() {
    super(
      "The Ledger device session was dropped before the request could use it",
    );
  }
}

/**
 * Errors that indicate the device disconnected and needs a new session.
 *
 * `NodeHidSendReportError` may occur before the DMK notices the disconnect.
 */
const RECONNECTABLE_ERROR_TAGS = new Set([
  "DeviceDisconnectedBeforeSendingApdu",
  "DeviceDisconnectedWhileSendingError",
  "DeviceNotInitializedError",
  "DeviceSessionNotFound",
  "DisconnectError",
  "NodeHidSendReportError",
  "ReconnectionFailedError",
]);

/**
 * Errors that can be resolved by unlocking the device or waiting.
 *
 * The signer opens the Ethereum app itself, so there is no app-not-open tag.
 */
const DEVICE_NOT_READY_ERROR_TAGS = new Set([
  "DeviceBusyError",
  "DeviceLockedError",
]);

/**
 * Errors raised when no device can be reached.
 *
 * The DMK exports `OpeningConnectionError` but tags it `ConnectionOpeningError`.
 * Include both names in case Ledger aligns them later.
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

/** Returns the DMK tag to show in connection errors. */
export function getErrorTag(error: Error): string {
  return error instanceof LedgerDeviceError ? error.tag : "";
}

/**
 * Converts any DMK rejection to an `Error` so the handler can classify it.
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
