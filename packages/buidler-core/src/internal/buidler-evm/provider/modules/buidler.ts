import * as t from "io-ts";

import { ForkConfig } from "../../../../types";
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

// tslint:disable only-buidler-error

export class BuidlerModule {
  constructor(
    private readonly _node: BuidlerNode,
    private readonly _resetCallback: (forkConfig: ForkConfig) => Promise<void>
  ) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "buidler_getStackTraceFailuresCount":
        return this._getStackTraceFailuresCountAction(
          ...this._getStackTraceFailuresCountParams(params)
        );
      case "buidler_addCompilationResult":
        return this._addCompilationResultAction(
          ...this._addCompilationResultParams(params)
        );
      case "buidler_impersonate":
        if (!this._node.isForked) {
          throw new MethodNotSupportedError(method, true);
        }
        return this._impersonateAction(...this._impersonateParams(params));
      case "buidler_stopImpersonating":
        if (!this._node.isForked) {
          throw new MethodNotSupportedError(method, true);
        }
        return this._stopImpersonatingAction(
          ...this._stopImpersonatingParams(params)
        );
      case "buidler_reset":
        if (!this._node.isForked) {
          throw new MethodNotSupportedError(method, true);
        }
        return this._resetAction(...this._resetParams(params));
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // buidler_getStackTraceFailuresCount

  private _getStackTraceFailuresCountParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _getStackTraceFailuresCountAction(): Promise<number> {
    return this._node.getStackTraceFailuresCount();
  }

  // buidler_addCompilationResult

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
    return this._node.addCompilationResult({
      solcVersion,
      compilerInput,
      compilerOutput,
    });
  }

  // buidler_impersonate

  private _impersonateParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _impersonateAction(address: Buffer): true {
    return this._node.addImpersonatedAccount(address);
  }

  // buidler_stopImpersonating

  private _stopImpersonatingParams(params: any[]): [Buffer] {
    return validateParams(params, rpcAddress);
  }

  private _stopImpersonatingAction(address: Buffer): boolean {
    return this._node.removeImpersonatedAccount(address);
  }

  // buidler_reset

  private _resetParams(params: any[]): [ForkConfig] {
    return validateParams(params, rpcForkConfig);
  }

  private async _resetAction(forkConfig: ForkConfig): Promise<true> {
    await this._resetCallback(forkConfig);
    return true;
  }
}
