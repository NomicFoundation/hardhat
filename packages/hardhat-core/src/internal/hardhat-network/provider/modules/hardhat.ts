import { BN } from "ethereumjs-util";
import * as t from "io-ts";

import {
  BoundExperimentalHardhatNetworkMessageTraceHook,
  CompilerInput,
  CompilerOutput,
} from "../../../../types";
import { rpcAddress } from "../../../core/jsonrpc/types/base-types";
import {
  optionalRpcHardhatNetworkConfig,
  RpcHardhatNetworkConfig,
} from "../../../core/jsonrpc/types/input/hardhat-network";
import {
  rpcCompilerInput,
  rpcCompilerOutput,
} from "../../../core/jsonrpc/types/input/solc";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import { MethodNotFoundError } from "../../../core/providers/errors";
import { MessageTrace } from "../../stack-traces/message-trace";
import { HardhatNode } from "../node";
import { ForkConfig, MineBlockResult } from "../node-types";

import { ModulesLogger } from "./logger";

// tslint:disable only-hardhat-error

export class HardhatModule {
  constructor(
    private readonly _node: HardhatNode,
    private readonly _resetCallback: (forkConfig?: ForkConfig) => Promise<void>,
    private readonly _setLoggingEnabledCallback: (
      loggingEnabled: boolean
    ) => void,
    private readonly _logger: ModulesLogger,
    private readonly _experimentalHardhatNetworkMessageTraceHooks: BoundExperimentalHardhatNetworkMessageTraceHook[] = []
  ) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "hardhat_getStackTraceFailuresCount":
        return this._getStackTraceFailuresCountAction(
          ...this._getStackTraceFailuresCountParams(params)
        );

      case "hardhat_addCompilationResult":
        return this._addCompilationResultAction(
          ...this._addCompilationResultParams(params)
        );

      case "hardhat_impersonateAccount":
        return this._impersonateAction(...this._impersonateParams(params));

      case "hardhat_intervalMine":
        return this._intervalMineAction(...this._intervalMineParams(params));

      case "hardhat_stopImpersonatingAccount":
        return this._stopImpersonatingAction(
          ...this._stopImpersonatingParams(params)
        );

      case "hardhat_reset":
        return this._resetAction(...this._resetParams(params));

      case "hardhat_setLoggingEnabled":
        return this._setLoggingEnabledAction(
          ...this._setLoggingEnabledParams(params)
        );
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // hardhat_getStackTraceFailuresCount

  private _getStackTraceFailuresCountParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _getStackTraceFailuresCountAction(): Promise<number> {
    return this._node.getStackTraceFailuresCount();
  }

  // hardhat_addCompilationResult

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
    return this._node.addCompilationResult(
      solcVersion,
      compilerInput,
      compilerOutput
    );
  }

  // hardhat_impersonateAccount

  private _impersonateParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _impersonateAction(address: Buffer): true {
    return this._node.addImpersonatedAccount(address);
  }

  // hardhat_intervalMine

  private _intervalMineParams(params: any[]): [] {
    return [];
  }

  private async _intervalMineAction(): Promise<boolean> {
    const result = await this._node.mineBlock();
    const blockNumber = result.block.header.number.toNumber();

    const isEmpty = result.block.transactions.length === 0;
    if (isEmpty) {
      this._logger.printMinedBlockNumber(blockNumber, isEmpty);
    } else {
      await this._logBlock(result);
      this._logger.printMinedBlockNumber(blockNumber, isEmpty);
      const printedSomething = this._logger.printLogs();
      if (printedSomething) {
        this._logger.printEmptyLine();
      }
    }

    return true;
  }

  // hardhat_stopImpersonatingAccount

  private _stopImpersonatingParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _stopImpersonatingAction(address: Buffer): boolean {
    return this._node.removeImpersonatedAccount(address);
  }

  // hardhat_reset

  private _resetParams(params: any[]): [RpcHardhatNetworkConfig | undefined] {
    return validateParams(params, optionalRpcHardhatNetworkConfig);
  }

  private async _resetAction(
    networkConfig?: RpcHardhatNetworkConfig
  ): Promise<true> {
    await this._resetCallback(networkConfig?.forking);
    return true;
  }

  // hardhat_setLoggingEnabled

  private _setLoggingEnabledParams(params: any[]): [boolean] {
    return validateParams(params, t.boolean);
  }

  private async _setLoggingEnabledAction(
    loggingEnabled: boolean
  ): Promise<true> {
    this._setLoggingEnabledCallback(loggingEnabled);
    return true;
  }

  private async _logBlock(result: MineBlockResult) {
    const { block, traces } = result;

    const codes: Buffer[] = [];
    for (const txTrace of traces) {
      const code = await this._node.getCodeFromTrace(
        txTrace.trace,
        new BN(block.header.number)
      );

      codes.push(code);
    }

    this._logger.logIntervalMinedBlock(result, codes);

    for (const txTrace of traces) {
      await this._runHardhatNetworkMessageTraceHooks(txTrace.trace, false);
    }
  }

  private async _runHardhatNetworkMessageTraceHooks(
    trace: MessageTrace | undefined,
    isCall: boolean
  ) {
    if (trace === undefined) {
      return;
    }

    for (const hook of this._experimentalHardhatNetworkMessageTraceHooks) {
      await hook(trace, isCall);
    }
  }
}
