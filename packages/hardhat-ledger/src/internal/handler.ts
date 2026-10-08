import type { Signature, TypedData } from "./dmk-imports.js";
import type { DeviceAction } from "./run-device-action.js";
import type {
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
  toLedgerError,
} from "./dmk-errors.js";
import { getYParity } from "./get-y-parity.js";
import { PLUGIN_NAME } from "./plugin-name.js";
import { getRequestParams } from "./rpc-helpers.js";
import { runDeviceAction } from "./run-device-action.js";
import { toTypedData } from "./typed-data.js";

const log = createDebug("hardhat:ledger:handler");

// micro-eth-signer is known to be slow to load, so we lazy load it
let microEthSigner: typeof MicroEthSignerT | undefined;
let microEthSignerTypedData: typeof MicroEthSignerTypedDataT | undefined;
let microEthSignerUtils: typeof MicroEthSignerUtilsT | undefined;

interface RetryState {
  reconnection: number;
  deviceNotReady: number;
}

export class LedgerHandler {
  public static readonly MAX_DERIVATION_ACCOUNTS = 20;
  public static readonly DEFAULT_TIMEOUT = 3000;
  /* Allows slow USB stacks, to rediscover a device while it re-enumerates. */
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
  /** Lets `close()` cancel retry timers that would keep the process alive. */
  readonly #retryWaits = new Set<() => void>();
  /**
   * Lets `close()` cancel DMK actions, which keep running after their session
   * closes.
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
      // Test overrides.
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
   * Opens a device session and loads the derivation-path cache. Calls are
   * serialized to prevent concurrent requests from opening duplicate sessions.
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
      // `close()` ran while the session was opening. Release the session and
      // the shared DMK now that opening has finished.
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
   * @param reconnecting Whether a connected device disappeared mid-request.
   * Re-enumeration gets a longer timeout and no initial setup prompt.
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

      // Stop retrying after `close()`; this loop can otherwise run for 30 minutes.
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

        // Do not rebuild the transport if `close()` ran during the wait.
        if (!this.#closed) {
          return await this.#connect(retryAttempts + 1, reconnecting);
        }
      }

      // Discovery creates the transport even if no session opens. Release it
      // before reporting the connection failure.
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
          // Path lookup does not need on-device address confirmation.
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

      // Without the `#closed` check, skipped waits would make retries spin.
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
   * Waits for the retry delay or until the handler closes. The timer must be
   * clearable so it does not keep the process alive.
   */
  async #waitBeforeRetry(seconds: number): Promise<void> {
    // Retry messages are async, so check again immediately before adding the
    // timer that `close()` cancels.
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
   * Runs a device action on the connected signer. The callback must use the
   * converted `devicePath` argument.
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
      // Another request may be reconnecting. `init()` waits for its session.
      await this.init();
    }

    const device = this.#device;

    // The connection closed or another request replaced the session after init.
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

    let deviceAction: DeviceAction<Output>;

    try {
      deviceAction = action(
        device.signer,
        toDeviceDerivationPath(derivationPath),
      );
    } catch (thrown) {
      // The signer may throw a plain object when its session has disappeared.
      const error = toLedgerError(thrown);

      throw error;
    }

    // Let `close()` cancel the action.
    const cancel = (): void => deviceAction.cancel();

    this.#runningActions.add(cancel);

    try {
      return await runDeviceAction(deviceAction, this.#displayMessage);
    } catch (error) {
      ensureError(error);

      // Report the closed connection instead of retrying its cancelled action.
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
   * Cancels retries and actions, then releases the session and shared DMK.
   * Scripts must call `connection.close()` so USB resources do not keep the
   * process alive.
   */
  public async close(): Promise<void> {
    this.#closed = true;

    // Wake retries so they can observe `#closed`.
    for (const endWait of this.#retryWaits) {
      endWait();
    }

    // The DMK does not cancel actions when their session closes.
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

  /** Replaces a lost session under the same lock used by `init()`. */
  async #reconnect(): Promise<void> {
    await this.#displayMessage("Reconnecting to Ledger...");
    await this.#delayBeforeRetry(LedgerHandler.RECONNECTION_DELAY_SECONDS);
    await this.#resetConnection();
    await this.#initializationMutex.exclusiveRun(
      async () => await this.#initExclusive(0, true),
    );
  }

  /** Closes the current session so the next `init()` opens a new one. */
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

      // Without the `#closed` check, skipped waits would make retries spin.
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

  async #toRpcSig(sig: Signature): Promise<string> {
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

    // The DMK handles EIP-712 hashing and its fallback internally.
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
   * Verifies that the device signed the exact typed data requested. Recovering
   * the address from the original data catches DMK encoding mismatches.
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
        -- The DMK type cannot express micro-eth-signer's linked field types. */
        typedData as any,
        bytesToHexString(address),
      );
    } catch (error) {
      ensureError(error);

      // Treat data our verifier cannot hash exactly as invalid.
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
