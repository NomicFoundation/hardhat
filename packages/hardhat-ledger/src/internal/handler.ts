import type { TypedData } from "./dmk-imports.js";
import type { DeviceAction } from "./run-device-action.js";
import type {
  DeviceSignature,
  LedgerDevice,
  LedgerDeviceFactory,
  LedgerOptions,
  Paths,
} from "./types.js";
import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "hardhat/types/providers";
import type * as MicroEthSignerT from "micro-eth-signer";
import type * as MicroEthSignerTypedDataT from "micro-eth-signer/typed-data";
import type * as MicroEthSignerUtilsT from "micro-eth-signer/utils";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { isAddress } from "@nomicfoundation/hardhat-utils/eth";
import {
  bytesToHexString,
  hexStringToBigInt,
  hexStringToBytes,
} from "@nomicfoundation/hardhat-utils/hex";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";
import {
  rpcAddress,
  rpcAny,
  rpcData,
  rpcTransactionRequest,
  validateParams,
} from "@nomicfoundation/hardhat-zod-utils/rpc";

import * as cache from "./cache.js";
import { closeDeviceManagementKit, connectDevice } from "./connect-device.js";
import { createTx } from "./create-tx.js";
import { toDeviceDerivationPath } from "./derivation-path.js";
import {
  getErrorTag,
  isDeviceLockedError,
  isDeviceNotConnectedError,
  isDeviceNotReadyError,
  isReconnectableError,
  LedgerConnectionClosedError,
  LedgerSessionLostError,
} from "./dmk-errors.js";
import { getYParity } from "./get-y-parity.js";
import { PLUGIN_NAME } from "./plugin-name.js";
import { getRequestParams } from "./rpc-helpers.js";
import { runDeviceAction } from "./run-device-action.js";
import { toTypedData } from "./typed-data.js";

const log = createDebug("hardhat:ledger:handler");

// micro-eth-signer is known to be slow to load, so we lazy load it
let microEthSigner: typeof MicroEthSignerT | undefined;
let microEthSignerUtils: typeof MicroEthSignerUtilsT | undefined;
let microEthSignerTypedData: typeof MicroEthSignerTypedDataT | undefined;

interface RetryState {
  reconnection: number;
  deviceNotReady: number;
}

export class LedgerHandler {
  public static readonly MAX_DERIVATION_ACCOUNTS = 20;
  public static readonly DEFAULT_TIMEOUT = 3000;
  /**
   * How long to look for the device after its session was lost. The device is
   * usually re-enumerating, e.g. after opening the Ethereum app, and the Device
   * Management Kit waits 6 seconds for it before giving up. A slower USB stack
   * takes longer than that: WSL, through usbipd, takes about 8 seconds.
   */
  public static readonly RECONNECTION_TIMEOUT = 10_000;
  public static readonly MAX_RECONNECTION_ATTEMPTS = 2;
  public static readonly RECONNECTION_DELAY_SECONDS = 0.5;
  public static readonly DEVICE_NOT_READY_RETRY_DELAY_SECONDS = 30;
  public static readonly MAX_DEVICE_NOT_READY_RETRIES = 60;

  readonly #provider: EthereumProvider;
  readonly #displayMessage: (message: string) => Promise<void>;
  readonly #deviceFactory: LedgerDeviceFactory;
  readonly #cachePath: string | undefined;
  readonly #delayBeforeRetry: (seconds: number) => Promise<void>;
  readonly #maxDeviceNotReadyRetries: number;
  readonly #initializationMutex = new AsyncMutex();
  /**
   * Ends the retry waits currently in flight. Their timers are referenced, so
   * without this `close()` resolves and the process still waits out the
   * remaining delay, which is half a minute.
   */
  readonly #retryWaits = new Set<() => void>();
  /**
   * Cancels the device actions currently running. The Device Management Kit
   * leaves a running action alone when its session is closed, so `close()` has
   * to stop it itself, or the request that started it outlives the connection.
   */
  readonly #runningActions = new Set<() => void>();

  #device: LedgerDevice | undefined;
  #chainId: bigint | undefined;
  #closed: boolean = false;

  public readonly options: LedgerOptions;
  public isOutputEnabled: boolean = true;
  public paths: Paths = {};

