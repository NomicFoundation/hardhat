import type {
  Artifacts,
  CompilerInput,
  CompilerOutput,
  EIP1193Provider,
  EthSubscription,
  HardhatNetworkChainsConfig,
  RequestArguments,
} from "../../../types";

import type {
  EdrContext,
  LoggerConfig as EdrLoggerConfig,
  Provider as EdrProviderT,
  Response,
  SubscriptionEvent,
  TracingConfigWithBuffers,
  ProviderConfig,
  SubscriptionConfig,
  ChainOverride,
  AccountOverride,
} from "@nomicfoundation/edr";
import { privateToAddress } from "@ethereumjs/util";
import { ContractDecoder, precompileP256Verify } from "@nomicfoundation/edr";
import picocolors from "picocolors";
import debug from "debug";
import { EventEmitter } from "events";
import fsExtra from "fs-extra";
import * as t from "io-ts";

import { requireNapiRsModule } from "../../../common/napi-rs";
import {
  HARDHAT_NETWORK_RESET_EVENT,
  HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT,
} from "../../constants";
import { numberToRpcQuantity } from "../../core/jsonrpc/types/base-types";
import {
  optionalRpcHardhatNetworkConfig,
  RpcHardhatNetworkConfig,
} from "../../core/jsonrpc/types/input/hardhat-network";
import {
  rpcCompilerInput,
  rpcCompilerOutput,
} from "../../core/jsonrpc/types/input/solc";
import { validateParams } from "../../core/jsonrpc/types/input/validation";
import {
  InternalError,
  InvalidArgumentsError,
  InvalidInputError,
  ProviderError,
} from "../../core/providers/errors";
import { isErrorResponse } from "../../core/providers/http";
import {
  getHardforkName,
  hardforkGte,
  HardforkName,
} from "../../util/hardforks";
import { ConsoleLogger } from "../stack-traces/consoleLogger";
import { encodeSolidityStackTrace } from "../stack-traces/solidity-errors";
import { SolidityStackTrace } from "../stack-traces/solidity-stack-trace";

import { getPackageJson } from "../../util/packageInfo";
import {
  ForkConfig,
  GenesisAccount,
  IntervalMiningConfig,
  MempoolOrder,
} from "./node-types";
import {
  edrRpcDebugTraceToHardhat,
  edrTracingMessageResultToMinimalEVMResult,
  edrTracingMessageToMinimalMessage,
  edrTracingStepToMinimalInterpreterStep,
  ethereumjsIntervalMiningConfigToEdr,
  ethereumjsMempoolOrderToEdrMineOrdering,
  ethereumsjsHardforkToEdrSpecId,
  httpHeadersToEdr,
} from "./utils/convertToEdr";
import { LoggerConfig, printLine, replaceLastLine } from "./modules/logger";
import { MinimalEthereumJsVm, getMinimalEthereumJsVm } from "./vm/minimal-vm";

const log = debug("hardhat:core:hardhat-network:provider");

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export const DEFAULT_COINBASE = "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e";
let _globalEdrContext: EdrContext | undefined;

// Lazy initialize the global EDR context.
export async function getGlobalEdrContext(): Promise<EdrContext> {
  const { EdrContext, GENERIC_CHAIN_TYPE, genericChainProviderFactory } =
    requireNapiRsModule(
      "@nomicfoundation/edr"
    ) as typeof import("@nomicfoundation/edr");

  if (_globalEdrContext === undefined) {
    // Only one is allowed to exist
    _globalEdrContext = new EdrContext();
    await _globalEdrContext.registerProviderFactory(
      GENERIC_CHAIN_TYPE,
      genericChainProviderFactory()
    );
  }

  return _globalEdrContext;
}

interface HardhatNetworkProviderConfig {
  hardfork: string;
  chainId: number;
  networkId: number;
  blockGasLimit: number;
  minGasPrice: bigint;
  automine: boolean;
  intervalMining: IntervalMiningConfig;
  mempoolOrder: MempoolOrder;
  chains: HardhatNetworkChainsConfig;
  genesisAccounts: GenesisAccount[];
  allowUnlimitedContractSize: boolean;
  throwOnTransactionFailures: boolean;
  throwOnCallFailures: boolean;
  allowBlocksWithSameTimestamp: boolean;

