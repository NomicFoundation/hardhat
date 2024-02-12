import type {
  Provider as EdrProviderT,
  RawTrace,
  Response,
  SubscriptionEvent,
} from "@ignored/edr";
import type {
  Artifacts,
  BoundExperimentalHardhatNetworkMessageTraceHook,
  CompilerInput,
  CompilerOutput,
  EIP1193Provider,
  EthSubscription,
  HardhatNetworkChainsConfig,
  RequestArguments,
} from "../../../types";

import { Common } from "@nomicfoundation/ethereumjs-common";
import chalk from "chalk";
import debug from "debug";
import { EventEmitter } from "events";
import fsExtra from "fs-extra";
import * as t from "io-ts";
import semver from "semver";

import {
  HARDHAT_NETWORK_RESET_EVENT,
  HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT,
} from "../../constants";
import {
  rpcCompilerInput,
  rpcCompilerOutput,
} from "../../core/jsonrpc/types/input/solc";
import { validateParams } from "../../core/jsonrpc/types/input/validation";
import {
  InvalidArgumentsError,
  InvalidInputError,
  MethodNotFoundError,
  MethodNotSupportedError,
  ProviderError,
} from "../../core/providers/errors";
import { isErrorResponse } from "../../core/providers/http";
import { getHardforkName } from "../../util/hardforks";
import { Mutex } from "../../vendor/await-semaphore";
import { createModelsAndDecodeBytecodes } from "../stack-traces/compiler-to-model";
import { ConsoleLogger } from "../stack-traces/consoleLogger";
import { ContractsIdentifier } from "../stack-traces/contracts-identifier";
import {
  VmTraceDecoder,
  initializeVmTraceDecoder,
} from "../stack-traces/vm-trace-decoder";
import { FIRST_SOLC_VERSION_SUPPORTED } from "../stack-traces/constants";
import { encodeSolidityStackTrace } from "../stack-traces/solidity-errors";
import { SolidityStackTrace } from "../stack-traces/solidity-stack-trace";
import { SolidityTracer } from "../stack-traces/solidityTracer";
import { VMTracer } from "../stack-traces/vm-tracer";

import { getPackageJson } from "../../util/packageInfo";
import { MiningTimer } from "./MiningTimer";
import { DebugModule } from "./modules/debug";
import { EthModule } from "./modules/eth";
import { EvmModule } from "./modules/evm";
import { HardhatModule } from "./modules/hardhat";
import {
  LoggerConfig,
  ModulesLogger,
  printLine,
  replaceLastLine,
} from "./modules/logger";
import { PersonalModule } from "./modules/personal";
import { NetModule } from "./modules/net";
import { Web3Module } from "./modules/web3";
import { HardhatNode } from "./node";
import {
  ForkConfig,
  GenesisAccount,
  IntervalMiningConfig,
  MempoolOrder,
  NodeConfig,
  TracingConfig,
} from "./node-types";
import {
  edrRpcDebugTraceToHardhat,
  ethereumjsIntervalMiningConfigToEdr,
  ethereumjsMempoolOrderToEdrMineOrdering,
  ethereumsjsHardforkToEdrSpecId,
} from "./utils/convertToEdr";
import { makeCommon } from "./utils/makeCommon";
import { getGlobalEdrContext } from "./context/edr";

const log = debug("hardhat:core:hardhat-network:provider");

// Set of methods that are never logged
const PRIVATE_RPC_METHODS = new Set([
  "hardhat_getStackTraceFailuresCount",
  "hardhat_setLoggingEnabled",
]);

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export const DEFAULT_COINBASE = "0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e";

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
  experimentalHardhatNetworkMessageTraceHooks?: BoundExperimentalHardhatNetworkMessageTraceHook[];
  forkConfig?: ForkConfig;
  forkCachePath?: string;
  enableTransientStorage: boolean;
}

