import type { SolidityStackTrace } from "./stack-traces/solidity-stack-trace.js";
import type { LoggerConfig } from "./types/logger.js";
import type { TracingConfig } from "./types/node-types.js";
import type { EdrNetworkConfig } from "../../../../types/config.js";
import type {
  EthSubscription,
  FailedJsonRpcResponse,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "../../../../types/providers.js";
import type {
  CompilerInput,
  CompilerOutput,
} from "../../../../types/solidity/compiler-io.js";
import type { DefaultHDAccountsConfigParams } from "../accounts/constants.js";
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

import {
  createModelsAndDecodeBytecodes,
  initializeVmTraceDecoder,
  SolidityTracer,
  VmTracer,
} from "@ignored/edr-optimism";
import { toSeconds } from "@ignored/hardhat-vnext-utils/date";
import { deepEqual } from "@ignored/hardhat-vnext-utils/lang";
import chalk from "chalk";
import debug from "debug";

import {
  HARDHAT_NETWORK_RESET_EVENT,
  HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT,
} from "../../../constants.js";
import { DEFAULT_HD_ACCOUNTS_CONFIG_PARAMS } from "../accounts/constants.js";
import { BaseProvider } from "../base-provider.js";
import { getJsonRpcRequest, isFailedJsonRpcResponse } from "../json-rpc.js";

import { getGlobalEdrContext } from "./edr-context.js";
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
  hardhatChainTypeToEdrChainType,
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

export async function isDefaultEdrNetworkHDAccountsConfig(
  account: unknown,
): Promise<boolean> {
  return deepEqual(account, DEFAULT_EDR_NETWORK_HD_ACCOUNTS_CONFIG_PARAMS);
}

export const EDR_NETWORK_DEFAULT_PRIVATE_KEYS: string[] = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
  "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
  "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
  "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
  "0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa",
  "0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61",
  "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
  "0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd",
  "0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0",
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e",
];

interface EdrProviderConfig {
  networkConfig: EdrNetworkConfig;
  loggerConfig?: LoggerConfig;
  tracingConfig?: TracingConfig;
  jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;
}

export class EdrProvider extends BaseProvider {
  readonly #provider: Readonly<Provider>;
  readonly #vmTraceDecoder: Readonly<VmTraceDecoder>;
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
      hardhatChainTypeToEdrChainType(networkConfig.chainType),
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