  initialBaseFeePerGas?: number;
  initialDate?: Date;
  coinbase?: string;
  forkConfig?: ForkConfig;
  forkCachePath?: string;
  enableTransientStorage: boolean;
  enableRip7212: boolean;
}

class EdrProviderEventAdapter extends EventEmitter {}

type CallOverrideCallback = (
  address: Buffer,
  data: Buffer
) => Promise<
  { result: Buffer; shouldRevert: boolean; gas: bigint } | undefined
>;

export class EdrProviderWrapper
  extends EventEmitter
  implements EIP1193Provider
{
  private _failedStackTraces = 0;

  // temporarily added to make smock work with HH+EDR
  private _callOverrideCallback?: CallOverrideCallback;

  private constructor(
    private _provider: EdrProviderT,
    private readonly _providerConfig: ProviderConfig,
    private readonly _loggerConfig: EdrLoggerConfig,
    // we add this for backwards-compatibility with plugins like solidity-coverage
    private _node: {
      _vm: MinimalEthereumJsVm;
    },
    private readonly _subscriptionConfig: SubscriptionConfig,
    // Store the initial `genesisAccounts`, `cacheDir`, and `chainOverrides` for `hardhat_reset`
    // calls, in case there is switching between local and fork configurations.
    private readonly _originalGenesisAccounts: GenesisAccount[],
    private readonly _originalCacheDir: string | undefined,
    private readonly _originalChainOverrides: ChainOverride[] | undefined
  ) {
    super();
  }

  public static async create(
    config: HardhatNetworkProviderConfig,
    loggerConfig: LoggerConfig,
    tracingConfig?: TracingConfigWithBuffers
  ): Promise<EdrProviderWrapper> {
    const { GENERIC_CHAIN_TYPE } = requireNapiRsModule(
      "@nomicfoundation/edr"
    ) as typeof import("@nomicfoundation/edr");

    const coinbase = config.coinbase ?? DEFAULT_COINBASE;

    const chainOverrides = Array.from(
      config.chains,
      ([chainId, hardforkConfig]) => {
        return {
          chainId: BigInt(chainId),
          name: "Unknown",
          hardforks: Array.from(
            hardforkConfig.hardforkHistory,
            ([hardfork, blockNumber]) => {
              return {
                condition: { blockNumber: BigInt(blockNumber) },
                hardfork: ethereumsjsHardforkToEdrSpecId(
                  getHardforkName(hardfork)
                ),
              };
            }
          ),
        };
      }
    );

    const cacheDir = config.forkCachePath;

    let fork;
    if (config.forkConfig !== undefined) {
      fork = {
        blockNumber:
          config.forkConfig.blockNumber !== undefined
            ? BigInt(config.forkConfig.blockNumber)
            : undefined,
        cacheDir,
        chainOverrides,
        httpHeaders: httpHeadersToEdr(config.forkConfig.httpHeaders),
        url: config.forkConfig.jsonRpcUrl,
      };
    }

    const initialDate =
      config.initialDate !== undefined
        ? BigInt(Math.floor(config.initialDate.getTime() / 1000))
        : undefined;

    // To accommodate construction ordering, we need an adapter to forward events
    // from the EdrProvider callback to the wrapper's listener
    const eventAdapter = new EdrProviderEventAdapter();

    const printLineFn = loggerConfig.printLineFn ?? printLine;
    const replaceLastLineFn = loggerConfig.replaceLastLineFn ?? replaceLastLine;

    const hardforkName = getHardforkName(config.hardfork);
    const edrHardfork = ethereumsjsHardforkToEdrSpecId(hardforkName);

    const [genesisState, ownedAccounts] = _genesisStateAndOwnedAccounts(
      fork !== undefined,
      edrHardfork,
      config.genesisAccounts
    );

    const precompileOverrides = config.enableRip7212
      ? hardforkGte(hardforkName, HardforkName.OSAKA)
        ? [] // Osaka includes the P256 precompile natively
        : [precompileP256Verify()]
      : [];

    const edrProviderConfig = {
      allowBlocksWithSameTimestamp:
        config.allowBlocksWithSameTimestamp ?? false,
      allowUnlimitedContractSize: config.allowUnlimitedContractSize,
      bailOnCallFailure: config.throwOnCallFailures,
      bailOnTransactionFailure: config.throwOnTransactionFailures,
      blockGasLimit: BigInt(config.blockGasLimit),
      chainId: BigInt(config.chainId),
      coinbase: Buffer.from(coinbase.slice(2), "hex"),
      precompileOverrides,
      fork,
      genesisState,
      hardfork: edrHardfork,
      initialDate,
      initialBaseFeePerGas:
        config.initialBaseFeePerGas !== undefined
          ? BigInt(config.initialBaseFeePerGas!)
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
      observability: {},
      ownedAccounts,
      // Turn off the Osaka EIP-7825 per transaction gas limit for HH2
      // when being run from `solidity-coverage`.
      // We detect the magic number that `solidity-coverage` sets the block
      // gas limit to, see https://github.com/sc-forks/solidity-coverage/blob/8e52fd7eae73803edf50c5af2faeeca8e5a57e27/lib/api.js#L55
      // We turn it off the transaction gas limit by setting it
      // to a large number (the same number `solidity-coverage` uses for
      // setting gas).
      transactionGasCap:
        config.blockGasLimit === 0x1fffffffffffff
          ? BigInt(0xfffffffffffff)
          : undefined,
    };

    const edrLoggerConfig = {
      enable: loggerConfig.enabled,
      decodeConsoleLogInputsCallback: (inputs: ArrayBuffer[]) => {
        return ConsoleLogger.getDecodedLogs(
          inputs.map((input) => {
            return Buffer.from(input);
          })
        );
      },
      printLineCallback: (message: string, replace: boolean) => {
        if (replace) {
          replaceLastLineFn(message);
        } else {
          printLineFn(message);
        }
      },
    };

    const edrSubscriptionConfig = {
      subscriptionCallback: (event: SubscriptionEvent) => {
        eventAdapter.emit("ethEvent", event);
      },
    };

    const edrTracingConfig = tracingConfig ?? {};

    const contractDecoder = ContractDecoder.withContracts(edrTracingConfig);

    const context = await getGlobalEdrContext();
    const provider = await context.createProvider(
      GENERIC_CHAIN_TYPE,
      edrProviderConfig,
      edrLoggerConfig,
      edrSubscriptionConfig,
      contractDecoder
    );

    const minimalEthereumJsNode = {
      _vm: getMinimalEthereumJsVm(provider),
    };

    const wrapper = new EdrProviderWrapper(
      provider,
      edrProviderConfig,
      edrLoggerConfig,
      minimalEthereumJsNode,
      edrSubscriptionConfig,
      config.genesisAccounts,
      cacheDir,
      chainOverrides
    );

    // Pass through all events from the provider
    eventAdapter.addListener(
      "ethEvent",
      wrapper._ethEventListener.bind(wrapper)
    );

    return wrapper;
  }

  public async request(args: RequestArguments): Promise<unknown> {
    if (args.params !== undefined && !Array.isArray(args.params)) {
      throw new InvalidInputError(
        "Hardhat Network doesn't support JSON-RPC params sent as an object"
      );
    }

    const params = args.params ?? [];

    // stubbed for backwards compatibility
    switch (args.method) {
      case "hardhat_getStackTraceFailuresCount":
        return 0;
      case "eth_mining":
        return false;
      case "net_listening":
        return true;
      case "net_peerCount":
        return numberToRpcQuantity(0);
      case "hardhat_reset":
        return this._reset(..._resetParams(params));
      case "hardhat_addCompilationResult":
        return this._addCompilationResult(
          ..._addCompilationResultParams(params)
        );
    }

    const stringifiedArgs = JSON.stringify({
      method: args.method,
      params,
    });

    const responseObject: Response = await this._provider.handleRequest(
      stringifiedArgs
    );

    let response;
    if (typeof responseObject.data === "string") {
      response = JSON.parse(responseObject.data);
    } else {
      response = responseObject.data;
    }

    const needsTraces =
      this._node._vm.evm.events.eventNames().length > 0 ||
      this._node._vm.events.eventNames().length > 0;

    if (needsTraces) {
      const rawTraces = responseObject.traces;
      for (const rawTrace of rawTraces) {
        // For other consumers in JS we need to marshall the entire trace over FFI
        const trace = rawTrace.trace;

        // beforeTx event
        if (this._node._vm.events.listenerCount("beforeTx") > 0) {
          this._node._vm.events.emit("beforeTx");
        }

        for (const traceItem of trace) {
          // step event
          if ("pc" in traceItem) {
            if (this._node._vm.evm.events.listenerCount("step") > 0) {
              this._node._vm.evm.events.emit(
                "step",
                edrTracingStepToMinimalInterpreterStep(traceItem)
              );
            }
          }
          // afterMessage event
          else if ("executionResult" in traceItem) {
            if (this._node._vm.evm.events.listenerCount("afterMessage") > 0) {
              this._node._vm.evm.events.emit(
                "afterMessage",
                edrTracingMessageResultToMinimalEVMResult(traceItem)
              );
            }
          }
          // beforeMessage event
          else {
            if (this._node._vm.evm.events.listenerCount("beforeMessage") > 0) {
              this._node._vm.evm.events.emit(
                "beforeMessage",
                edrTracingMessageToMinimalMessage(traceItem)
              );
            }
          }
        }

        // afterTx event
        if (this._node._vm.events.listenerCount("afterTx") > 0) {
          this._node._vm.events.emit("afterTx");
        }
      }
    }

    if (isErrorResponse(response)) {
      let error;

      let stackTrace: SolidityStackTrace | null = null;
      try {
        stackTrace = responseObject.stackTrace();
      } catch (e) {
        log("Failed to get stack trace: %O", e);
      }

      if (stackTrace !== null) {
        error = encodeSolidityStackTrace(response.error.message, stackTrace);
        // Pass data and transaction hash from the original error
        (error as any).data = response.error.data?.data ?? undefined;
        (error as any).transactionHash =
          response.error.data?.transactionHash ?? undefined;
      } else {
        if (response.error.code === InvalidArgumentsError.CODE) {
          error = new InvalidArgumentsError(response.error.message);
        } else {
          error = new ProviderError(
            response.error.message,
            response.error.code
          );
        }
        error.data = response.error.data;
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw error;
    }

    if (args.method === "evm_revert") {
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

  private async _addCompilationResult(
    solcVersion: string,
    input: CompilerInput,
    output: CompilerOutput
  ): Promise<boolean> {
    try {
      await this._provider.addCompilationResult(solcVersion, input, output);

      return true;
    } catch (error: any) {
      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw new InternalError(error);
    }
  }

  private async _reset(networkConfig?: RpcHardhatNetworkConfig) {
    const { GENERIC_CHAIN_TYPE } = requireNapiRsModule(
      "@nomicfoundation/edr"
    ) as typeof import("@nomicfoundation/edr");
    const forkConfig = networkConfig?.forking;

    const [genesisState, ownedAccounts] = _genesisStateAndOwnedAccounts(
      forkConfig !== undefined,
      this._providerConfig.hardfork,
      this._originalGenesisAccounts
    );

    this._providerConfig.genesisState = genesisState;
    this._providerConfig.ownedAccounts = ownedAccounts;

    if (forkConfig !== undefined) {
      const cacheDir =
        this._providerConfig.fork === undefined
          ? this._originalCacheDir
          : this._providerConfig.fork?.cacheDir;

      const chainOverrides =
        this._providerConfig.fork === undefined
          ? this._originalChainOverrides
          : this._providerConfig.fork?.chainOverrides;

      this._providerConfig.fork = {
        blockNumber:
          forkConfig.blockNumber !== undefined
            ? BigInt(forkConfig.blockNumber)
            : undefined,
        cacheDir,
        chainOverrides,
        httpHeaders: httpHeadersToEdr(forkConfig.httpHeaders),
        url: forkConfig.jsonRpcUrl,
      };
    } else {
      this._providerConfig.fork = undefined;
    }

    const context = await getGlobalEdrContext();
    const provider = await context.createProvider(
      GENERIC_CHAIN_TYPE,
      this._providerConfig,
      this._loggerConfig,
      this._subscriptionConfig,
      this._provider.contractDecoder()
    );

    this._provider = provider;
    this._node._vm.stateManager.updateProvider(provider);

    this.emit(HARDHAT_NETWORK_RESET_EVENT);

    return true;
  }

  // temporarily added to make smock work with HH+EDR
  private async _setCallOverrideCallback(
    callback: CallOverrideCallback
  ): Promise<void> {
    this._callOverrideCallback = callback;

    await this._provider.setCallOverrideCallback(
      async (address: ArrayBuffer, data: ArrayBuffer) => {
        return this._callOverrideCallback?.(
          Buffer.from(address),
          Buffer.from(data)
        );
      }
    );
  }

  private async _setVerboseTracing(enabled: boolean): Promise<void> {
    await this._provider.setVerboseTracing(enabled);
  }

  private _ethEventListener(event: SubscriptionEvent) {
    const subscription = `0x${event.filterId.toString(16)}`;
    const results = Array.isArray(event.result) ? event.result : [event.result];
    for (const result of results) {
      this._emitLegacySubscriptionEvent(subscription, result);
      this._emitEip1193SubscriptionEvent(subscription, result);
    }
  }

  private _emitLegacySubscriptionEvent(subscription: string, result: any) {
    this.emit("notification", {
      subscription,
      result,
    });
  }

  private _emitEip1193SubscriptionEvent(subscription: string, result: unknown) {
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

async function clientVersion(edrClientVersion: string): Promise<string> {
  const hardhatPackage = await getPackageJson();
  const edrVersion = edrClientVersion.split("/")[1];
  return `HardhatNetwork/${hardhatPackage.version}/@nomicfoundation/edr/${edrVersion}`;
}

export async function createHardhatNetworkProvider(
  hardhatNetworkProviderConfig: HardhatNetworkProviderConfig,
  loggerConfig: LoggerConfig,
  artifacts?: Artifacts
): Promise<EIP1193Provider> {
  log("Making tracing config");
  const tracingConfig = await makeTracingConfig(artifacts);
  log("Creating EDR provider");
  const provider = await EdrProviderWrapper.create(
    hardhatNetworkProviderConfig,
    loggerConfig,
    tracingConfig
  );
  log("EDR provider created");

  return provider;
}

async function makeTracingConfig(
  artifacts: Artifacts | undefined
): Promise<TracingConfigWithBuffers | undefined> {
  if (artifacts !== undefined) {
    const buildInfoFiles = await artifacts.getBuildInfoPaths();

    try {
      const buildInfos = await Promise.all(
        buildInfoFiles.map((filePath) => fsExtra.readFile(filePath))
      );

      return {
        buildInfos,
      };
    } catch (error) {
      console.warn(
        picocolors.yellow(
          "Stack traces engine could not be initialized. Run Hardhat with --verbose to learn more."
        )
      );

      log(
        "Solidity stack traces disabled: Failed to read solc's input and output files. Please report this to help us improve Hardhat.\n",
        error
      );
    }
  }
}

function _addCompilationResultParams(
  params: any[]
): [string, CompilerInput, CompilerOutput] {
  return validateParams(params, t.string, rpcCompilerInput, rpcCompilerOutput);
}

function _resetParams(params: any[]): [RpcHardhatNetworkConfig | undefined] {
  return validateParams(params, optionalRpcHardhatNetworkConfig);
}

function _genesisStateAndOwnedAccounts(
  isForked: boolean,
  hardfork: string,
  genesisAccounts: GenesisAccount[]
): [AccountOverride[], string[]] {
  const { l1GenesisState, l1HardforkFromString } = requireNapiRsModule(
    "@nomicfoundation/edr"
  ) as typeof import("@nomicfoundation/edr");

  const genesisState = isForked
    ? [] // TODO: Add support for overriding remote fork state when the local fork is different
    : l1GenesisState(l1HardforkFromString(hardfork));

  const ownedAccounts = genesisAccounts.map((account) => {
    const privateKey = Uint8Array.from(
      // Strip the `0x` prefix
      Buffer.from(account.privateKey.slice(2), "hex")
    );

    genesisState.push({
      address: privateToAddress(privateKey),
      balance: BigInt(account.balance),
      code: new Uint8Array(), // Empty account code, removing potential delegation code when forking
    });

    return account.privateKey;
  });

  return [genesisState, ownedAccounts];
}
