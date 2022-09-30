import * as t from "io-ts";

import { BoundExperimentalHardhatNetworkMessageTraceHook } from "../../../../types";
import {
  numberToRpcQuantity,
  rpcQuantity,
} from "../../../core/jsonrpc/types/base-types";
import {
  rpcIntervalMining,
  RpcIntervalMining,
} from "../../../core/jsonrpc/types/input/hardhat-network";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import {
  InvalidInputError,
  MethodNotFoundError,
} from "../../../core/providers/errors";
import { MessageTrace } from "../../stack-traces/message-trace";
import { MiningTimer } from "../MiningTimer";
import { HardhatNode } from "../node";
import { MineBlockResult } from "../node-types";

import { ModulesLogger } from "./logger";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

// Type to accept decimal or hex-encoded params (for test rpc methods only)
const rpcQuantityOrNumber = t.union([rpcQuantity, t.number]);
type RpcQuantityOrNumber = t.TypeOf<typeof rpcQuantityOrNumber>;

export class EvmModule {
  constructor(
    private readonly _node: HardhatNode,
    private readonly _miningTimer: MiningTimer,
    private readonly _logger: ModulesLogger,
    private readonly _allowBlocksWithSameTimestamp: boolean,
    private readonly _experimentalHardhatNetworkMessageTraceHooks: BoundExperimentalHardhatNetworkMessageTraceHook[] = []
  ) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "evm_increaseTime":
        return this._increaseTimeAction(...this._increaseTimeParams(params));

      case "evm_setNextBlockTimestamp":
        return this._setNextBlockTimestampAction(
          ...this._setNextBlockTimestampParams(params)
        );

      case "evm_mine":
        return this._mineAction(...this._mineParams(params));

      case "evm_revert":
        return this._revertAction(...this._revertParams(params));

      case "evm_snapshot":
        return this._snapshotAction(...this._snapshotParams(params));

      case "evm_setAutomine":
        return this._setAutomineAction(...this._setAutomineParams(params));

      case "evm_setIntervalMining":
        return this._setIntervalMiningAction(
          ...this._setIntervalMiningParams(params)
        );

      case "evm_setBlockGasLimit":
        return this._setBlockGasLimitAction(
          ...this._setBlockGasLimitParams(params)
        );
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // evm_setNextBlockTimestamp

  private _setNextBlockTimestampParams(params: any[]): [RpcQuantityOrNumber] {
    return validateParams(params, rpcQuantityOrNumber);
  }

  private async _setNextBlockTimestampAction(
    timestamp: RpcQuantityOrNumber
  ): Promise<string> {
    const latestBlock = await this._node.getLatestBlock();
    const increment = BigInt(timestamp) - latestBlock.header.timestamp;

    if (increment < 0n) {
      throw new InvalidInputError(
        `Timestamp ${timestamp.toString()} is lower than the previous block's timestamp ${
          latestBlock.header.timestamp
        }`
      );
    }

    if (!this._allowBlocksWithSameTimestamp && increment === 0n) {
      throw new InvalidInputError(
        `Timestamp ${timestamp.toString()} is equal to the previous block's timestamp.

Enable the "allowBlocksWithSameTimestamp" option in the Hardhat network configuration to allow this.
`
      );
    }

    this._node.setNextBlockTimestamp(BigInt(timestamp));
    return timestamp.toString();
  }

  // evm_increaseTime

  private _increaseTimeParams(params: any[]): [RpcQuantityOrNumber] {
    return validateParams(params, rpcQuantityOrNumber);
  }

  private async _increaseTimeAction(
    increment: RpcQuantityOrNumber
  ): Promise<string> {
    this._node.increaseTime(BigInt(increment));
    const totalIncrement = this._node.getTimeIncrement();
    // This RPC call is an exception: it returns a number in decimal
    return totalIncrement.toString();
  }

  // evm_mine

  private _mineParams(params: any[]): [RpcQuantityOrNumber] {
    if (params.length === 0) {
      params.push(0);
    }
    return validateParams(params, rpcQuantityOrNumber);
  }

  private async _mineAction(timestamp: RpcQuantityOrNumber): Promise<string> {
    timestamp = BigInt(timestamp);
    // if timestamp is specified, make sure it is bigger than previous
    // block's timestamp
    if (timestamp !== 0n) {
      const latestBlock = await this._node.getLatestBlock();
      const increment = timestamp - latestBlock.header.timestamp;
      if (increment <= 0n) {
        throw new InvalidInputError(
          `Timestamp ${timestamp.toString()} is lower than previous block's timestamp` +
            ` ${latestBlock.header.timestamp}`
        );
      }
    }
    const result = await this._node.mineBlock(timestamp);

    await this._logBlock(result);

    return numberToRpcQuantity(0);
  }

  // evm_revert

  private _revertParams(params: any[]): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private async _revertAction(snapshotId: bigint): Promise<boolean> {
    return this._node.revertToSnapshot(Number(snapshotId));
  }

  // evm_snapshot

  private _snapshotParams(_params: any[]): [] {
    return [];
  }

  private async _snapshotAction(): Promise<string> {
    const snapshotId = await this._node.takeSnapshot();
    return numberToRpcQuantity(snapshotId);
  }

  // evm_setAutomine

  private _setAutomineParams(params: any[]): [boolean] {
    return validateParams(params, t.boolean);
  }

  private async _setAutomineAction(automine: boolean): Promise<true> {
    this._node.setAutomine(automine);
    return true;
  }

  // evm_setIntervalMining

  private _setIntervalMiningParams(params: any[]): [RpcIntervalMining] {
    return validateParams(params, rpcIntervalMining);
  }

  private async _setIntervalMiningAction(
    blockTime: RpcIntervalMining
  ): Promise<true> {
    this._miningTimer.setBlockTime(blockTime);

    return true;
  }

  // evm_setBlockGasLimit

  private _setBlockGasLimitParams(params: any[]): [bigint] {
    return validateParams(params, rpcQuantity);
  }

  private async _setBlockGasLimitAction(blockGasLimit: bigint): Promise<true> {
    if (blockGasLimit <= 0n) {
      throw new InvalidInputError("Block gas limit must be greater than 0");
    }

    await this._node.setBlockGasLimit(blockGasLimit);
    return true;
  }

  private async _logBlock(result: MineBlockResult) {
    const { block, traces } = result;

    const codes: Buffer[] = [];
    for (const txTrace of traces) {
      const code = await this._node.getCodeFromTrace(
        txTrace.trace,
        block.header.number
      );

      codes.push(code);
    }

    this._logger.logMinedBlock(result, codes);

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
