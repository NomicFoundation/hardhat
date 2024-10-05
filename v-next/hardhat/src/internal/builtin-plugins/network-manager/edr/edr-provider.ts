import type { SolidityStackTrace } from "./stack-traces/solidity-stack-trace.js";
import type { HardhatNetworkChainsConfig } from "./types/config.js";
import type { LoggerConfig } from "./types/logger.js";
import type { TracingConfig } from "./types/node-types.js";
import type { EdrNetworkConfig } from "../../../../types/config.js";
import type {
  EthereumProvider,
  FailedJsonRpcResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
} from "../../../../types/providers.js";
import type {
  CompilerInput,
  CompilerOutput,
} from "../../../../types/solidity/compiler-io.js";
import type {
  RawTrace,
  SubscriptionEvent,
  Response,
  VmTraceDecoder,
  VMTracer as VMTracerT,
} from "@nomicfoundation/edr";

import EventEmitter from "node:events";
import util from "node:util";

import { ensureError } from "@ignored/hardhat-vnext-utils/error";
import {
  Provider,
  EdrContext,
  createModelsAndDecodeBytecodes,
  initializeVmTraceDecoder,
  SolidityTracer,
  VmTracer,
} from "@nomicfoundation/edr";
import chalk from "chalk";
import debug from "debug";

import {
  HARDHAT_NETWORK_RESET_EVENT,
  HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT,
} from "../../../constants.js";

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
  ethereumjsIntervalMiningConfigToEdr,
  ethereumjsMempoolOrderToEdrMineOrdering,
  ethereumsjsHardforkToEdrSpecId,
} from "./utils/convert-to-edr.js";
import { getHardforkName } from "./utils/hardfork.js";
import { printLine, replaceLastLine } from "./utils/logger.js";

const log = debug("hardhat:core:hardhat-network:provider");

export const DEFAULT_COINBASE = "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e";
let _globalEdrContext: EdrContext | undefined;

// Lazy initialize the global EDR context.
export async function getGlobalEdrContext(): Promise<EdrContext> {
  if (_globalEdrContext === undefined) {
    // Only one is allowed to exist
    _globalEdrContext = new EdrContext();
  }

  return _globalEdrContext;
}

class EdrProviderEventAdapter extends EventEmitter {}

export class EdrProvider extends EventEmitter implements EthereumProvider {
  readonly #provider: Provider;
  readonly #vmTraceDecoder: VmTraceDecoder;

  #failedStackTraces: number = 0;

  /** Used for internal stack trace tests. */
  #vmTracer?: VMTracerT;

  public static async create(
    config: EdrNetworkConfig,
    loggerConfig: LoggerConfig,
    tracingConfig?: TracingConfig,
  ): Promise<EdrProvider> {
    const coinbase = config.coinbase ?? DEFAULT_COINBASE;

    let fork;
    if (config.forkConfig !== undefined) {
      fork = {
        jsonRpcUrl: config.forkConfig.jsonRpcUrl,
        blockNumber:
          config.forkConfig.blockNumber !== undefined
            ? BigInt(config.forkConfig.blockNumber)
            : undefined,
      };
    }

    const initialDate =
      config.initialDate !== undefined
        ? BigInt(Math.floor(config.initialDate.getTime() / 1000))
        : undefined;

    // To accomodate construction ordering, we need an adapter to forward events
    // from the EdrProvider callback to the wrapper's listener
    const eventAdapter = new EdrProviderEventAdapter();

    const printLineFn = loggerConfig.printLineFn ?? printLine;
    const replaceLastLineFn = loggerConfig.replaceLastLineFn ?? replaceLastLine;

    const vmTraceDecoder = await createVmTraceDecoder();

    const hardforkName = getHardforkName(config.hardfork);

    const provider = await Provider.withConfig(
      await getGlobalEdrContext(),
      {
        allowBlocksWithSameTimestamp:
          config.allowBlocksWithSameTimestamp ?? false,
        allowUnlimitedContractSize: config.allowUnlimitedContractSize,
        bailOnCallFailure: config.throwOnCallFailures,
        bailOnTransactionFailure: config.throwOnTransactionFailures,
        blockGasLimit: BigInt(config.blockGasLimit),
        chainId: BigInt(config.chainId),
        chains: this.#convertToEdrChains(config.chains),
        cacheDir: config.forkCachePath,
        coinbase: Buffer.from(coinbase.slice(2), "hex"),
        enableRip7212: config.enableRip7212,
        fork,
        hardfork: ethereumsjsHardforkToEdrSpecId(hardforkName),
        genesisAccounts: config.genesisAccounts.map((account) => {
          return {
            secretKey: account.privateKey,
            balance: BigInt(account.balance),
          };
        }),
        initialDate,
        initialBaseFeePerGas:
          config.initialBaseFeePerGas !== undefined
            ? BigInt(config.initialBaseFeePerGas)
            : undefined,
        minGasPrice: config.minGasPrice,
        mining: {
          autoMine: config.automine,
          interval: ethereumjsIntervalMiningConfigToEdr(config.intervalMining),
          memPool: {
            order: ethereumjsMempoolOrderToEdrMineOrdering(config.mempoolOrder),
          },
        },
        networkId: BigInt(config.networkId),
      },
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
      (event: SubscriptionEvent) => {
        eventAdapter.emit("ethEvent", event);
      },
    );

    const edrProvider = new EdrProvider(
      provider,
      vmTraceDecoder,
      tracingConfig,
    );

    return edrProvider;
  }

