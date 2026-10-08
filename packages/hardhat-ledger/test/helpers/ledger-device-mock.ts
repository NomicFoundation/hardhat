import type {
  DmkError,
  Signature,
  TypedData,
} from "../../src/internal/dmk-imports.js";
import type { DeviceAction } from "../../src/internal/run-device-action.js";
import type {
  LedgerDevice,
  LedgerDeviceFactory,
  LedgerSigner,
} from "../../src/internal/types.js";
import type { ObservedValueOf, Subscriber } from "rxjs";

import assert from "node:assert/strict";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { bytesToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { Observable, of } from "rxjs";

import { LedgerDeviceError } from "../../src/internal/dmk-errors.js";
import { DeviceActionStatus } from "../../src/internal/dmk-imports.js";

/**
 * A `LedgerDeviceFactory` mock that reports failures like the real signer.
 */

export const DEVICE_LOCKED_ERROR: DmkError = {
  _tag: "DeviceLockedError",
  message: "Device is locked",
};
export const DEVICE_BUSY_ERROR: DmkError = {
  _tag: "DeviceBusyError",
  message: "Device is busy",
};
export const DEVICE_DISCONNECTED_ERROR: DmkError = {
  _tag: "DeviceDisconnectedWhileSendingError",
  message: "Device was disconnected",
};
export const DEVICE_DISCONNECTED_BEFORE_SENDING_ERROR: DmkError = {
  _tag: "DeviceDisconnectedBeforeSendingApdu",
  message: "Device was disconnected before sending",
};
export const NO_ACCESSIBLE_DEVICE_ERROR: DmkError = {
  _tag: "NoAccessibleDeviceError",
  message: "No accessible device",
};
export const REFUSED_BY_USER_ERROR: DmkError = {
  _tag: "RefusedByUserDAError",
  message: "Refused by the user",
};
/** The plain object thrown by the signer after its session is lost. */
export const DEVICE_SESSION_NOT_FOUND_ERROR: DmkError = {
  _tag: "DeviceSessionNotFound",
  originalError: new Error("Device session not found"),
};

interface MethodConfig {
  /** Errors to emit on consecutive calls, before succeeding. */
  errorSequenceToEmit?: DmkError[];
  /** Errors to throw synchronously on consecutive calls, before succeeding. */
  errorsToThrow?: DmkError[];
  /** Keeps the action pending this long, like a user taking time to approve. */
  delayMs?: number;
}

export interface MethodsConfig {
  getAddress?: MethodConfig & {
    result: (searchedPath: string) => { address: string; publicKey: string };
  };
  signMessage?: MethodConfig & {
    result: Signature;
    expectedParams?: { path: string; data: string };
  };
  signTypedData?: MethodConfig & {
    result: Signature;
    expectedParams?: { path: string; typedData: TypedData };
  };
  signTransaction?: MethodConfig & {
    result: Signature;
    expectedParams?: { path: string; rawTxHex: string };
  };
}

interface MockCallState {
  totalCalls: number;
  args: unknown[];
}

export type MockCalls = Record<keyof LedgerSigner, MockCallState>;

export interface DeviceFactoryState {
  connectCount: number;
  closeCount: number;
  cancelCount: number;
}

interface DeviceFactoryOptions {
  state?: DeviceFactoryState;
  /**
   * Errors for consecutive connection attempts. Raw DMK errors are wrapped as
   * they are in production.
   */
  connectionErrors?: Array<Error | DmkError>;
  /** How long opening a session takes. */
  connectDelayMs?: number;
}

export function createDeviceFactoryState(): DeviceFactoryState {
  return { connectCount: 0, closeCount: 0, cancelCount: 0 };
}

/**
 * Returns a configured device factory and a log of its signer calls.
 */
export function getLedgerDeviceMock(
  methodsConfig: MethodsConfig = {},
  options: DeviceFactoryOptions = {},
): [LedgerDeviceFactory, MockCalls] {
  const calls: MockCalls = {
    getAddress: { totalCalls: 0, args: [] },
    signMessage: { totalCalls: 0, args: [] },
    signTypedData: { totalCalls: 0, args: [] },
    signTransaction: { totalCalls: 0, args: [] },
  };

  const { state, connectionErrors = [], connectDelayMs } = options;

  let connectCallCount = 0;

  const factory: LedgerDeviceFactory = async () => {
    connectCallCount++;

    if (connectDelayMs !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, connectDelayMs));
    }

    if (state !== undefined) {
      state.connectCount++;
    }

    const connectionError = connectionErrors[connectCallCount - 1];

    if (connectionError !== undefined) {
      throw connectionError instanceof Error
        ? connectionError
        : new LedgerDeviceError(connectionError);
    }

    return getLedgerDeviceMockInstance(methodsConfig, calls, state);
  };

  return [factory, calls];
}

