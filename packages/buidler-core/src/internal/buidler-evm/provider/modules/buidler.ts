import * as t from "io-ts";

import {
  CompilerInput,
  CompilerOutput,
} from "../../stack-traces/compiler-types";
import { MethodNotFoundError } from "../errors";
import { rpcCompilerInput, rpcCompilerOutput, validateParams } from "../input";
import { BuidlerNode } from "../node";

// tslint:disable only-buidler-error

export class BuidlerModule {
  constructor(private readonly _node: BuidlerNode) {}

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
    compilerVersion: string,
    compilerInput: CompilerInput,
    compilerOutput: CompilerOutput
  ): Promise<boolean> {
    return this._node.addCompilationResult(
      compilerVersion,
      compilerInput,
      compilerOutput
    );
  }
}
