import * as t from "io-ts";

import {
  CompilerInput,
  CompilerOutput,
} from "../../stack-traces/compiler-types";
import { MethodNotFoundError, MethodNotSupportedError } from "../errors";
import {
  rpcAddress,
  rpcCompilerInput,
  rpcCompilerOutput,
  rpcForkConfig,
  validateParams,
} from "../input";
import { BuidlerNode } from "../node";
import { ForkConfig } from "../node-types";

// tslint:disable only-hardhat-error

export class HardhatModule {
  constructor(
    private readonly _node: BuidlerNode,
    private readonly _resetCallback: (forkConfig?: ForkConfig) => Promise<void>
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
      case "hardhat_impersonate":
        if (!this._node.isForked) {
          throw new MethodNotSupportedError(method, true);
        }
        return this._impersonateAction(...this._impersonateParams(params));
      case "hardhat_stopImpersonating":
        if (!this._node.isForked) {
          throw new MethodNotSupportedError(method, true);
        }
        return this._stopImpersonatingAction(
          ...this._stopImpersonatingParams(params)
        );
      case "hardhat_reset":
        return this._resetAction(...this._resetParams(params));
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

  // hardhat_impersonate

  private _impersonateParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _impersonateAction(address: Buffer): true {
    return this._node.addImpersonatedAccount(address);
  }

  // hardhat_stopImpersonating

  private _stopImpersonatingParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _stopImpersonatingAction(address: Buffer): boolean {
    return this._node.removeImpersonatedAccount(address);
  }

  // hardhat_reset

  private _resetParams(params: any[]): [ForkConfig | undefined] {
    return validateParams(params, rpcForkConfig);
  }

  private async _resetAction(forkConfig?: ForkConfig): Promise<true> {
    await this._resetCallback(forkConfig);
    return true;
  }
}
