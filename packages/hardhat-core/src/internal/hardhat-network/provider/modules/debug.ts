import { rpcHash } from "../../../core/jsonrpc/types/base-types";
import {
  OptionalRpcNewBlockTag,
  optionalRpcNewBlockTag,
} from "../../../core/jsonrpc/types/input/blockTag";
import {
  RpcCallRequest,
  rpcCallRequest,
} from "../../../core/jsonrpc/types/input/callRequest";
import {
  rpcDebugTracingConfig,
  RpcDebugTracingConfig,
} from "../../../core/jsonrpc/types/input/debugTraceTransaction";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import {
  InvalidArgumentsError,
  MethodNotFoundError,
} from "../../../core/providers/errors";
import { HardhatNode } from "../node";
import { RpcDebugTraceOutput } from "../output";
import { Base } from "./base";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class DebugModule extends Base {
  constructor(_node: HardhatNode) {
    super(_node);
  }

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "debug_traceCall":
        return this._traceCallAction(...this._traceCallParams(params));
      case "debug_traceTransaction":
        return this._traceTransactionAction(
          ...this._traceTransactionParams(params)
        );
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // debug_traceCall

  private _traceCallParams(
    params: any[]
  ): [RpcCallRequest, OptionalRpcNewBlockTag, RpcDebugTracingConfig] {
    const validatedParams = validateParams(
      params,
      rpcCallRequest,
      optionalRpcNewBlockTag,
      rpcDebugTracingConfig
    );

    this._validateTracerParam(validatedParams[2]);

    return validatedParams;
  }

  private async _traceCallAction(
    callConfig: RpcCallRequest,
    block: OptionalRpcNewBlockTag,
    traceConfig: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    const callParams = await this.rpcCallRequestToNodeCallParams(callConfig);
    const blockNumber = await this.resolveNewBlockTag(block);

    return this._node.traceCall(callParams, blockNumber, traceConfig);
  }

  // debug_traceTransaction

  private _traceTransactionParams(
    params: any[]
  ): [Buffer, RpcDebugTracingConfig] {
    const validatedParams = validateParams(
      params,
      rpcHash,
      rpcDebugTracingConfig
    );

    this._validateTracerParam(validatedParams[1]);

    return validatedParams;
  }

  private async _traceTransactionAction(
    hash: Buffer,
    config: RpcDebugTracingConfig
  ): Promise<RpcDebugTraceOutput> {
    return this._node.traceTransaction(hash, config);
  }

  private _validateTracerParam(config: RpcDebugTracingConfig) {
    if (config?.tracer !== undefined) {
      throw new InvalidArgumentsError(
        "Hardhat currently only supports the default tracer, so no tracer parameter should be passed."
      );
    }
  }
}
