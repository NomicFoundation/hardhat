import ansiEscapes from "ansi-escapes";
import chalk, { Chalk } from "chalk";
import debug from "debug";
import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";
import { EventEmitter } from "events";
import fsExtra from "fs-extra";
import path from "path";
import semver from "semver";
import util from "util";

import {
  BoundExperimentalBuidlerEVMMessageTraceHook,
  EthereumProvider,
  ProjectPaths,
} from "../../../types";
import { SOLC_INPUT_FILENAME, SOLC_OUTPUT_FILENAME } from "../../constants";
import { CompilerInput, CompilerOutput } from "../stack-traces/compiler-types";
import { SolidityError } from "../stack-traces/solidity-errors";
import { FIRST_SOLC_VERSION_SUPPORTED } from "../stack-traces/solidityTracer";
import { Mutex } from "../vendor/await-semaphore";

import {
  BuidlerEVMProviderError,
  MethodNotFoundError,
  MethodNotSupportedError,
} from "./errors";
import { BuidlerModule } from "./modules/buidler";
import { EthModule } from "./modules/eth";
import { EvmModule } from "./modules/evm";
import { ModulesLogger } from "./modules/logger";
import { NetModule } from "./modules/net";
import { Web3Module } from "./modules/web3";
import { BuidlerNode, GenesisAccount } from "./node";

const log = debug("buidler:core:buidler-evm:provider");

// Set of methods that are never logged
const PRIVATE_RPC_METHODS = new Set(["buidler_getStackTraceFailuresCount"]);

// tslint:disable only-buidler-error

export class BuidlerEVMProvider extends EventEmitter
  implements EthereumProvider {
  private _common?: Common;
  private _node?: BuidlerNode;
  private _ethModule?: EthModule;
  private _netModule?: NetModule;
  private _web3Module?: Web3Module;
  private _evmModule?: EvmModule;
  private _buidlerModule?: BuidlerModule;
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
    private readonly _solcVersion?: string,
    private readonly _paths?: ProjectPaths,
    private readonly _loggingEnabled = false,
    private readonly _allowUnlimitedContractSize = false,
    private readonly _initialDate?: Date,
    private readonly _experimentalBuidlerEVMMessageTraceHooks: BoundExperimentalBuidlerEVMMessageTraceHook[] = []
  ) {
    super();
  }

  public async send(method: string, params: any[] = []): Promise<any> {
    const release = await this._mutex.acquire();

    try {
      if (this._loggingEnabled && !PRIVATE_RPC_METHODS.has(method)) {
        return await this._sendWithLogging(method, params);
      }

      return await this._send(method, params);
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
      } else if (err instanceof BuidlerEVMProviderError) {
        this._log(err.message, true);
      } else {
        this._logError(err, true);
        this._log("");
        this._log(
          "If you think this is a bug in Buidler, please report it here: https://buidler.dev/reportbug",
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

    if (method.startsWith("buidler_")) {
      return this._buidlerModule!.processRequest(method, params);
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  private async _init() {
    if (this._node !== undefined) {
      return;
    }

    let compilerInput: CompilerInput | undefined;
    let compilerOutput: CompilerOutput | undefined;

    if (this._solcVersion !== undefined && this._paths !== undefined) {
      if (semver.lt(this._solcVersion, FIRST_SOLC_VERSION_SUPPORTED)) {
        console.warn(
          chalk.yellow(
            `Solidity stack traces only work with Solidity version ${FIRST_SOLC_VERSION_SUPPORTED} or higher.`
          )
        );
      } else {
        let hasCompiledContracts = false;

        if (await fsExtra.pathExists(this._paths.artifacts)) {
          const artifactsDir = await fsExtra.readdir(this._paths.artifacts);
          hasCompiledContracts = artifactsDir.some((f) => f.endsWith(".json"));
        }

        if (hasCompiledContracts) {
          try {
            const solcInputPath = path.join(
              this._paths.cache,
              SOLC_INPUT_FILENAME
            );
            const solcOutputPath = path.join(
              this._paths.cache,
              SOLC_OUTPUT_FILENAME
            );

            compilerInput = await fsExtra.readJSON(solcInputPath, {
              encoding: "utf8",
            });
            compilerOutput = await fsExtra.readJSON(solcOutputPath, {
              encoding: "utf8",
            });
          } catch (error) {
            console.warn(
              chalk.yellow(
                "Stack traces engine could not be initialized. Run Buidler with --verbose to learn more."
              )
            );

            log(
              "Solidity stack traces disabled: Failed to read solc's input and output files. Please report this to help us improve Buidler.\n",
              error
            );
          }
        }
      }
    }

    const [common, node] = await BuidlerNode.create(
      this._hardfork,
      this._networkName,
      this._chainId,
      this._networkId,
      this._blockGasLimit,
      this._genesisAccounts,
      this._solcVersion,
      this._allowUnlimitedContractSize,
      this._initialDate,
      compilerInput,
      compilerOutput
    );

    this._common = common;
    this._node = node;

    this._ethModule = new EthModule(
      common,
      node,
      this._throwOnTransactionFailures,
      this._throwOnCallFailures,
      this._loggingEnabled ? this._logger : undefined,
      this._experimentalBuidlerEVMMessageTraceHooks
    );

    this._netModule = new NetModule(common);
    this._web3Module = new Web3Module();
    this._evmModule = new EvmModule(node);
    this._buidlerModule = new BuidlerModule(node);

    const listener = (payload: { filterId: BN; result: any }) => {
      this.emit("notifications", {
        subscription: `0x${payload.filterId.toString(16)}`,
        result: payload.result,
      });
    };

    // Handle eth_subscribe events and proxy them to handler
    this._node.addListener("ethEvent", listener);
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