  constructor(
    provider: EthereumProvider,
    options: LedgerOptions,
    displayMessage: (interruptor: string, message: string) => Promise<void>,
    customConfig?: {
      // Allows passing a custom config, primarily used for testing
      deviceFactory?: LedgerDeviceFactory;
      cachePath?: string;
      delayBeforeRetry?: (seconds: number) => Promise<void>;
      maxDeviceNotReadyRetries?: number;
    },
  ) {
    this.#deviceFactory = customConfig?.deviceFactory ?? connectDevice;
    this.#cachePath = customConfig?.cachePath;
    this.#delayBeforeRetry =
      customConfig?.delayBeforeRetry ??
      (async (seconds) => await this.#waitBeforeRetry(seconds));
    this.#maxDeviceNotReadyRetries =
      customConfig?.maxDeviceNotReadyRetries ??
      LedgerHandler.MAX_DEVICE_NOT_READY_RETRIES;

    this.#provider = provider;
    this.#displayMessage = async (message: string): Promise<void> => {
      await displayMessage(PLUGIN_NAME, message);
    };

    this.options = options;

    this.options.accounts = options.accounts.map((address) => {
      if (!isAddress(address)) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.INVALID_LEDGER_ADDRESS,
          {
            address,
          },
        );
      }

      return address.toLowerCase();
    });
  }

  public getLedgerAccounts(): string[] {
    return [...this.options.accounts];
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    const params = getRequestParams(jsonRpcRequest);

    if (this.#methodRequiresSignature(jsonRpcRequest.method)) {
      let result;

      try {
        if (jsonRpcRequest.method === "eth_sign") {
          result = await this.#ethSign(params);
        }

        if (jsonRpcRequest.method === "personal_sign") {
          result = await this.#personalSign(params);
        }

        if (jsonRpcRequest.method === "eth_signTypedData_v4") {
          result = await this.#ethSignTypedDataV4(params);
        }

        if (
          jsonRpcRequest.method === "eth_sendTransaction" &&
          params.length > 0
        ) {
          const { method, params: paramsToReplace } =
            await this.#ethSendTransaction(params);

          // Return a modified request
          return {
            ...jsonRpcRequest,
            method,
            params: paramsToReplace,
          };
        }

        // Return a response
        return {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          result,
        };
      } catch (error) {
        // If the address is not controlled by the user, no error is thrown, and
        // the original request is returned. All other errors are propagated.
        if (
          (HardhatError.isHardhatError(error) &&
            error.number ===
              HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.UNOWNED_LEDGER_ADDRESS
                .number) === false
        ) {
          throw error;
        }
      }
    }

    // No interception required, return the original request as is
    return jsonRpcRequest;
  }

  #methodRequiresSignature(method: string): boolean {
    return [
      "eth_sendTransaction",
      "eth_sign",
      "eth_signTypedData_v4",
      "personal_sign",
    ].includes(method);
  }

  async #ethSign(params: unknown[]): Promise<unknown> {
    if (params.length > 0) {
      const [address, data] = validateParams(params, rpcAddress, rpcData);

      await this.#requireControlledInit(address);

      if (address !== undefined) {
        if (data === undefined) {
          throw new HardhatError(
            HardhatError.ERRORS.CORE.NETWORK.ETHSIGN_MISSING_DATA_PARAM,
          );
        }

        const path = await this.#derivePath(address);

        const signature = await this.#withConfirmation(
          async () =>
            await this.#runOnDevice(path, (signer, devicePath) =>
              signer.signMessage(devicePath, data),
            ),
        );

        return await this.#toRpcSig(signature);
      }
    }
  }

  async #requireControlledInit(
    address: Uint8Array<ArrayBufferLike>,
  ): Promise<void> {
    this.#requireControlledAddress(address);

    await this.init();
  }

  #requireControlledAddress(address: Uint8Array<ArrayBufferLike>): void {
    const hexAddress = bytesToHexString(address).toLowerCase();

    const isControlledAddress = this.options.accounts.includes(hexAddress);

    if (!isControlledAddress) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.UNOWNED_LEDGER_ADDRESS,
        {
          address: hexAddress,
        },
      );
    }
  }

  /**
   * Opens a device session, if there isn't one already, and loads the
   * derivation-path cache.
   *
   * Serialized, because opening a session is a check-then-assign across awaits:
   * two concurrent requests would otherwise open two sessions and leak one, and
   * a leaked session keeps the Device Management Kit, and the process, alive.
   */
  public async init(retryAttempts: number = 0): Promise<void> {
    await this.#initializationMutex.exclusiveRun(
      async () => await this.#initExclusive(retryAttempts),
    );
  }

  async #initExclusive(
    retryAttempts: number,
    reconnecting: boolean = false,
  ): Promise<void> {
    if (this.#device === undefined && !this.#closed) {
      await this.#connect(retryAttempts, reconnecting);
    }

    if (this.#closed) {
      // `close()` ran before or during the connection. A session opened now
      // would outlive the network connection that owns this handler, and
      // `close()` is refused the kit while one is still being opened, so
      // whoever gets here last has to release both.
      await this.#resetConnection();

      closeDeviceManagementKit();

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        { error: new LedgerConnectionClosedError(), transportId: "" },
      );
    }

    try {
      const paths = await cache.read(this.#cachePath);

      if (paths !== undefined) {
        this.paths = { ...paths };
      }
    } catch (_error) {}
  }

  /**
   * @param reconnecting Whether the device was connected until it went away
   * mid-request. It usually comes back by itself, so it gets longer to do so,
   * and asking the user to plug it in or to enter the PIN would be misleading.
   */
  async #connect(retryAttempts: number, reconnecting: boolean): Promise<void> {
    try {
      await this.#displayMessage("Connecting to Ledger...");

      this.#device = await this.#deviceFactory(
        reconnecting
          ? LedgerHandler.RECONNECTION_TIMEOUT
          : LedgerHandler.DEFAULT_TIMEOUT,
      );

      await this.#displayMessage("Connection successful");
    } catch (error) {
      ensureError(error);

      // Retry if device not connected and we have retries left, but not once
      // the connection is gone: this loop runs for half an hour, and it would
      // keep the process alive and keep prompting long after `close()`.
      if (
        isDeviceNotConnectedError(error) &&
        retryAttempts < this.#maxDeviceNotReadyRetries &&
        !this.#closed
      ) {
        log("Device not connected error during init, waiting for user");
        log(error);

        const delay = LedgerHandler.DEVICE_NOT_READY_RETRY_DELAY_SECONDS;
        await this.#displayMessage(
          reconnecting
            ? `Device did not reconnect. Please check that your Ledger is plugged in and unlocked. Retrying in ${delay} seconds...`
            : `Device not connected or PIN not entered. Please plug in your Ledger and enter the PIN. Retrying in ${delay} seconds...`,
        );
        await this.#delayBeforeRetry(delay);

        // `close()` typically lands inside that wait, and another attempt would
        // rebuild the kit and its USB listeners for a connection that is gone.
        if (!this.#closed) {
          return await this.#connect(retryAttempts + 1, reconnecting);
        }
      }

      // Give up - either not a retryable error or exhausted retries

      // This connection never opened a session, but the Device Management Kit
      // built its Node HID transport while looking for a device, and that alone
      // keeps the process alive. This is the most common failure there is,
      // since it covers "no Ledger plugged in". Another connection's session
      // still wins: the kit refuses to close while one is in use.
      closeDeviceManagementKit();

      await this.#displayMessage("Connection error");

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        { error, transportId: getErrorTag(error) },
      );
    }
  }

  async #derivePath(
    addressToFindAsBuffer: Uint8Array<ArrayBufferLike>,
    retryState: RetryState = { reconnection: 0, deviceNotReady: 0 },
  ): Promise<string> {
    const addressToFind = bytesToHexString(addressToFindAsBuffer).toLowerCase();

    if (this.paths[addressToFind] !== undefined) {
      return this.paths[addressToFind];
    }

    await this.#displayMessage("Derivation started");

    let path = "<unset-path>";
    try {
      for (
        let accountI = 0;
        accountI <= LedgerHandler.MAX_DERIVATION_ACCOUNTS;
        accountI++
      ) {
        path = this.#getDerivationPath(accountI);

        await this.#displayMessage(
          `Derivation progress. Path: ${path}, account index: ${accountI}`,
        );

        const wallet = await this.#runOnDevice(path, (signer, devicePath) =>
          // The address is only used to find the right derivation path, so it
          // must not ask the user to confirm it on the device.
          signer.getAddress(devicePath, { checkOnDevice: false }),
        );
        const address = wallet.address.toLowerCase();

        if (address === addressToFind) {
          await this.#displayMessage("Derivation success");

          this.paths[addressToFind] = path;

          await cache.write(this.paths, this.#cachePath);

          return path;
        }
      }
    } catch (error) {
      ensureError(error);

      // Check if we should attempt reconnection
      if (
        isReconnectableError(error) &&
        retryState.reconnection < LedgerHandler.MAX_RECONNECTION_ATTEMPTS
      ) {
        log("Reconnectable error during path derivation, attempting reconnect");
        log(error);

        await this.#reconnect();

        return await this.#derivePath(addressToFindAsBuffer, {
          ...retryState,
          reconnection: retryState.reconnection + 1,
        });
      }

      // Retry if device not ready and we have retries left, but not once the
      // connection is gone: the wait is skipped then, so the loop would spin
      // through its whole budget against a device nobody is watching.
      if (
        isDeviceNotReadyError(error) &&
        retryState.deviceNotReady < this.#maxDeviceNotReadyRetries &&
        !this.#closed
      ) {
        log("Device not ready error during path derivation, waiting for user");
        log(error);

        await this.#displayMessage(this.#getDeviceNotReadyMessage(error));
        await this.#delayBeforeRetry(
          LedgerHandler.DEVICE_NOT_READY_RETRY_DELAY_SECONDS,
        );

        return await this.#derivePath(addressToFindAsBuffer, {
          ...retryState,
          deviceNotReady: retryState.deviceNotReady + 1,
        });
      }

      // Give up - either exhausted retries or other error
      await this.#displayMessage("Derivation failure");

      if (isDeviceNotReadyError(error)) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.LOCKED_DEVICE,
          error,
        );
      }

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ERROR_WHILE_DERIVING_PATH,
        { path, message: error.message },
        error,
      );
    }

    await this.#displayMessage("Derivation failure");

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
        .CANNOT_FIND_VALID_DERIVATION_PATH,
      {
        address: addressToFind,
        pathStart: this.#getDerivationPath(0),
        pathEnd: this.#getDerivationPath(LedgerHandler.MAX_DERIVATION_ACCOUNTS),
      },
    );
  }

  #getDerivationPath(index: number): string {
    if (this.options.derivationFunction === undefined) {
      return `m/44'/60'/${index}'/0/0`;
    } else {
      return this.options.derivationFunction(index);
    }
  }

  /**
   * Waits before retrying, or until the handler is closed.
   *
   * `sleep` from `hardhat-utils` would do, but its timer cannot be cleared, and
   * a pending one keeps the process alive after the connection is gone.
   */
  async #waitBeforeRetry(seconds: number): Promise<void> {
    // Checked here rather than only at the call sites: each of them displays a
    // message first, and `close()` lands inside that await often enough. From
    // here to the registration below is synchronous, so there is no window
    // left in which a wait can be armed and then missed by `close()`.
    if (this.#closed) {
      return;
    }

    let endWait: (() => void) | undefined;

    try {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, seconds * 1000);

        endWait = () => {
          clearTimeout(timer);
          resolve();
        };

        this.#retryWaits.add(endWait);
      });
    } finally {
      if (endWait !== undefined) {
        this.#retryWaits.delete(endWait);
      }
    }
  }

  #getDeviceNotReadyMessage(error: Error): string {
    const delay = LedgerHandler.DEVICE_NOT_READY_RETRY_DELAY_SECONDS;

    return isDeviceLockedError(error)
      ? `Device is locked. Please unlock your Ledger. Retrying in ${delay} seconds...`
      : `Device not ready. Please check your Ledger. Retrying in ${delay} seconds...`;
  }

  /**
   * Runs a device action on the connected signer, reporting what the device is
   * waiting for as it goes.
   *
   * Every call into the Device Management Kit goes through here, so this is
   * also where derivation paths are converted to the form the DMK accepts: the
   * `action` callback is handed the converted path and must use it rather than
   * the one it closed over.
   *
   * @param derivationPath The path to sign with, in the `m/...` form used
   * everywhere else in the handler.
   * @param action Builds the device action from the signer and the converted
   * path.
   */
  async #runOnDevice<Output>(
    derivationPath: string,
    action: (
      signer: LedgerDevice["signer"],
      devicePath: string,
    ) => DeviceAction<Output>,
  ): Promise<Output> {
    if (this.#device === undefined) {
      // A concurrent request on this connection can be reconnecting after a
      // device error; `init` waits for it and shares the new session.
      await this.init();
    }

    const device = this.#device;

    // `init` either opened a session or threw, so the only way there is none
    // is that it was dropped in between: the connection was closed, or a
    // concurrent request on it reconnected.
    if (device === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
        {
          error: this.#closed
            ? new LedgerConnectionClosedError()
            : new LedgerSessionLostError(),
          transportId: "",
        },
      );
    }

    const deviceAction = action(
      device.signer,
      toDeviceDerivationPath(derivationPath),
    );

    // Registered so that `close()` can stop it.
    const cancel = (): void => deviceAction.cancel();

    this.#runningActions.add(cancel);

    try {
      return await runDeviceAction(deviceAction, this.#displayMessage);
    } catch (error) {
      ensureError(error);

      // The connection was closed while the device was busy with this action:
      // `close()` cancelled it, or the session went away under it. The closed
      // connection is what the caller needs to know about, and it must not
      // trigger a reconnection.
      if (this.#closed) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.CONNECTION_ERROR,
          { error: new LedgerConnectionClosedError(), transportId: "" },
          error,
        );
      }

      throw error;
    } finally {
      this.#runningActions.delete(cancel);
    }
  }

  /**
   * Cancels any device action still running, closes the device session, if
   * any, and releases every process-wide resource the Device Management Kit
   * holds.
   *
   * This must be called when the network connection is closed: the Node HID
   * transport keeps USB hotplug listeners registered, and `node-hid` keeps a
   * read handle on the open device, so a process that does not release them
   * never exits. Nothing else releases them: Hardhat never closes a connection
   * on its own, and the plugin cannot tell when a script is done, which is why
   * scripts must call `connection.close()`.
   */
  public async close(): Promise<void> {
    this.#closed = true;

    // A retry is waiting on a timer that would hold the process open long after
    // this resolves. Ending it lets the retry see `#closed` and give up.
    for (const endWait of this.#retryWaits) {
      endWait();
    }

    // A device action still running would outlive the connection: the Device
    // Management Kit does not stop it when its session is closed. Cancelling
    // ends it in the `Stopped` state, and `#runOnDevice` reports that to the
    // caller as a closed connection.
    for (const cancel of this.#runningActions) {
      try {
        cancel();
      } catch (error) {
        log("Failed to cancel a running device action");
        log(error);
      }
    }

    await this.#resetConnection();

    closeDeviceManagementKit();
  }

  /**
   * Replaces a session the device dropped mid-request with a new one, opened
   * under the same lock as `init` opens one.
   */
  async #reconnect(): Promise<void> {
    await this.#displayMessage("Reconnecting to Ledger...");
    await this.#delayBeforeRetry(LedgerHandler.RECONNECTION_DELAY_SECONDS);
    await this.#resetConnection();
    await this.#initializationMutex.exclusiveRun(
      async () => await this.#initExclusive(0, true),
    );
  }

  /**
   * Resets the Ledger connection by closing the device session and clearing the
   * device instance. This allows the next init() call to create a fresh
   * connection.
   */
  async #resetConnection(): Promise<void> {
    const device = this.#device;

    // Cleared before awaiting, so that nothing picks up a session that is
    // already being closed.
    this.#device = undefined;

    if (device !== undefined) {
      try {
        await device.close();
      } catch (error) {
        log("Failed to close the device session during reset");
        log(error);
      }
    }
  }

  async #withConfirmation<T extends (...args: any) => any>(
    func: T,
    retryState: RetryState = { reconnection: 0, deviceNotReady: 0 },
  ): Promise<ReturnType<T>> {
    try {
      await this.#displayMessage("Confirmation start");

      const result = await func();

      await this.#displayMessage("Confirmation success");

      return result;
    } catch (error) {
      ensureError(error);

      // Check if we should attempt reconnection
      if (
        isReconnectableError(error) &&
        retryState.reconnection < LedgerHandler.MAX_RECONNECTION_ATTEMPTS
      ) {
        log("Reconnectable error during confirmation, attempting reconnect");
        log(error);

        await this.#reconnect();

        return await this.#withConfirmation(func, {
          ...retryState,
          reconnection: retryState.reconnection + 1,
        });
      }

      // Retry if device not ready and we have retries left, but not once the
      // connection is gone: the wait is skipped then, so the loop would spin
      // through its whole budget against a device nobody is watching.
      if (
        isDeviceNotReadyError(error) &&
        retryState.deviceNotReady < this.#maxDeviceNotReadyRetries &&
        !this.#closed
      ) {
        log("Device not ready error during confirmation, waiting for user");
        log(error);

        await this.#displayMessage(this.#getDeviceNotReadyMessage(error));
        await this.#delayBeforeRetry(
          LedgerHandler.DEVICE_NOT_READY_RETRY_DELAY_SECONDS,
        );

        return await this.#withConfirmation(func, {
          ...retryState,
          deviceNotReady: retryState.deviceNotReady + 1,
        });
      }

      // Give up - either exhausted retries or other error
      await this.#displayMessage("Confirmation failure");

      if (isDeviceNotReadyError(error)) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.LOCKED_DEVICE,
          error,
        );
      }

      throw error;
    }
  }

  async #toRpcSig(sig: DeviceSignature): Promise<string> {
    if (microEthSignerUtils === undefined) {
      microEthSignerUtils = await import("micro-eth-signer/utils");
    }

    const recovery = this.#calculateSigRecovery(sig.v - 27);

    assertHardhatInvariant(
      recovery === 0 || recovery === 1,
      `Invalid recovery value: ${recovery}. It should be either 0 or 1.`,
    );

    const nobleSig = microEthSignerUtils.initSig(
      { r: toBigInt(sig.r), s: toBigInt(sig.s) },
      recovery,
    );

    const hex64 = nobleSig.toCompactHex();
    const vByte = recovery === 0 ? "1b" : "1c";

    return microEthSignerUtils.add0x(hex64 + vByte);
  }

  #calculateSigRecovery(v: number): number {
    if (v === 0 || v === 1) {
      return v;
    }

    return v - 27;
  }

  async #personalSign(params: any[]): Promise<unknown> {
    if (params.length > 0) {
      const [data, address] = validateParams(params, rpcData, rpcAddress);

      await this.#requireControlledInit(address);

      if (data !== undefined) {
        if (address === undefined) {
          throw new HardhatError(
            HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
              .PERSONAL_SIGN_MISSING_ADDRESS_PARAM,
          );
        }

        const path = await this.#derivePath(address);

        const signature = await this.#withConfirmation(
          async () =>
            await this.#runOnDevice(path, (signer, devicePath) =>
              signer.signMessage(devicePath, data),
            ),
        );

        return await this.#toRpcSig(signature);
      }
    }
  }

  async #ethSignTypedDataV4(params: any[]): Promise<unknown> {
    const [address, data] = validateParams(params, rpcAddress, rpcAny);

    await this.#requireControlledInit(address);

    if (data === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL.ETH_SIGN_MISSING_DATA_PARAM,
      );
    }

    // The signer takes the typed data as-is: it does the EIP-712 hashing and
    // the clear-signing lookups itself, and falls back to signing the hashed
    // message on its own, so we no longer need our own fallback.
    const typedData = toTypedData(data);

    const path = await this.#derivePath(address);

    const signature = await this.#withConfirmation(
      async () =>
        await this.#runOnDevice(path, (signer, devicePath) =>
          signer.signTypedData(devicePath, typedData),
        ),
    );

    const rpcSignature = await this.#toRpcSig(signature);

    await this.#assertSignedAsRequested(rpcSignature, typedData, address);

    return rpcSignature;
  }

  /**
   * Checks that the signature is over the typed data the caller sent.
   *
   * The signer kit encodes the typed data for the device itself, and falls
   * back to hashing it with ethers when the device cannot take it. Both
   * mis-encode some inputs, such as a field name made of digits only or a
   * `__proto__` key, and the device then signs a different message with nothing
   * reporting it. Recovering the signer from the caller's own data catches
   * every such case, known or not: a signature over anything else recovers to
   * another address.
   */
  async #assertSignedAsRequested(
    rpcSignature: string,
    typedData: TypedData,
    address: Uint8Array,
  ): Promise<void> {
    if (microEthSignerTypedData === undefined) {
      microEthSignerTypedData = await import("micro-eth-signer/typed-data");
    }

    let signedAsRequested: boolean;

    try {
      signedAsRequested = microEthSignerTypedData.verifyTyped(
        rpcSignature,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- micro-eth-signer types the message and domain against the literal
        `types`, which the signer kit's `TypedData` cannot express. */
        typedData as any,
        bytesToHexString(address),
      );
    } catch (error) {
      ensureError(error);

      // Our own hasher refuses what it cannot hash faithfully either, such as
      // a duplicate field name or a `bytes32` of the wrong length.
      log(`The typed data could not be hashed: ${error.message}`);

      signedAsRequested = false;
    }

    if (!signedAsRequested) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_LEDGER.GENERAL
          .ETH_SIGN_TYPED_DATA_V4_INVALID_DATA_PARAM,
      );
    }
  }

  async #ethSendTransaction(params: any[]): Promise<{
    method: string;
    params: string[];
  }> {
    const [txRequest] = validateParams(params, rpcTransactionRequest);

    await this.#requireControlledInit(txRequest.from);

    if (txRequest.gas === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        {
          param: "gas",
        },
      );
    }

    const hasGasPrice = txRequest.gasPrice !== undefined;
    const hasEip1559Fields =
      txRequest.maxFeePerGas !== undefined ||
      txRequest.maxPriorityFeePerGas !== undefined;

    if (!hasGasPrice && !hasEip1559Fields) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_FEE_PRICE_FIELDS,
      );
    }

    if (hasGasPrice && hasEip1559Fields) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INCOMPATIBLE_FEE_PRICE_FIELDS,
      );
    }

    if (hasEip1559Fields && txRequest.maxFeePerGas === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        {
          param: "maxFeePerGas",
        },
      );
    }

    if (hasEip1559Fields && txRequest.maxPriorityFeePerGas === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY,
        {
          param: "maxPriorityFeePerGas",
        },
      );
    }

    const path = await this.#derivePath(txRequest.from);

    if (txRequest.nonce === undefined) {
      txRequest.nonce = await this.#getNonce(txRequest.from);
    }

    if (this.#chainId === undefined) {
      this.#chainId = hexStringToBigInt(
        await this.#provider.request({
          method: "eth_chainId",
        }),
      );
    }

    assertHardhatInvariant(
      this.#chainId !== undefined,
      "chainId should be defined",
    );

    if (microEthSigner === undefined) {
      microEthSigner = await import("micro-eth-signer");
    }

    const unsignedTx = await createTx(txRequest, this.#chainId);

    const txToSign = hexStringToBytes(unsignedTx.toHex(false));

    const signature = await this.#withConfirmation(
      async () =>
        await this.#runOnDevice(path, (signer, devicePath) =>
          signer.signTransaction(devicePath, txToSign),
        ),
    );

    const signedTx = new microEthSigner.Transaction(unsignedTx.type, {
      ...unsignedTx.raw,
      r: toBigInt(signature.r),
      s: toBigInt(signature.s),
      yParity: getYParity(signature.v),
    }).toHex();

    return {
      method: "eth_sendRawTransaction",
      params: [signedTx],
    };
  }

  async #getNonce(address: Uint8Array<ArrayBufferLike>): Promise<bigint> {
    const nonce = await this.#provider.request({
      method: "eth_getTransactionCount",
      params: [bytesToHexString(address), "pending"],
    });

    return hexStringToBigInt(nonce);
  }
}