  constructor(
    provider: Provider,
    vmTraceDecoder: VmTraceDecoder,
    tracingConfig?: TracingConfig,
  ) {
    super();

    this.#provider = provider;
    this.#vmTraceDecoder = vmTraceDecoder;

    if (tracingConfig !== undefined) {
      initializeVmTraceDecoder(this.#vmTraceDecoder, tracingConfig);
    }
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

    const stringifiedArgs = JSON.stringify({
      method: args.method,
      params,
    });

    const responseObject: Response =
      await this.#provider.handleRequest(stringifiedArgs);

    let response;
    if (typeof responseObject.data === "string") {
      response = JSON.parse(responseObject.data);
    } else {
      response = responseObject.data;
    }

    const needsTraces = this.#vmTracer !== undefined;

    if (needsTraces) {
      const rawTraces = responseObject.traces;

      for (const rawTrace of rawTraces) {
        this.#vmTracer?.observe(rawTrace);
      }
    }

    if (this.#isErrorResponse(response)) {
      let error;

      const solidityTrace = responseObject.solidityTrace;
      let stackTrace: SolidityStackTrace | undefined;
      if (solidityTrace !== null) {
        stackTrace = await this.#rawTraceToSolidityStackTrace(solidityTrace);
      }

      if (stackTrace !== undefined) {
        error = encodeSolidityStackTrace(response.error.message, stackTrace);

        // Pass data and transaction hash from the original error
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: can we improve this `any
        (error as any).data = (response as any).error.data?.data ?? undefined;

        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: can we improve this `any`
        (error as any).transactionHash =
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: this really needs fixed
          (response as any).error.data?.transactionHash ?? undefined;
      } else {
        if (response.error.code === InvalidArgumentsError.CODE) {
          error = new InvalidArgumentsError(response.error.message);
        } else {
          error = new ProviderError(
            response.error.message,
            response.error.code,
          );
        }
        error.data = response.error.data;
      }

      // eslint-disable-next-line no-restricted-syntax -- we may throw non-Hardaht errors inside of an EthereumProvider
      throw error;
    }

    if (args.method === "hardhat_reset") {
      this.emit(HARDHAT_NETWORK_RESET_EVENT);
    } else if (args.method === "evm_revert") {
      this.emit(HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT);
    }

    // Override EDR version string with Hardhat version string with EDR backend,
    // e.g. `HardhatNetwork/2.19.0/@nomicfoundation/edr/0.2.0-dev`
    if (args.method === "web3_clientVersion") {
      return clientVersion(response.result);
    } else if (
      args.method === "debug_traceTransaction" ||
      args.method === "debug_traceCall"
    ) {
      return edrRpcDebugTraceToHardhat(response.result);
    } else {
      return response.result;
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

  static #convertToEdrChains(chains: HardhatNetworkChainsConfig) {
    const edrChains = [];

    for (const [chainId, hardforkConfig] of chains) {
      const hardforks = [];

      for (const [hardfork, blockNumber] of hardforkConfig.hardforkHistory) {
        const specId = ethereumsjsHardforkToEdrSpecId(
          getHardforkName(hardfork),
        );

        hardforks.push({
          blockNumber: BigInt(blockNumber),
          specId,
        });
      }

      edrChains.push({
        chainId: BigInt(chainId),
        hardforks,
      });
    }

    return edrChains;
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
}
