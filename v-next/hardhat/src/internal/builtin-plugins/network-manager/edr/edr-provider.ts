import type { SolidityStackTrace } from "./stack-traces/solidity-stack-trace.js";
import type { LoggerConfig } from "./types/logger.js";
import type { TracingConfig } from "./types/node-types.js";
import type { EdrNetworkConfig } from "../../../../types/config.js";
import type {
  EthereumProvider,
  EthSubscription,
  FailedJsonRpcResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "../../../../types/providers.js";
import type {
  CompilerInput,
  CompilerOutput,
} from "../../../../types/solidity/compiler-io.js";
import type { DefaultHDAccountsConfigParams } from "../accounts/derive-private-keys.js";
import type { JsonRpcRequestWrapperFunction } from "../network-manager.js";
import type {
  RawTrace,
  SubscriptionEvent,
  Response,
  VmTraceDecoder,
  VMTracer as VMTracerT,
  Provider,
  DebugTraceResult,
  ProviderConfig,
} from "@ignored/edr-optimism";

import EventEmitter from "node:events";
import util from "node:util";

import {
  EdrContext,
  createModelsAndDecodeBytecodes,
  initializeVmTraceDecoder,
  SolidityTracer,
  VmTracer,
  GENERIC_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
  genericChainProviderFactory,
  optimismProviderFactory,
} from "@ignored/edr-optimism";
import { toSeconds } from "@ignored/hardhat-vnext-utils/date";
import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import chalk from "chalk";
import debug from "debug";

import {
  HARDHAT_NETWORK_RESET_EVENT,
  HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT,
} from "../../../constants.js";
import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "../accounts/derive-private-keys.js";
import { getJsonRpcRequest, isFailedJsonRpcResponse } from "../json-rpc.js";

import {
  InvalidArgumentsError,
  InvalidInputError,
  ProviderError,
} from "./errors.js";
import { encodeSolidityStackTrace } from "./stack-traces/stack-trace-solidity-errors.js";
import { createVmTraceDecoder } from "./stack-traces/stack-traces.js";
import { clientVersion } from "./utils/client-version.js";
import { ConsoleLogger } from "./utils/console-logger.js";
import {
  edrRpcDebugTraceToHardhat,
  hardhatMiningIntervalToEdrMiningInterval,
  hardhatMempoolOrderToEdrMineOrdering,
  hardhatHardforkToEdrSpecId,
  hardhatAccountsToEdrGenesisAccounts,
  hardhatChainsToEdrChains,
  hardhatForkingConfigToEdrForkConfig,
} from "./utils/convert-to-edr.js";
import { printLine, replaceLastLine } from "./utils/logger.js";

const log = debug("hardhat:core:hardhat-network:provider");

export const EDR_NETWORK_DEFAULT_COINBASE =
  "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e";

interface EdrNetworkDefaultHDAccountsConfigParams
  extends DefaultHDAccountsConfigParams {
  mnemonic: string;
  accountsBalance: bigint;
}

export const EDR_NETWORK_MNEMONIC =
  "test test test test test test test test test test test junk";
export const DEFAULT_EDR_NETWORK_BALANCE = 10000000000000000000000n;
export const DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS: EdrNetworkDefaultHDAccountsConfigParams =
  {
    ...DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS,
    mnemonic: EDR_NETWORK_MNEMONIC,
    accountsBalance: DEFAULT_EDR_NETWORK_BALANCE,
  };

// Lazy initialize the global EDR context.
let _globalEdrContext: EdrContext | undefined;
export async function getGlobalEdrContext(): Promise<EdrContext> {
  if (_globalEdrContext === undefined) {
    // Only one is allowed to exist
    _globalEdrContext = new EdrContext();
    await _globalEdrContext.registerProviderFactory(
      GENERIC_CHAIN_TYPE,
      genericChainProviderFactory(),
    );
    await _globalEdrContext.registerProviderFactory(
      OPTIMISM_CHAIN_TYPE,
      optimismProviderFactory(),
    );
  }

  return _globalEdrContext;
}

interface EdrProviderConfig {
  networkConfig: EdrNetworkConfig;
  loggerConfig?: LoggerConfig;
  tracingConfig?: TracingConfig;
  jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;
}

export class EdrProvider extends EventEmitter implements EthereumProvider {
  readonly #provider: Provider;
  readonly #vmTraceDecoder: VmTraceDecoder;
  readonly #jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;

  #failedStackTraces: number = 0;
  /** Used for internal stack trace tests. */
  #vmTracer?: VMTracerT;
  #nextRequestId = 1;

  /**
   * Creates a new instance of `EdrProvider`.
   */
  public static async create({
    networkConfig,
    loggerConfig = { enabled: false },
    tracingConfig = {},
    jsonRpcRequestWrapper,
  }: EdrProviderConfig): Promise<EdrProvider> {
    const printLineFn = loggerConfig.printLineFn ?? printLine;
    const replaceLastLineFn = loggerConfig.replaceLastLineFn ?? replaceLastLine;

    const vmTraceDecoder = await createVmTraceDecoder();

    const providerConfig = await getProviderConfig(networkConfig);

    const context = await getGlobalEdrContext();
    const provider = await context.createProvider(
      networkConfig.chainType === "optimism"
        ? OPTIMISM_CHAIN_TYPE
        : GENERIC_CHAIN_TYPE, // TODO: l1 is missing here
      providerConfig,
      {
        enable: loggerConfig.enabled,
        decodeConsoleLogInputsCallback: ConsoleLogger.getDecodedLogs,
        getContractAndFunctionNameCallback: (
          code: Buffer,
          calldata?: Buffer,
        ) => {
          return vmTraceDecoder.getContractAndFunctionNamesForCall(
            code,
            calldata,
          );
        },
        printLineCallback: (message: string, replace: boolean) => {
          if (replace) {
            replaceLastLineFn(message);
          } else {
            printLineFn(message);
          }
        },
      },
      {
        subscriptionCallback: (event: SubscriptionEvent) => {
          edrProvider.onSubscriptionEvent(event);
        },
      },
    );

    const edrProvider = new EdrProvider(
      provider,
      vmTraceDecoder,
      tracingConfig,
      jsonRpcRequestWrapper,
    );

    return edrProvider;
  }

  /**
   * @private
   *
   * This constructor is intended for internal use only.
   * Use the static method {@link EdrProvider.create} to create an instance of
   * `EdrProvider`.
   */
  private constructor(
    provider: Provider,
    vmTraceDecoder: VmTraceDecoder,
    tracingConfig?: TracingConfig,
    jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction,
  ) {
    super();

    this.#provider = provider;
    this.#vmTraceDecoder = vmTraceDecoder;

    if (tracingConfig !== undefined) {
      initializeVmTraceDecoder(this.#vmTraceDecoder, tracingConfig);
    }

    this.#jsonRpcRequestWrapper = jsonRpcRequestWrapper;
  }

  /**
   * Sets a `VMTracer` that observes EVM throughout requests.
   *
   * Used for internal stack traces integration tests.
   */
  public setVmTracer(vmTracer?: VMTracerT): void {
    this.#vmTracer = vmTracer;
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.params !== undefined && !Array.isArray(args.params)) {
      // eslint-disable-next-line no-restricted-syntax -- TODO: review whether this should be a HH error
      throw new InvalidInputError(
        "Hardhat Network doesn't support JSON-RPC params sent as an object",
      );
    }

    const params = args.params ?? [];

    if (args.method === "hardhat_addCompilationResult") {
      return this.#addCompilationResultAction(
        ...this.#addCompilationResultParams(params),
      );
    } else if (args.method === "hardhat_getStackTraceFailuresCount") {
      return this.#getStackTraceFailuresCountAction(
        ...this.#getStackTraceFailuresCountParams(params),
      );
    }

    const jsonRpcRequest = getJsonRpcRequest(
      this.#nextRequestId++,
      args.method,
      params,
    );

    let jsonRpcResponse: JsonRpcResponse;
    if (this.#jsonRpcRequestWrapper !== undefined) {
      jsonRpcResponse = await this.#jsonRpcRequestWrapper(
        jsonRpcRequest,
        async (request) => {
          const stringifiedArgs = JSON.stringify(request);
          const edrResponse =
            await this.#provider.handleRequest(stringifiedArgs);

          return this.#handleEdrResponse(edrResponse);
        },
      );
    } else {
      const stringifiedArgs = JSON.stringify(jsonRpcRequest);
      const edrResponse = await this.#provider.handleRequest(stringifiedArgs);

      jsonRpcResponse = await this.#handleEdrResponse(edrResponse);
    }

    if (args.method === "hardhat_reset") {
      this.emit(HARDHAT_NETWORK_RESET_EVENT);
    } else if (args.method === "evm_revert") {
      this.emit(HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT);
    }

    // this can only happen if a wrapper doesn't call the default
    // behavior as the default throws on FailedJsonRpcResponse
    if (isFailedJsonRpcResponse(jsonRpcResponse)) {
      const error = new ProviderError(
        jsonRpcResponse.error.message,
        jsonRpcResponse.error.code,
      );
      error.data = jsonRpcResponse.error.data;

      // eslint-disable-next-line no-restricted-syntax -- allow throwing ProviderError
      throw error;
    }

    // Override EDR version string with Hardhat version string with EDR backend,
    // e.g. `HardhatNetwork/2.19.0/@ignored/edr-optimism/0.2.0-dev`
    if (args.method === "web3_clientVersion") {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
      return clientVersion(jsonRpcResponse.result as string);
    } else if (
      args.method === "debug_traceTransaction" ||
      args.method === "debug_traceCall"
    ) {
      return edrRpcDebugTraceToHardhat(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
        jsonRpcResponse.result as DebugTraceResult,
      );
    } else {
      return jsonRpcResponse.result;
    }
  }

  public async close(): Promise<void> {
    // TODO: what needs cleaned up?
  }

  public async send(method: string, params?: unknown[]): Promise<unknown> {
    return this.request({ method, params });
  }

  public sendAsync(
    jsonRpcRequest: JsonRpcRequest,
    callback: (error: any, jsonRpcResponse: JsonRpcResponse) => void,
  ): void {
    // TODO: this is a straight copy of the HTTP Provider,
    // can we pull this out and share the logic.
    const handleJsonRpcRequest = async () => {
      let jsonRpcResponse: JsonRpcResponse;
      try {
        const result = await this.request({
          method: jsonRpcRequest.method,
          params: jsonRpcRequest.params,
        });

        jsonRpcResponse = {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          result,
        };
      } catch (error) {
        ensureError(error);

        if (!("code" in error) || error.code === undefined) {
          throw error;
        }

        /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        -- Allow string interpolation of unknown `error.code`. It will be converted
        to a number, and we will handle NaN cases appropriately afterwards. */
        const errorCode = parseInt(`${error.code}`, 10);
        jsonRpcResponse = {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          error: {
            code: !isNaN(errorCode) ? errorCode : -1,
            message: error.message,
            data: {
              stack: error.stack,
              name: error.name,
            },
          },
        };
      }

      return jsonRpcResponse;
    };

    util.callbackify(handleJsonRpcRequest)(callback);
  }

  #isErrorResponse(response: any): response is FailedJsonRpcResponse {
    return typeof response.error !== "undefined";
  }

  #getStackTraceFailuresCountAction(): number {
    return this.#failedStackTraces;
  }

  #getStackTraceFailuresCountParams(_params: any[]): [] {
    // TODO: bring back validation
    // return validateParams(params);
    return [];
  }

  #addCompilationResultParams(
    params: any[],
  ): [string, CompilerInput, CompilerOutput] {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: find replacement for validate params or is this already done in the HTTP Provider?
    return params as [string, CompilerInput, CompilerOutput];
  }

  async #addCompilationResultAction(
    solcVersion: string,
    compilerInput: CompilerInput,
    compilerOutput: CompilerOutput,
  ): Promise<boolean> {
    let bytecodes;
    try {
      bytecodes = createModelsAndDecodeBytecodes(
        solcVersion,
        compilerInput,
        compilerOutput,
      );
    } catch (error) {
      console.warn(
        chalk.yellow(
          "The Hardhat Network tracing engine could not be updated. Run Hardhat with --verbose to learn more.",
        ),
      );

      log(
        "VmTraceDecoder failed to be updated. Please report this to help us improve Hardhat.\n",
        error,
      );

      return false;
    }

    for (const bytecode of bytecodes) {
      this.#vmTraceDecoder.addBytecode(bytecode);
    }

    return true;
  }

  async #rawTraceToSolidityStackTrace(
    rawTrace: RawTrace,
  ): Promise<SolidityStackTrace | undefined> {
    const vmTracer = new VmTracer();
    vmTracer.observe(rawTrace);

    let vmTrace = vmTracer.getLastTopLevelMessageTrace();
    const vmTracerError = vmTracer.getLastError();

    if (vmTrace !== undefined) {
      vmTrace = this.#vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
    }

    try {
      if (vmTrace === undefined || vmTracerError !== undefined) {
        // eslint-disable-next-line no-restricted-syntax -- we may throw non-Hardhat errors inside of an EthereumProvider
        throw vmTracerError;
      }

      const solidityTracer = new SolidityTracer();
      return solidityTracer.getStackTrace(vmTrace);
    } catch (err) {
      this.#failedStackTraces += 1;
      log(
        "Could not generate stack trace. Please report this to help us improve Hardhat.\n",
        err,
      );
    }
  }

  async #handleEdrResponse(
    edrResponse: Response,
  ): Promise<SuccessfulJsonRpcResponse> {
    let jsonRpcResponse: JsonRpcResponse;

    if (typeof edrResponse.data === "string") {
      jsonRpcResponse = JSON.parse(edrResponse.data);
    } else {
      jsonRpcResponse = edrResponse.data;
    }

    const needsTraces = this.#vmTracer !== undefined;

    if (needsTraces) {
      const rawTraces = edrResponse.traces;

      for (const rawTrace of rawTraces) {
        this.#vmTracer?.observe(rawTrace);
      }
    }

    if (this.#isErrorResponse(jsonRpcResponse)) {
      let error;

      const solidityTrace = edrResponse.solidityTrace;
      let stackTrace: SolidityStackTrace | undefined;
      if (solidityTrace !== null) {
        stackTrace = await this.#rawTraceToSolidityStackTrace(solidityTrace);
      }

      if (stackTrace !== undefined) {
        error = encodeSolidityStackTrace(
          jsonRpcResponse.error.message,
          stackTrace,
        );

        // Pass data and transaction hash from the original error
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: can we improve this `any
        (error as any).data =
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: can we improve this `any
          (jsonRpcResponse as any).error.data?.data ?? undefined;

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: can we improve this `any`
        (error as any).transactionHash =
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: this really needs fixed
          (jsonRpcResponse as any).error.data?.transactionHash ?? undefined;
      } else {
        if (jsonRpcResponse.error.code === InvalidArgumentsError.CODE) {
          error = new InvalidArgumentsError(jsonRpcResponse.error.message);
        } else {
          error = new ProviderError(
            jsonRpcResponse.error.message,
            jsonRpcResponse.error.code,
          );
        }
        error.data = jsonRpcResponse.error.data;
      }

      // eslint-disable-next-line no-restricted-syntax -- we may throw non-Hardaht errors inside of an EthereumProvider
      throw error;
    }

    return jsonRpcResponse;
  }

  public onSubscriptionEvent(event: SubscriptionEvent): void {
    const subscription = `0x${event.filterId.toString(16)}`;
    const results = Array.isArray(event.result) ? event.result : [event.result];
    for (const result of results) {
      this.#emitLegacySubscriptionEvent(subscription, result);
      this.#emitEip1193SubscriptionEvent(subscription, result);
    }
  }

  #emitLegacySubscriptionEvent(subscription: string, result: any) {
    this.emit("notification", {
      subscription,
      result,
    });
  }

  #emitEip1193SubscriptionEvent(subscription: string, result: unknown) {
    const message: EthSubscription = {
      type: "eth_subscription",
      data: {
        subscription,
        result,
      },
    };

    this.emit("message", message);
  }
}