function getNodeConfig(
  config: HardhatNetworkProviderConfig,
  tracingConfig?: TracingConfig
): NodeConfig {
  return {
    automine: config.automine,
    blockGasLimit: config.blockGasLimit,
    minGasPrice: config.minGasPrice,
    genesisAccounts: config.genesisAccounts,
    allowUnlimitedContractSize: config.allowUnlimitedContractSize,
    tracingConfig,
    initialBaseFeePerGas: config.initialBaseFeePerGas,
    mempoolOrder: config.mempoolOrder,
    hardfork: config.hardfork,
    chainId: config.chainId,
    networkId: config.networkId,
    initialDate: config.initialDate,
    forkConfig: config.forkConfig,
    forkCachePath:
      config.forkConfig !== undefined ? config.forkCachePath : undefined,
    coinbase: config.coinbase ?? DEFAULT_COINBASE,
    chains: config.chains,
    allowBlocksWithSameTimestamp: config.allowBlocksWithSameTimestamp,
    enableTransientStorage: config.enableTransientStorage,
  };
}

class HardhatNetworkProvider extends EventEmitter implements EIP1193Provider {
  private _node?: HardhatNode;
  private _ethModule?: EthModule;
  private _netModule?: NetModule;
  private _web3Module?: Web3Module;
  private _evmModule?: EvmModule;
  private _hardhatModule?: HardhatModule;
  private _debugModule?: DebugModule;
  private _personalModule?: PersonalModule;
  private readonly _mutex = new Mutex();
  // this field is not used here but it's used in the tests
  private _common?: Common;

  constructor(
    private readonly _config: HardhatNetworkProviderConfig,
    private readonly _logger: ModulesLogger,
    private readonly _artifacts?: Artifacts
  ) {
    super();
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const release = await this._mutex.acquire();

    if (args.params !== undefined && !Array.isArray(args.params)) {
      throw new InvalidInputError(
        "Hardhat Network doesn't support JSON-RPC params sent as an object"
      );
    }

    try {
      let result;
      if (this._logger.isEnabled() && !PRIVATE_RPC_METHODS.has(args.method)) {
        result = await this._sendWithLogging(args.method, args.params);
      } else {
        result = await this._send(args.method, args.params);
      }

      if (args.method === "hardhat_reset") {
        this.emit(HARDHAT_NETWORK_RESET_EVENT);
      }
      if (args.method === "evm_revert") {
        this.emit(HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT);
      }

      return result;
    } finally {
      release();
    }
  }

  private async _sendWithLogging(
    method: string,
    params: any[] = []
  ): Promise<any> {
    try {
      const result = await this._send(method, params);
      // We log after running the method, because we want to use different
      // colors depending on whether it failed or not

      // TODO: If an eth_call, eth_sendTransaction, or eth_sendRawTransaction
      //  fails without throwing, this will be displayed in green. It's unclear
      //  if this is correct. See Eth module's TODOs for more info.

      if (method !== "hardhat_intervalMine") {
        this._logger.printMethod(method);

        const printedSomething = this._logger.printLogs();
        if (printedSomething) {
          this._logger.printEmptyLine();
        }
      }

      return result;
    } catch (err) {
      if (
        err instanceof MethodNotFoundError ||
        err instanceof MethodNotSupportedError
      ) {
        this._logger.printMethodNotSupported(method);

        throw err;
      }

      this._logger.printFailedMethod(method);
      this._logger.printLogs();

      if (err instanceof Error && !this._logger.isLoggedError(err)) {
        if (ProviderError.isProviderError(err)) {
          this._logger.printEmptyLine();
          this._logger.printErrorMessage(err.message);

          const isEIP155Error =
            err instanceof InvalidInputError && err.message.includes("EIP155");
          if (isEIP155Error) {
            this._logger.printMetaMaskWarning();
          }
        } else {
          this._logger.printUnknownError(err);
        }
      }

      this._logger.printEmptyLine();

      throw err;
    }
  }

