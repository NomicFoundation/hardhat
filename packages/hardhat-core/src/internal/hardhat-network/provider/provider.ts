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
  InvalidInputError,
  MethodNotFoundError,
  MethodNotSupportedError,
  ProviderError,
} from "../../core/providers/errors";
import { Mutex } from "../../vendor/await-semaphore";

import { FIRST_SOLC_VERSION_SUPPORTED } from "../stack-traces/constants";
import { MiningTimer } from "./MiningTimer";
import { DebugModule } from "./modules/debug";
import { EthModule } from "./modules/eth";
import { EvmModule } from "./modules/evm";
import { HardhatModule } from "./modules/hardhat";
import { ModulesLogger } from "./modules/logger";
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
}

export class HardhatNetworkProvider
  extends EventEmitter
  implements EIP1193Provider
{
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

    const config: NodeConfig = {
      automine: this._config.automine,
      blockGasLimit: this._config.blockGasLimit,
      minGasPrice: this._config.minGasPrice,
      genesisAccounts: this._config.genesisAccounts,
      allowUnlimitedContractSize: this._config.allowUnlimitedContractSize,
      tracingConfig: await this._makeTracingConfig(),
      initialBaseFeePerGas: this._config.initialBaseFeePerGas,
      mempoolOrder: this._config.mempoolOrder,
      hardfork: this._config.hardfork,
      chainId: this._config.chainId,
      networkId: this._config.networkId,
      initialDate: this._config.initialDate,
      forkConfig: this._config.forkConfig,
      forkCachePath:
        this._config.forkConfig !== undefined
          ? this._config.forkCachePath
          : undefined,
      coinbase: this._config.coinbase ?? DEFAULT_COINBASE,
      chains: this._config.chains,
      allowBlocksWithSameTimestamp: this._config.allowBlocksWithSameTimestamp,
    };

    const [common, node] = await HardhatNode.create(config);

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
    this._hardhatModule = new HardhatModule(
      node,
      (forkConfig?: ForkConfig) => this._reset(miningTimer, forkConfig),
      (loggingEnabled: boolean) => {
        this._logger.setEnabled(loggingEnabled);
      },
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
    const miningTimer = new MiningTimer(
      this._config.intervalMining,
      async () => {
        try {
          await this.request({ method: "hardhat_intervalMine" });
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
    node.addListener("ethEvent", this._ethEventListener);
  }

  private _stopForwardingNodeEvents(node: HardhatNode) {
    node.removeListener("ethEvent", this._ethEventListener);
  }

  private _ethEventListener = (payload: { filterId: bigint; result: any }) => {
    const subscription = `0x${payload.filterId.toString(16)}`;
    const result = payload.result;
    this._emitLegacySubscriptionEvent(subscription, result);
    this._emitEip1193SubscriptionEvent(subscription, result);
  };

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
