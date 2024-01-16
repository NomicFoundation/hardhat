import type { Provider as EdrProviderT, SubscriptionEvent } from "@ignored/edr";
import type {
  Artifacts,
  BoundExperimentalHardhatNetworkMessageTraceHook,
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
import semver from "semver";

import {
  HARDHAT_NETWORK_RESET_EVENT,
  HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT,
} from "../../constants";
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
import { ConsoleLogger } from "../stack-traces/consoleLogger";
import { FIRST_SOLC_VERSION_SUPPORTED } from "../stack-traces/constants";

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
  ethereumjsIntervalMiningConfigToEdr,
  ethereumjsMempoolOrderToEdrMineOrdering,
  ethereumsjsHardforkToEdrSpecId,
} from "./utils/convertToEdr";
import { makeCommon } from "./utils/makeCommon";

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
      await this._makeTracingConfig()
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

  private async _makeTracingConfig(): Promise<TracingConfig | undefined> {
    if (this._artifacts !== undefined) {
      const buildInfos = [];

      const buildInfoFiles = await this._artifacts.getBuildInfoPaths();

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

class EdrLogger {
  private _logs: Array<string | [string, string]> = [];
  private _methodBeingCollapsed?: string;
  private _methodCollapsedCount: number = 0;
  private _titleLength = 0;

  constructor(
    private _isEnabled: boolean,
    private readonly _printLine = printLine,
    private readonly _replaceLastLine = replaceLastLine
  ) {}

  public isEnabled(): boolean {
    return this._isEnabled;
  }

  public setIsEnabled(enabled: boolean) {
    this._isEnabled = enabled;
  }

  public logLine(line: string) {
    this._stopCollapsingMethod();

    this._logs.push(line);
  }

  public logLineWithTitle(title: string, line: string) {
    this._stopCollapsingMethod();

    if (title.length > this._titleLength) {
      this._titleLength = title.length;
    }

    this._logs.push([title, line]);
  }

  public printMethod(method: string) {
    if (this._shouldCollapseMethod(method)) {
      this._methodCollapsedCount += 1;

      // Directly call the private method to avoid collapsing the method
      this._replaceLastLine(
        chalk.green(`${method} (${this._methodCollapsedCount})`)
      );
    } else {
      this._startCollapsingMethod(method);

      // Directly call the private method to avoid collapsing the method
      this._printLine(chalk.green(method));
    }
  }

  public printMethodNotSupported(method: string) {
    this.printLine(chalk.red(`${method} - Method not supported`));
  }

  public printLine(line: string) {
    this._stopCollapsingMethod();

    this._printLine(line);
  }

  public printLogs(): boolean {
    const logs = this._getLogs();
    if (logs.length === 0) {
      return false;
    }

    for (const line of logs) {
      this.printLine(line);
    }

    this._logs = [];

    return true;
  }

  public replaceLastLogLine(line: string) {
    this._stopCollapsingMethod();

    this._logs[this._logs.length - 1] = line;
  }

  public replaceLastPrintLine(line: string) {
    this._stopCollapsingMethod();

    this._replaceLastLine(line);
  }

  private _getLogs(): string[] {
    return this._logs.map((line) => {
      if (typeof line === "string") {
        return line;
      }

      const title = `${line[0]}:`;
      return `${title.padEnd(this._titleLength + 1)} ${line[1]}`;
    });
  }

  private _hasLogs(): boolean {
    return this._logs.length > 0;
  }

  private _shouldCollapseMethod(method: string) {
    return (
      method === this._methodBeingCollapsed &&
      !this._hasLogs() &&
      this._methodCollapsedCount > 0
    );
  }

  private _startCollapsingMethod(method: string) {
    this._methodBeingCollapsed = method;
    this._methodCollapsedCount = 1;
  }

  private _stopCollapsingMethod() {
    this._methodBeingCollapsed = undefined;
    this._methodCollapsedCount = 0;
  }
}

class EdrProviderEventAdapter extends EventEmitter {}

export class EdrProviderWrapper
  extends EventEmitter
  implements EIP1193Provider
{
  private constructor(
    private readonly _provider: EdrProviderT,
    private readonly _eventAdapter: EdrProviderEventAdapter,
    private readonly _edrLogger: EdrLogger,
    // The common configuration for EthereumJS VM is not used by EDR, but tests expect it as part of the provider.
    private readonly _common: Common
  ) {
    super();
  }

  public static async create(
    config: HardhatNetworkProviderConfig,
    logger: EdrLogger,
    loggerEnabled: boolean
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

    const provider = await Provider.withConfig(
      {
        allowBlocksWithSameTimestamp:
          config.allowBlocksWithSameTimestamp ?? false,
        allowUnlimitedContractSize: config.allowUnlimitedContractSize,
        bailOnCallFailure: config.throwOnCallFailures,
        bailOnTransactionFailure: config.throwOnTransactionFailures,
        blockGasLimit: BigInt(config.blockGasLimit),
        chainId: BigInt(config.chainId),
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
      (message: Buffer) => {
        const consoleLogger = new ConsoleLogger();

        consoleLogger.log(message);
      },
      {
        enable: loggerEnabled,
        logLineCallback: logger.logLine.bind(logger),
        logLineWithTitleCallback: logger.logLineWithTitle.bind(logger),
        printLineCallback: logger.printLine.bind(logger),
        setIsEnabledCallback: logger.setIsEnabled.bind(logger),
        replaceLastLogLineCallback: logger.replaceLastLogLine.bind(logger),
        replaceLastPrintLineCallback: logger.replaceLastPrintLine.bind(logger),
      },
      (event: SubscriptionEvent) => {
        eventAdapter.emit("ethEvent", event);
      }
    );

    const common = makeCommon(getNodeConfig(config));
    const wrapper = new EdrProviderWrapper(
      provider,
      eventAdapter,
      logger,
      common
    );

    // Pass through all events from the provider
    eventAdapter.addListener(
      "ethEvent",
      wrapper._ethEventListener.bind(wrapper)
    );

    return wrapper;
  }

  public async request(args: RequestArguments): Promise<unknown> {
    const stringifiedArgs = JSON.stringify({
      method: args.method,
      params: args.params ?? [],
    });

    const response = JSON.parse(
      await this._provider.handleRequest(stringifiedArgs)
    );

    const shouldLog =
      this._edrLogger.isEnabled() && !PRIVATE_RPC_METHODS.has(args.method);

    if (isErrorResponse(response)) {
      if (shouldLog) {
        // TODO: Filter for method not found
        // this._edrLogger.printMethodNotSupported(args.method);
        this._edrLogger.printLogs();

        this._edrLogger.printLine("");
        this._edrLogger.printLine(`  ${response.error.message}`);

        const isEIP155Error =
          response.error.code === InvalidInputError.CODE &&
          response.error.message.includes("EIP155");

        if (isEIP155Error) {
          const message =
            "  If you are using MetaMask, you can learn how to fix this error here: https://hardhat.org/metamask-issue";

          this._edrLogger.printLine(chalk.yellow(message));
        }

        this._edrLogger.printLine("");
      }

      let error;
      if (response.error.code === InvalidArgumentsError.CODE) {
        error = new InvalidArgumentsError(response.error.message);
      } else {
        error = new ProviderError(response.error.message, response.error.code);
      }
      error.data = response.error.data;

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw error;
    } else {
      if (shouldLog && args.method !== "hardhat_setIntervalMine") {
        this._edrLogger.printMethod(args.method);

        const printedSomething = this._edrLogger.printLogs();
        if (printedSomething) {
          this._edrLogger.printLine("");
        }
      }
    }

    // Override EDR version string with Hardhat version string with EDR backend,
    // e.g. `HardhatNetwork/2.19.0/@nomicfoundation/edr/0.2.0-dev`
    if (args.method === "web3_clientVersion") {
      return clientVersion(response.result);
    }

    return response.result;
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
    const logger = new EdrLogger(
      loggerConfig.enabled,
      loggerConfig.printLineFn,
      loggerConfig.replaceLastLineFn
    );

    eip1193Provider = await EdrProviderWrapper.create(
      hardhatNetworkProviderConfig,
      logger,
      loggerConfig.enabled
    );
  } else if (vmModeEnvVar === "ethereumjs" || vmModeEnvVar === "dual") {
    const logger = new ModulesLogger(
      loggerConfig.enabled,
      loggerConfig.printLineFn,
      loggerConfig.replaceLastLineFn
    );

    // Dual mode will internally use the ethereumjs and EDR adapters
    eip1193Provider = new HardhatNetworkProvider(
      hardhatNetworkProviderConfig,
      logger,
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