function getLedgerDeviceMockInstance(
  methodsConfig: MethodsConfig,
  calls: MockCalls,
  state: DeviceFactoryState | undefined,
): LedgerDevice {
  const onCancel = (): void => {
    if (state !== undefined) {
      state.cancelCount++;
    }
  };

  const signer: LedgerSigner = {
    getAddress: (devicePath) => {
      const config = methodsConfig.getAddress;

      assertHardhatInvariant(
        config !== undefined,
        "getAddress should be defined",
      );

      const searchedPath = assertDevicePath(devicePath);

      const error = recordCall(calls, "getAddress", searchedPath, config);

      if (error !== undefined) {
        return errorAction(error);
      }

      return completedAction(
        config.result(searchedPath),
        config.delayMs,
        onCancel,
      );
    },

    signMessage: (devicePath, message) => {
      const config = methodsConfig.signMessage;

      assertHardhatInvariant(
        config !== undefined,
        "signMessage should be defined",
      );

      const derivationPath = assertDevicePath(devicePath);

      const error = recordCall(
        calls,
        "signMessage",
        { path: derivationPath, message },
        config,
      );

      if (error !== undefined) {
        return errorAction(error);
      }

      if (config.expectedParams !== undefined) {
        assert.equal(derivationPath, config.expectedParams.path);
        assert.equal(toHexString(message), config.expectedParams.data);
      }

      return completedAction(config.result, config.delayMs, onCancel);
    },

    signTypedData: (devicePath, typedData) => {
      const config = methodsConfig.signTypedData;

      assertHardhatInvariant(
        config !== undefined,
        "signTypedData should be defined",
      );

      const derivationPath = assertDevicePath(devicePath);

      const error = recordCall(
        calls,
        "signTypedData",
        { path: derivationPath, typedData },
        config,
      );

      if (error !== undefined) {
        return errorAction(error);
      }

      if (config.expectedParams !== undefined) {
        assert.equal(derivationPath, config.expectedParams.path);
        assert.deepEqual(typedData, config.expectedParams.typedData);
      }

      return completedAction(config.result, config.delayMs, onCancel);
    },

    signTransaction: (devicePath, transaction) => {
      const config = methodsConfig.signTransaction;

      assertHardhatInvariant(
        config !== undefined,
        "signTransaction should be defined",
      );

      const derivationPath = assertDevicePath(devicePath);

      const rawTxHex = toHexString(transaction);

      const error = recordCall(
        calls,
        "signTransaction",
        { path: derivationPath, rawTxHex },
        config,
      );

      if (error !== undefined) {
        return errorAction(error);
      }

      if (config.expectedParams !== undefined) {
        assert.equal(derivationPath, config.expectedParams.path);
        assert.equal(rawTxHex, config.expectedParams.rawTxHex);
      }

      return completedAction(config.result, config.delayMs, onCancel);
    },
  };

  return {
    signer,
    close: async () => {
      if (state !== undefined) {
        state.closeCount++;
      }
    },
  };
}

/** Logs the call and returns the error it should fail with, if any. */
function recordCall(
  calls: MockCalls,
  method: keyof MockCalls,
  args: unknown,
  config: MethodConfig,
): DmkError | undefined {
  const callState = calls[method];

  callState.totalCalls++;
  callState.args.push(args);

  const errorToThrow = config.errorsToThrow?.[callState.totalCalls - 1];

  if (errorToThrow !== undefined) {
    throw errorToThrow;
  }

  return config.errorSequenceToEmit?.[callState.totalCalls - 1];
}

function completedAction<Output>(
  output: Output,
  delayMs?: number,
  onCancel?: () => void,
): DeviceAction<Output> {
  if (delayMs === undefined) {
    return {
      observable: of({
        status: DeviceActionStatus.Completed,
        output,
      } as const),
      cancel: () => onCancel?.(),
    };
  }

  let subscriber:
    Subscriber<ObservedValueOf<DeviceAction<Output>["observable"]>> | undefined;
  let timer: NodeJS.Timeout | undefined;

  const observable: DeviceAction<Output>["observable"] = new Observable(
    (actionSubscriber) => {
      subscriber = actionSubscriber;

      actionSubscriber.next({
        status: DeviceActionStatus.Pending,
        intermediateValue: { requiredUserInteraction: "sign-personal-message" },
      });

      timer = setTimeout(() => {
        actionSubscriber.next({ status: DeviceActionStatus.Completed, output });
        actionSubscriber.complete();
      }, delayMs);

      return () => {
        clearTimeout(timer);
      };
    },
  );

  return {
    observable,
    // The real DMK also reports cancelled actions as `Stopped`.
    cancel: () => {
      onCancel?.();
      clearTimeout(timer);
      subscriber?.next({ status: DeviceActionStatus.Stopped });
      subscriber?.complete();
    },
  };
}

function errorAction<Output>(error: DmkError): DeviceAction<Output> {
  /* eslint-disable @typescript-eslint/consistent-type-assertions -- an error
  state carries no output, but the observable's type still mentions one. */
  const observable = of({
    status: DeviceActionStatus.Error,
    error,
  }) as DeviceAction<Output>["observable"];
  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  return {
    observable,
    cancel: () => {},
  };
}

/**
 * Checks the DMK path and restores the `m/` prefix used by the tests.
 */
function assertDevicePath(derivationPath: string): string {
  assert.ok(
    !derivationPath.startsWith("m/"),
    `The derivation path "${derivationPath}" reached the device with its "m/" prefix, which the Device Management Kit rejects`,
  );

  return `m/${derivationPath}`;
}

function toHexString(value: string | Uint8Array): string {
  return typeof value === "string" ? value : bytesToHexString(value);
}
