import chalk from "chalk";
import debug from "debug";
import Common from "ethereumjs-common";
import { EventEmitter } from "events";
import fsExtra from "fs-extra";
import path from "path";
import semver from "semver";

import { EthereumProvider, ProjectPaths } from "../../../types";
import { SOLC_INPUT_FILENAME, SOLC_OUTPUT_FILENAME } from "../../constants";
import { getUserConfigPath } from "../../core/project-structure";
import { FIRST_SOLC_VERSION_SUPPORTED } from "../stack-traces/solidityTracer";
import { Mutex } from "../vendor/await-semaphore";

import { MethodNotFoundError } from "./errors";
import { BuidlerModule } from "./modules/buidler";
import { EthModule } from "./modules/eth";
import { EvmModule } from "./modules/evm";
import { NetModule } from "./modules/net";
import { Web3Module } from "./modules/web3";
import { BuidlerNode, GenesisAccount, SolidityTracerOptions } from "./node";

const log = debug("buidler:core:buidler-evm:provider");

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
    private readonly _paths?: ProjectPaths
  ) {
    super();
    const config = getUserConfigPath();
  }

  public async send(method: string, params: any[] = []): Promise<any> {
    const release = await this._mutex.acquire();

    try {
      return await this._send(method, params);
    } finally {
      release();
    }
  }

  private async _sendDebug(method: string, params: any[] = []): Promise<any> {
    try {
      console.log(chalk.green(`RPC CALL ${method}`), params);

      const res = await this._send(method, params);

      console.log(chalk.green(`Response of ${method}`), res);

      return res;
    } catch (err) {
      console.error(chalk.red(`Error running ${method}`), err);

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

    if (method.startsWith("buidler_")) {
      return this._buidlerModule!.processRequest(method, params);
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  private async _init() {
    if (this._node !== undefined) {
      return;
    }

    let stackTracesOptions: SolidityTracerOptions | undefined;

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
          hasCompiledContracts = artifactsDir.some(f => f.endsWith(".json"));
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

            stackTracesOptions = {
              solidityVersion: this._solcVersion,
              compilerInput: await fsExtra.readJSON(solcInputPath, {
                encoding: "utf8"
              }),
              compilerOutput: await fsExtra.readJSON(solcOutputPath, {
                encoding: "utf8"
              })
            };
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
      this._throwOnTransactionFailures,
      this._throwOnCallFailures,
      this._genesisAccounts,
      stackTracesOptions
    );

    this._common = common;
    this._node = node;

    this._ethModule = new EthModule(common, node);
    this._netModule = new NetModule(common);
    this._web3Module = new Web3Module();
    this._evmModule = new EvmModule(node);
    this._buidlerModule = new BuidlerModule(node);
  }
}
