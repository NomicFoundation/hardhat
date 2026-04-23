import type { CoverageConfig } from "./types/coverage.js";
import type { LoggerConfig } from "./types/logger.js";
import type {
  ChainDescriptorsConfig,
  EdrNetworkConfig,
} from "../../../../types/config.js";
import type {
  EthSubscription,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "../../../../types/providers.js";
import type { RequireField } from "../../../../types/utils.js";
import type { JsonRpcRequestWrapperFunction } from "../network-manager.js";
import type { TraceOutputManager } from "./utils/trace-output.js";
import type {
  SubscriptionEvent,
  Response,
  Provider,
  ProviderConfig,
  TracingConfigWithBuffers,
  GasReportConfig,
} from "@nomicfoundation/edr";

import { ContractDecoder, IncludeTraces } from "@nomicfoundation/edr";
import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { toSeconds } from "@nomicfoundation/hardhat-utils/date";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import debug from "debug";

import { sendErrorTelemetry } from "../../../cli/telemetry/error-reporter/reporter.js";
import { EDR_NETWORK_REVERT_SNAPSHOT_EVENT } from "../../../constants.js";
import { hardhatChainTypeToEdrChainType } from "../../../edr/chain-type.js";
import { getGlobalEdrContext } from "../../../edr/context.js";
import { BaseProvider } from "../base-provider.js";
import { getJsonRpcRequest, isFailedJsonRpcResponse } from "../json-rpc.js";
import {
  InvalidArgumentsError,
  ProviderError,
  UnknownError,
} from "../provider-errors.js";

import { getGenesisStateAndOwnedAccounts } from "./genesis-state.js";
import { EdrProviderStackTraceGenerationError } from "./stack-traces/stack-trace-generation-errors.js";
import { createSolidityErrorWithStackTrace } from "./stack-traces/stack-trace-solidity-errors.js";
import { isEdrProviderErrorData } from "./type-validation.js";
import { clientVersion } from "./utils/client-version.js";
import { ConsoleLogger } from "./utils/console-logger.js";
import {
  hardhatMiningIntervalToEdrMiningInterval,
  hardhatMempoolOrderToEdrMineOrdering,
  hardhatHardforkToEdrSpecId,
  hardhatForkingConfigToEdrForkConfig,
} from "./utils/convert-to-edr.js";
import { printLine, replaceLastLine } from "./utils/logger.js";

const log = debug("hardhat:core:hardhat-network:provider");

interface EdrProviderConfig {
  chainDescriptors: ChainDescriptorsConfig;
  networkConfig: RequireField<EdrNetworkConfig, "chainType">;
  loggerConfig?: LoggerConfig;
  contractDecoder: ContractDecoder;
  jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;
  coverageConfig?: CoverageConfig;
  gasReportConfig?: GasReportConfig;
  includeCallTraces?: IncludeTraces;
  connectionId: number;
  networkName: string;
  verbosity: number;
}

export class EdrProvider extends BaseProvider {
  readonly #jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;

  #provider: Provider | undefined;
  #nextRequestId = 1;
  readonly #traceOutput: TraceOutputManager | undefined;

  public static async createContractDecoder(
    tracingConfig: TracingConfigWithBuffers,
  ): Promise<ContractDecoder> {
    return ContractDecoder.withContracts(tracingConfig);
  }

  /**
   * Creates a new instance of `EdrProvider`.
   */
  public static async create({
    chainDescriptors,
    networkConfig,
    loggerConfig = { enabled: false },
    contractDecoder,
    jsonRpcRequestWrapper,
    coverageConfig,
    gasReportConfig,
    includeCallTraces,
    verbosity,
    connectionId,
    networkName,
  }: EdrProviderConfig): Promise<EdrProvider> {
    const printLineFn = loggerConfig.printLineFn ?? printLine;
    const replaceLastLineFn = loggerConfig.replaceLastLineFn ?? replaceLastLine;

    const providerConfig = await getProviderConfig(
      networkConfig,
      coverageConfig,
      gasReportConfig,
      chainDescriptors,
      includeCallTraces,
    );

    let edrProvider: EdrProvider;

    // We use a WeakRef to the provider to prevent the subscriptionCallback
    // below from creating a cycle and leaking the provider.
    let edrProviderWeakRef: WeakRef<EdrProvider> | undefined;

    // We need to catch errors here, as the provider creation can panic unexpectedly,
    // and we want to make sure such a crash is propagated as a ProviderError.
    try {
      const context = await getGlobalEdrContext();
      const provider = await context.createProvider(
        hardhatChainTypeToEdrChainType(networkConfig.chainType),
        providerConfig,
        {
          enable: loggerConfig.enabled || networkConfig.loggingEnabled,
          decodeConsoleLogInputsCallback: (inputs: ArrayBuffer[]) => {
            return ConsoleLogger.getDecodedLogs(
              inputs.map((input) => {
                return Buffer.from(input);
              }),
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
            const deferredProvider = edrProviderWeakRef?.deref();
            if (deferredProvider !== undefined) {
              deferredProvider.onSubscriptionEvent(event);
            }
          },
        },
        contractDecoder,
      );

      const tracesEnabled =
        includeCallTraces !== undefined &&
        includeCallTraces !== IncludeTraces.None;

      let traceOutput: TraceOutputManager | undefined;
      if (tracesEnabled) {
        const { TraceOutputManager: TraceOutputManagerImpl } = await import(
          "./utils/trace-output.js"
        );
        traceOutput = new TraceOutputManagerImpl(
          printLineFn,
          connectionId,
          networkName,
          verbosity,
        );
      }

      edrProvider = new EdrProvider(
        provider,
        traceOutput,
        jsonRpcRequestWrapper,
      );
      edrProviderWeakRef = new WeakRef(edrProvider);
    } catch (error) {
      ensureError(error);

      // eslint-disable-next-line no-restricted-syntax -- allow throwing UnknownError
      throw new UnknownError(error.message, error);
    }

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
    traceOutput: TraceOutputManager | undefined,
    jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction,
  ) {
    super();

    this.#provider = provider;
    this.#traceOutput = traceOutput;
    this.#jsonRpcRequestWrapper = jsonRpcRequestWrapper;

    // After a snapshot revert, the same transactions may run again.
    // Reset traced hashes so their traces are printed a second time.
    if (this.#traceOutput !== undefined) {
      this.on(EDR_NETWORK_REVERT_SNAPSHOT_EVENT, () => {
        this.#traceOutput?.clearTracedHashes();
      });
    }
  }

  public async request(
    requestArguments: RequestArguments,
  ): Promise<SuccessfulJsonRpcResponse["result"]> {
    if (this.#provider === undefined) {
      throw new HardhatError(HardhatError.ERRORS.CORE.NETWORK.PROVIDER_CLOSED);
    }

    const { method, params } = requestArguments;

    const jsonRpcRequest = getJsonRpcRequest(
      this.#nextRequestId++,
      method,
      params,
    );

    let jsonRpcResponse: JsonRpcResponse;

    if (this.#jsonRpcRequestWrapper !== undefined) {
      jsonRpcResponse = await this.#jsonRpcRequestWrapper(
        jsonRpcRequest,
        this.#handleRequest.bind(this),
      );
    } else {
      jsonRpcResponse = await this.#handleRequest(jsonRpcRequest);
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

    if (jsonRpcRequest.method === "evm_revert") {
      this.emit(EDR_NETWORK_REVERT_SNAPSHOT_EVENT);
    }

    // Override EDR version string with Hardhat version string with EDR backend,
    // e.g. `HardhatNetwork/2.19.0/@nomicfoundation/edr/0.2.0-dev`
    if (jsonRpcRequest.method === "web3_clientVersion") {
      assertHardhatInvariant(
        typeof jsonRpcResponse.result === "string",
        "Invalid client version response",
      );
      return await clientVersion(jsonRpcResponse.result);
    } else {
      return jsonRpcResponse.result;
    }
  }

  public async close(): Promise<void> {
    this.removeAllListeners();
    // Clear the provider reference to help with garbage collection
    this.#provider = undefined;
    this.#traceOutput?.clearTracedHashes();
  }

  public async addCompilationResult(
    solcVersion: string,
    compilerInput: any,
    compilerOutput: any,
  ): Promise<void> {
    if (this.#provider === undefined) {
      throw new HardhatError(HardhatError.ERRORS.CORE.NETWORK.PROVIDER_CLOSED);
    }

    await this.#provider.addCompilationResult(
      solcVersion,
      compilerInput,
      compilerOutput,
    );
  }

  async #handleEdrResponse(
    edrResponse: Response,
    method: string,
    params?: unknown[],
  ): Promise<SuccessfulJsonRpcResponse> {
    let jsonRpcResponse: JsonRpcResponse;
    let txHash: string | undefined;

    if (typeof edrResponse.data === "string") {
      jsonRpcResponse = JSON.parse(edrResponse.data);
    } else {
      jsonRpcResponse = edrResponse.data;
    }

    if (isFailedJsonRpcResponse(jsonRpcResponse)) {
      const responseError = jsonRpcResponse.error;
      let error;

      // Grab the tx hash so trace deduplication can recognize this transaction later
      const errorData = responseError.data;
      if (isEdrProviderErrorData(errorData)) {
        txHash = errorData.transactionHash;
      }

      const stackTrace = edrResponse.stackTrace();

      if (stackTrace?.kind === "StackTrace") {
        // If we have a stack trace, we know that the json rpc response data
        // is an object with the data and transactionHash fields
        assertHardhatInvariant(
          isEdrProviderErrorData(responseError.data),
          "Invalid error data",
        );

        error = createSolidityErrorWithStackTrace(
          responseError.message,
          stackTrace.entries,
          responseError.data.data,
          responseError.data.transactionHash,
        );
      } else {
        if (stackTrace !== null) {
          if (stackTrace.kind === "UnexpectedError") {
            await sendErrorTelemetry(
              new EdrProviderStackTraceGenerationError(stackTrace.errorMessage),
            );
            log(`Failed to get stack trace: ${stackTrace.errorMessage}`);
          } else {
            const errHeuristicFailed =
              "Heuristic failed to generate stack trace";
            await sendErrorTelemetry(
              new EdrProviderStackTraceGenerationError(errHeuristicFailed),
            );
            log(`Failed to get stack trace: ${errHeuristicFailed}`);
          }
        }

        error =
          responseError.code === InvalidArgumentsError.CODE
            ? new InvalidArgumentsError(responseError.message)
            : new ProviderError(responseError.message, responseError.code);
        error.data = responseError.data;
      }

      this.#traceOutput?.outputCallTraces(edrResponse, method, txHash, true);

      /* eslint-disable-next-line no-restricted-syntax -- we may throw
      non-Hardhat errors inside of an EthereumProvider */
      throw error;
    }

    if (this.#traceOutput !== undefined) {
      // Output call traces for successful responses. The tx hash is resolved
      // from the response/params so the trace manager can deduplicate.

      if (
        method === "eth_sendTransaction" ||
        method === "eth_sendRawTransaction"
      ) {
        txHash =
          typeof jsonRpcResponse.result === "string"
            ? jsonRpcResponse.result
            : undefined;
      } else if (method === "eth_getTransactionReceipt") {
        // params[0] is the tx hash being queried — used to dedup receipt polling
        txHash = typeof params?.[0] === "string" ? params[0] : undefined;
      }

      this.#traceOutput.outputCallTraces(edrResponse, method, txHash, false);
    }

    return jsonRpcResponse;
  }

  public onSubscriptionEvent(event: SubscriptionEvent): void {
    const subscription = numberToHexString(event.filterId);
    const results = Array.isArray(event.result) ? event.result : [event.result];
    for (const result of results) {
      this.#emitLegacySubscriptionEvent(subscription, result);
      this.#emitEip1193SubscriptionEvent(subscription, result);
    }
  }

  #emitLegacySubscriptionEvent(subscription: string, result: unknown) {
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

  async #handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    assertHardhatInvariant(
      this.#provider !== undefined,
      "The provider is not defined",
    );

    const stringifiedArgs = JSON.stringify(request);

    let edrResponse: Response;

    // We need to catch errors here, as the provider creation can panic unexpectedly,
    // and we want to make sure such a crash is propagated as a ProviderError.
    try {
      edrResponse = await this.#provider.handleRequest(stringifiedArgs);
    } catch (error) {
      ensureError(error);

      // eslint-disable-next-line no-restricted-syntax -- allow throwing UnknownError
      throw new UnknownError(error.message, error);
    }

    return await this.#handleEdrResponse(
      edrResponse,
      request.method,
      Array.isArray(request.params) ? request.params : undefined,
    );
  }
}

