import { MethodNotFoundError } from "../errors";
import {
  RpcDebugTracingConfig,
  rpcDebugTracingConfig,
  rpcHash,
  validateParams,
} from "../input";
import { HardhatNode } from "../node";

// tslint:disable only-hardhat-error

export class DebugModule {
  constructor(private readonly _node: HardhatNode) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "debug_traceTransaction":
        return this._traceTransactionAction(
          ...this._traceTransactionParams(params)
        );
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // debug_traceTransaction

  private _traceTransactionParams(
    params: any[]
  ): [Buffer, RpcDebugTracingConfig] {
    return validateParams(params, rpcHash, rpcDebugTracingConfig);
  }

  private async _traceTransactionAction(
    hash: Buffer,
    config: RpcDebugTracingConfig
  ): Promise<object> {
    return this._node.traceTransaction(hash, config);
  }
}
