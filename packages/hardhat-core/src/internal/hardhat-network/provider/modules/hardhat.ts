import * as t from "io-ts";

import { CompilerInput, CompilerOutput } from "../../../../types";
import { MethodNotFoundError } from "../errors";
import {
  optionalRpcHardhatNetworkConfig,
  rpcAddress,
  rpcCompilerInput,
  rpcCompilerOutput,
  RpcHardhatNetworkConfig,
  validateParams,
} from "../input";
import { MiningTimer } from "../MiningTimer";
import { HardhatNode } from "../node";
import { ForkConfig } from "../node-types";

// tslint:disable only-hardhat-error

export class HardhatModule {
  constructor(
    private readonly _node: HardhatNode,
    private readonly _miningTimer: MiningTimer,
    private readonly _resetCallback: (forkConfig?: ForkConfig) => Promise<void>,
    private readonly _setLoggingEnabledCallback: (
      loggingEnabled: boolean
    ) => void
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
    this._miningTimer.stop();
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
}
