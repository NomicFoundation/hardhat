import ansiEscapes from "ansi-escapes";
import chalk, { Chalk } from "chalk";
import debug from "debug";
import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";
import { EventEmitter } from "events";
import fsExtra from "fs-extra";
import semver from "semver";
import util from "util";

import type {
  Artifacts,
  BoundExperimentalHardhatNetworkMessageTraceHook,
  EIP1193Provider,
  EthSubscription,
  RequestArguments,
} from "../../../types";
import { SolidityError } from "../stack-traces/solidity-errors";
import { FIRST_SOLC_VERSION_SUPPORTED } from "../stack-traces/solidityTracer";
import { Mutex } from "../vendor/await-semaphore";

import {
  HardhatNetworkProviderError,
  InvalidInputError,
  MethodNotFoundError,
  MethodNotSupportedError,
} from "./errors";
import { EthModule } from "./modules/eth";
import { EvmModule } from "./modules/evm";
import { HardhatModule } from "./modules/hardhat";
import { ModulesLogger } from "./modules/logger";
import { NetModule } from "./modules/net";
import { Web3Module } from "./modules/web3";
import { HardhatNode } from "./node";
import {
  ForkConfig,
  GenesisAccount,
  NodeConfig,
  TracingConfig,
} from "./node-types";

const log = debug("hardhat:core:hardhat-network:provider");

// Set of methods that are never logged
const PRIVATE_RPC_METHODS = new Set([
  "hardhat_getStackTraceFailuresCount",
  "hardhat_setLoggingEnabled",
]);

// tslint:disable only-hardhat-error