async function getProviderConfig(
  networkConfig: EdrNetworkConfig,
): Promise<ProviderConfig> {
  return {
    allowBlocksWithSameTimestamp: networkConfig.allowBlocksWithSameTimestamp,
    allowUnlimitedContractSize: networkConfig.allowUnlimitedContractSize,
    bailOnCallFailure: networkConfig.throwOnCallFailures,
    bailOnTransactionFailure: networkConfig.throwOnTransactionFailures,
    blockGasLimit: networkConfig.blockGasLimit,
    cacheDir: networkConfig.forking?.cacheDir,
    chainId: BigInt(networkConfig.chainId),
    chains: hardhatChainsToEdrChains(networkConfig.chains),
    // TODO: remove this cast when EDR updates the interface to accept Uint8Array
    coinbase: Buffer.from(networkConfig.coinbase),
    enableRip7212: networkConfig.enableRip7212,
    fork: await hardhatForkingConfigToEdrForkConfig(networkConfig.forking),
    genesisAccounts: await hardhatAccountsToEdrGenesisAccounts(
      networkConfig.accounts,
    ),
    hardfork: hardhatHardforkToEdrSpecId(networkConfig.hardfork),
    initialBaseFeePerGas: networkConfig.initialBaseFeePerGas,
    initialDate: BigInt(toSeconds(networkConfig.initialDate)),
    minGasPrice: networkConfig.minGasPrice,
    mining: {
      autoMine: networkConfig.mining.auto,
      interval: hardhatMiningIntervalToEdrMiningInterval(
        networkConfig.mining.interval,
      ),
      memPool: {
        order: hardhatMempoolOrderToEdrMineOrdering(
          networkConfig.mining.mempool.order,
        ),
      },
    },
    networkId: BigInt(networkConfig.networkId),
  };
}