export async function getProviderConfig(
  networkConfig: RequireField<EdrNetworkConfig, "chainType">,
  coverageConfig: CoverageConfig | undefined,
  gasReportConfig: GasReportConfig | undefined,
  chainDescriptors: ChainDescriptorsConfig,
  includeCallTraces?: IncludeTraces,
): Promise<ProviderConfig> {
  const specId = hardhatHardforkToEdrSpecId(
    networkConfig.hardfork,
    networkConfig.chainType,
  );

  const { genesisState, ownedAccounts } = await getGenesisStateAndOwnedAccounts(
    networkConfig.accounts,
    networkConfig.forking,
    networkConfig.chainType,
    specId,
  );

  return {
    allowBlocksWithSameTimestamp: networkConfig.allowBlocksWithSameTimestamp,
    allowUnlimitedContractSize: networkConfig.allowUnlimitedContractSize,
    bailOnCallFailure: networkConfig.throwOnCallFailures,
    bailOnTransactionFailure: networkConfig.throwOnTransactionFailures,
    blockGasLimit: networkConfig.blockGasLimit,
    chainId: BigInt(networkConfig.chainId),
    coinbase: networkConfig.coinbase,
    fork: await hardhatForkingConfigToEdrForkConfig(
      networkConfig.forking,
      chainDescriptors,
      networkConfig.chainType,
    ),
    genesisState: Array.from(genesisState.values()),
    hardfork: specId,
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
    observability: {
      codeCoverage: coverageConfig,
      gasReport: gasReportConfig,
      includeCallTraces,
    },
    ownedAccounts: ownedAccounts.map((account) => account.secretKey),
    precompileOverrides: [],
  };
}