  private async _send(method: string, params: any[] = []): Promise<any> {
    await this._init();

    if (method.startsWith("eth_")) {
      return this._ethModule!.processRequest(method, params);
    }

    if (method.startsWith("net_")) {
      return this._netModule!.processRequest(method, params);
    }

    if (method.startsWith("web3_")) {
      return this._web3Module!.processRequest(method, params);
    }

    if (method.startsWith("evm_")) {
      return this._evmModule!.processRequest(method, params);
    }

    if (method.startsWith("hardhat_")) {
      return this._hardhatModule!.processRequest(method, params);
    }

    if (method.startsWith("debug_")) {
      return this._debugModule!.processRequest(method, params);
    }

    if (method.startsWith("personal_")) {
      return this._personalModule!.processRequest(method, params);
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  private async _init() {
    if (this._node !== undefined) {
      return;
    }

    const nodeConfig = getNodeConfig(
      this._config,
      await makeTracingConfig(this._artifacts)
    );

    const [common, node] = await HardhatNode.create(nodeConfig);

    this._common = common;
    this._node = node;

    this._ethModule = new EthModule(
      common,
      node,
      this._config.throwOnTransactionFailures,
      this._config.throwOnCallFailures,
      this._logger,
      this._config.experimentalHardhatNetworkMessageTraceHooks
    );

    const miningTimer = this._makeMiningTimer();

    this._netModule = new NetModule(common);
    this._web3Module = new Web3Module(node);
    this._evmModule = new EvmModule(
      node,
      miningTimer,
      this._logger,
      this._config.allowBlocksWithSameTimestamp,
      this._config.experimentalHardhatNetworkMessageTraceHooks
    );

    const provider = new WeakRef(this);
    this._hardhatModule = new HardhatModule(
      node,
      (forkConfig?: ForkConfig) =>
        provider.deref()!._reset(miningTimer, forkConfig),
      this._logger,
      this._config.experimentalHardhatNetworkMessageTraceHooks
    );
    this._debugModule = new DebugModule(node);
    this._personalModule = new PersonalModule(node);

    this._forwardNodeEvents(node);
  }

  private _makeMiningTimer(): MiningTimer {
    const provider = new WeakRef(this);
    const miningTimer = new MiningTimer(
      this._config.intervalMining,
      async () => {
        try {
          await provider.deref()!.request({ method: "hardhat_intervalMine" });
        } catch (e) {
          console.error("Unexpected error calling hardhat_intervalMine:", e);
        }
      }
    );

    miningTimer.start();

    return miningTimer;
  }

  private async _reset(miningTimer: MiningTimer, forkConfig?: ForkConfig) {
    this._config.forkConfig = forkConfig;
    if (this._node !== undefined) {
      this._stopForwardingNodeEvents(this._node);
    }
    this._node = undefined;

    miningTimer.stop();

    await this._init();
  }

  private _forwardNodeEvents(node: HardhatNode) {
    node.addListener("ethEvent", this._ethEventListener.bind(this));
  }

  private _stopForwardingNodeEvents(node: HardhatNode) {
    node.removeListener("ethEvent", this._ethEventListener.bind(this));
  }

  private _ethEventListener(payload: { filterId: bigint; result: any }) {
    const subscription = `0x${payload.filterId.toString(16)}`;
    const result = payload.result;
    this._emitLegacySubscriptionEvent(subscription, result);
    this._emitEip1193SubscriptionEvent(subscription, result);
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

class EdrProviderEventAdapter extends EventEmitter {}

export class EdrProviderWrapper
  extends EventEmitter
  implements EIP1193Provider
{
  private _failedStackTraces = 0;

  private constructor(
    private readonly _provider: EdrProviderT,
    private readonly _eventAdapter: EdrProviderEventAdapter,
    private readonly _vmTraceDecoder: VmTraceDecoder,
    // The common configuration for EthereumJS VM is not used by EDR, but tests expect it as part of the provider.
    private readonly _common: Common,
    tracingConfig?: TracingConfig
  ) {
    super();

    if (tracingConfig !== undefined) {
      initializeVmTraceDecoder(this._vmTraceDecoder, tracingConfig);
    }
  }

  public static async create(
    config: HardhatNetworkProviderConfig,
    loggerConfig: LoggerConfig,
    artifacts?: Artifacts
  ): Promise<EdrProviderWrapper> {
    const { Provider } =
      require("@ignored/edr") as typeof import("@ignored/edr");

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

    const contractsIdentifier = new ContractsIdentifier();
    const vmTraceDecoder = new VmTraceDecoder(contractsIdentifier);

    const provider = await Provider.withConfig(
      getGlobalEdrContext(),
      {
        allowBlocksWithSameTimestamp:
          config.allowBlocksWithSameTimestamp ?? false,
        allowUnlimitedContractSize: config.allowUnlimitedContractSize,
        bailOnCallFailure: config.throwOnCallFailures,
        bailOnTransactionFailure: config.throwOnTransactionFailures,
        blockGasLimit: BigInt(config.blockGasLimit),
        chainId: BigInt(config.chainId),
        chains: Array.from(config.chains, ([chainId, hardforkConfig]) => {
          return {
            chainId: BigInt(chainId),
            hardforks: Array.from(
              hardforkConfig.hardforkHistory,
              ([hardfork, blockNumber]) => {
                return {
                  blockNumber: BigInt(blockNumber),
                  specId: ethereumsjsHardforkToEdrSpecId(
                    getHardforkName(hardfork)
                  ),
                };
              }
            ),
          };
        }),
        cacheDir: config.forkCachePath,
        coinbase: Buffer.from(coinbase.slice(2), "hex"),
        fork,
        hardfork: ethereumsjsHardforkToEdrSpecId(
          getHardforkName(config.hardfork)
        ),
        genesisAccounts: config.genesisAccounts.map((account) => {
          return {
            secretKey: account.privateKey,
            balance: BigInt(account.balance),
          };
        }),
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
      },
      {
        enable: loggerConfig.enabled,
        decodeConsoleLogInputsCallback: (inputs: Buffer[]) => {
          const consoleLogger = new ConsoleLogger();
          return consoleLogger.getDecodedLogs(inputs);
        },
        getContractAndFunctionNameCallback: (
          code: Buffer,
          calldata?: Buffer
        ) => {
          return vmTraceDecoder.getContractAndFunctionNamesForCall(
            code,
            calldata
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
      }
    );

    const common = makeCommon(getNodeConfig(config));
    const wrapper = new EdrProviderWrapper(
      provider,
      eventAdapter,
      vmTraceDecoder,
      common,
      await makeTracingConfig(artifacts)
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

    if (args.method === "hardhat_addCompilationResult") {
      return this._addCompilationResultAction(
        ...this._addCompilationResultParams(params)
      );
    } else if (args.method === "hardhat_getStackTraceFailuresCount") {
      return this._getStackTraceFailuresCountAction(
        ...this._getStackTraceFailuresCountParams(params)
      );
    }

    const stringifiedArgs = JSON.stringify({
      method: args.method,
      params,
    });

    const responseObject: Response = await this._provider.handleRequest(
      stringifiedArgs
    );
    const response = JSON.parse(responseObject.json);

    if (isErrorResponse(response)) {
      let error;

      const rawTrace = responseObject.trace;
      let stackTrace: SolidityStackTrace | undefined;
      if (rawTrace !== null) {
        stackTrace = await this._rawTraceToSolidityStackTrace(rawTrace);
      }

      if (stackTrace !== undefined) {
        error = encodeSolidityStackTrace(response.error.message, stackTrace);
        // Pass data and transaction hash from the original error
        (error as any).data = {
          data: response.error.data?.data ?? undefined,
          transactionHash: response.error.data?.transactionHash ?? undefined,
        };
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

  private _ethEventListener(event: SubscriptionEvent) {
    const subscription = `0x${event.filterId.toString(16)}`;
    const result = event.result;
    this._emitLegacySubscriptionEvent(subscription, result);
    this._emitEip1193SubscriptionEvent(subscription, result);
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

  private _addCompilationResultParams(
    params: any[]
  ): [string, CompilerInput, CompilerOutput] {
    return validateParams(
      params,
      t.string,
      rpcCompilerInput,
      rpcCompilerOutput
    );
  }

  private async _addCompilationResultAction(
    solcVersion: string,
    compilerInput: CompilerInput,
    compilerOutput: CompilerOutput
  ): Promise<boolean> {
    let bytecodes;
    try {
      bytecodes = createModelsAndDecodeBytecodes(
        solcVersion,
        compilerInput,
        compilerOutput
      );
    } catch (error) {
      console.warn(
        chalk.yellow(
          "The Hardhat Network tracing engine could not be updated. Run Hardhat with --verbose to learn more."
        )
      );

      log(
        "ContractsIdentifier failed to be updated. Please report this to help us improve Hardhat.\n",
        error
      );

      return false;
    }

    for (const bytecode of bytecodes) {
      this._vmTraceDecoder.addBytecode(bytecode);
    }

    return true;
  }

  private _getStackTraceFailuresCountParams(params: any[]): [] {
    return validateParams(params);
  }

  private _getStackTraceFailuresCountAction(): number {
    return this._failedStackTraces;
  }

  private async _rawTraceToSolidityStackTrace(
    rawTrace: RawTrace
  ): Promise<SolidityStackTrace | undefined> {
    const trace = rawTrace.trace();
    const vmTracer = new VMTracer(this._common, false);

    for (const traceItem of trace) {
      if ("pc" in traceItem) {
        await vmTracer.addStep(traceItem);
      } else if ("executionResult" in traceItem) {
        await vmTracer.addAfterMessage(traceItem.executionResult);
      } else {
        await vmTracer.addBeforeMessage(traceItem);
      }
    }

    let vmTrace = vmTracer.getLastTopLevelMessageTrace();
    const vmTracerError = vmTracer.getLastError();

    if (vmTrace !== undefined) {
      vmTrace = this._vmTraceDecoder.tryToDecodeMessageTrace(vmTrace);
    }

    try {
      if (vmTrace === undefined || vmTracerError !== undefined) {
        throw vmTracerError;
      }

      const solidityTracer = new SolidityTracer();
      return solidityTracer.getStackTrace(vmTrace);
    } catch (err) {
      this._failedStackTraces += 1;
      log(
        "Could not generate stack trace. Please report this to help us improve Hardhat.\n",
        err
      );
    }
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
  let eip1193Provider: EIP1193Provider;

  const vmModeEnvVar = process.env.HARDHAT_EXPERIMENTAL_VM_MODE ?? "ethereumjs";

  if (vmModeEnvVar === "edr") {
    eip1193Provider = await EdrProviderWrapper.create(
      hardhatNetworkProviderConfig,
      loggerConfig,
      artifacts
    );
  } else if (vmModeEnvVar === "ethereumjs" || vmModeEnvVar === "dual") {
    // Dual mode will internally use the ethereumjs and EDR adapters
    eip1193Provider = new HardhatNetworkProvider(
      hardhatNetworkProviderConfig,
      new ModulesLogger(
        loggerConfig.enabled,
        loggerConfig.printLineFn,
        loggerConfig.replaceLastLineFn
      ),
      artifacts
    );
  } else {
    // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
    throw new Error(
      `Invalid value for HARDHAT_EXPERIMENTAL_VM_MODE: ${vmModeEnvVar}`
    );
  }

  return eip1193Provider;
}

async function makeTracingConfig(
  artifacts: Artifacts | undefined
): Promise<TracingConfig | undefined> {
  if (artifacts !== undefined) {
    const buildInfos = [];

    const buildInfoFiles = await artifacts.getBuildInfoPaths();

    try {
      for (const buildInfoFile of buildInfoFiles) {
        const buildInfo = await fsExtra.readJson(buildInfoFile);
        if (semver.gte(buildInfo.solcVersion, FIRST_SOLC_VERSION_SUPPORTED)) {
          buildInfos.push(buildInfo);
        }
      }

      return {
        buildInfos,
      };
    } catch (error) {
      console.warn(
        chalk.yellow(
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