export class HardhatNetworkProvider extends EventEmitter
  implements EIP1193Provider {
  private _common?: Common;
  private _node?: HardhatNode;
  private _ethModule?: EthModule;
  private _netModule?: NetModule;
  private _web3Module?: Web3Module;
  private _evmModule?: EvmModule;
  private _hardhatModule?: HardhatModule;
  private readonly _mutex = new Mutex();
  private readonly _logger = new ModulesLogger();

  private _methodBeingCollapsed?: string;
  private _methodCollapsedCount: number = 0;

  constructor(
    private readonly _hardfork: string,
    private readonly _networkName: string,
    private readonly _chainId: number,
    private readonly _networkId: number,
    private readonly _blockGasLimit: number,
    private readonly _throwOnTransactionFailures: boolean,
    private readonly _throwOnCallFailures: boolean,
    private readonly _genesisAccounts: GenesisAccount[] = [],
    private readonly _artifacts?: Artifacts,
    private _loggingEnabled = false,
    private readonly _allowUnlimitedContractSize = false,
    private readonly _initialDate?: Date,
    private readonly _experimentalHardhatNetworkMessageTraceHooks: BoundExperimentalHardhatNetworkMessageTraceHook[] = [],
    private _forkConfig?: ForkConfig,
    private readonly _forkCachePath?: string
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
      if (this._loggingEnabled && !PRIVATE_RPC_METHODS.has(args.method)) {
        return await this._sendWithLogging(args.method, args.params);
      }

      return await this._send(args.method, args.params);
    } finally {
      release();
    }
  }

  private async _sendWithLogging(
    method: string,
    params: any[] = []
  ): Promise<any> {
    this._logger.clearLogs();

    try {
      const result = await this._send(method, params);
      // We log after running the method, because we want to use different
      // colors depending on whether it failed or not

      // TODO: If an eth_call, eth_sendTransaction, or eth_sendRawTransaction
      //  fails without throwing, this will be displayed in green. It's unclear
      //  if this is correct. See Eth module's TODOs for more info.

      if (this._shouldCollapseMethod(method)) {
        this._logCollapsedMethod(method);
      } else {
        this._startCollapsingMethod(method);
        this._log(method, false, chalk.green);
      }

      const loggedSomething = this._logModuleMessages();
      if (loggedSomething) {
        this._stopCollapsingMethod();
        this._log("");
      }

      return result;
    } catch (err) {
      this._stopCollapsingMethod();

      if (
        err instanceof MethodNotFoundError ||
        err instanceof MethodNotSupportedError
      ) {
        this._log(`${method} - Method not supported`, false, chalk.red);

        throw err;
      }

      this._log(method, false, chalk.red);

      const loggedSomething = this._logModuleMessages();
      if (loggedSomething) {
        this._log("");
      }

      if (err instanceof SolidityError) {
        this._logError(err);
      } else if (err instanceof HardhatNetworkProviderError) {
        this._log(err.message, true);
      } else {
        this._logError(err, true);
        this._log("");
        this._log(
          "If you think this is a bug in Hardhat, please report it here: https://hardhat.org/reportbug",
          true
        );
      }

      this._log("");

      throw err;
    }
  }

  private _logCollapsedMethod(method: string) {
    this._methodCollapsedCount += 1;

    process.stdout.write(
      // tslint:disable-next-line:prefer-template
      ansiEscapes.cursorHide +
        ansiEscapes.cursorPrevLine +
        chalk.green(`${method} (${this._methodCollapsedCount})`) +
        "\n" +
        ansiEscapes.eraseEndLine +
        ansiEscapes.cursorShow
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

  private _shouldCollapseMethod(method: string) {
    return (
      method === this._methodBeingCollapsed &&
      !this._logger.hasLogs() &&
      this._methodCollapsedCount > 0
    );
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

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  private async _init() {
    if (this._node !== undefined) {
      return;
    }

    let config: NodeConfig;

    const commonConfig = {
      blockGasLimit: this._blockGasLimit,
      genesisAccounts: this._genesisAccounts,
      allowUnlimitedContractSize: this._allowUnlimitedContractSize,
      tracingConfig: await this._makeTracingConfig(),
    };

    if (this._forkConfig === undefined) {
      config = {
        type: "local",
        hardfork: this._hardfork,
        networkName: this._networkName,
        chainId: this._chainId,
        networkId: this._networkId,
        initialDate: this._initialDate,
        ...commonConfig,
      };
    } else {
      config = {
        type: "forked",
        forkConfig: this._forkConfig,
        forkCachePath: this._forkCachePath,
        ...commonConfig,
      };
    }

    const [common, node] = await HardhatNode.create(config);

    this._common = common;
    this._node = node;

    this._ethModule = new EthModule(
      common,
      node,
      this._throwOnTransactionFailures,
      this._throwOnCallFailures,
      this._logger,
      this._experimentalHardhatNetworkMessageTraceHooks
    );

    this._netModule = new NetModule(common);
    this._web3Module = new Web3Module();
    this._evmModule = new EvmModule(node);
    this._hardhatModule = new HardhatModule(
      node,
      this._reset.bind(this),
      (loggingEnabled: boolean) => {
        this._loggingEnabled = loggingEnabled;
        this._logger.enable(loggingEnabled);
      }
    );

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

  private async _reset(forkConfig?: ForkConfig) {
    this._forkConfig = forkConfig;
    if (this._node !== undefined) {
      this._stopForwardingNodeEvents(this._node);
    }
    this._node = undefined;

    await this._init();
  }

  private _forwardNodeEvents(node: HardhatNode) {
    node.addListener("ethEvent", this._ethEventListener);
  }

  private _stopForwardingNodeEvents(node: HardhatNode) {
    node.removeListener("ethEvent", this._ethEventListener);
  }

  private _ethEventListener = (payload: { filterId: BN; result: any }) => {
    const subscription = `0x${payload.filterId.toString(16)}`;
    const result = payload.result;
    this._emitLegacySubscriptionEvent(subscription, result);
    this._emitEip1193SubscriptionEvent(subscription, result);
  };

  private _emitLegacySubscriptionEvent(subscription: string, result: any) {
    this.emit("notifications", {
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

  private _logModuleMessages(): boolean {
    const logs = this._logger.getLogs();
    if (logs.length === 0) {
      return false;
    }

    for (const msg of logs) {
      this._log(msg, true);
    }

    return true;
  }

  private _logError(err: Error, logInRed = false) {
    this._log(util.inspect(err), true, logInRed ? chalk.red : undefined);
  }

  private _log(msg: string, indent = false, color?: Chalk) {
    if (indent) {
      msg = msg
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
    }

    if (color !== undefined) {
      console.log(color(msg));
      return;
    }

    console.log(msg);
  }
}
