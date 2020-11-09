import { BN } from "ethereumjs-util";
import * as t from "io-ts";

import { InvalidInputError, MethodNotFoundError } from "../errors";
import {
  rpcIntervalMining,
  RpcIntervalMining,
  rpcQuantity,
  validateParams,
} from "../input";
import { HardhatNode } from "../node";
import { numberToRpcQuantity } from "../output";

// tslint:disable only-hardhat-error

export class EvmModule {
  constructor(private readonly _node: HardhatNode) {}

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

      case "evm_setAutomineEnabled":
        return this._setAutomineEnabledAction(
          ...this._setAutomineEnabledParams(params)
        );

      case "evm_setIntervalMining":
        return this._setIntervalMiningAction(
          ...this._setIntervalMiningParams(params)
        );
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // evm_setNextBlockTimestamp

  private _setNextBlockTimestampParams(params: any[]): [number] {
    return validateParams(params, t.number);
  }

  private async _setNextBlockTimestampAction(
    timestamp: number
  ): Promise<string> {
    const latestBlock = await this._node.getLatestBlock();
    const increment = new BN(timestamp).sub(
      new BN(latestBlock.header.timestamp)
    );
    if (increment.lte(new BN(0))) {
      throw new InvalidInputError(
        `Timestamp ${timestamp} is lower than previous block's timestamp` +
          ` ${new BN(latestBlock.header.timestamp).toNumber()}`
      );
    }
    await this._node.setNextBlockTimestamp(new BN(timestamp));
    return timestamp.toString();
  }

  // evm_increaseTime

  private _increaseTimeParams(params: any[]): [number] {
    return validateParams(params, t.number);
  }

  private async _increaseTimeAction(increment: number): Promise<string> {
    await this._node.increaseTime(new BN(increment));
    const totalIncrement = await this._node.getTimeIncrement();
    // This RPC call is an exception: it returns a number in decimal
    return totalIncrement.toString();
  }

  // evm_mine

  private _mineParams(params: any[]): [number] {
    if (params.length === 0) {
      params.push(0);
    }
    return validateParams(params, t.number);
  }

  private async _mineAction(timestamp: number): Promise<string> {
    // if timestamp is specified, make sure it is bigger than previous
    // block's timestamp
    if (timestamp !== 0) {
      const latestBlock = await this._node.getLatestBlock();
      const increment = new BN(timestamp).sub(
        new BN(latestBlock.header.timestamp)
      );
      if (increment.lte(new BN(0))) {
        throw new InvalidInputError(
          `Timestamp ${timestamp} is lower than previous block's timestamp` +
            ` ${new BN(latestBlock.header.timestamp).toNumber()}`
        );
      }
    }
    await this._node.mineBlock(false, new BN(timestamp));
    return numberToRpcQuantity(0);
  }

  // evm_revert

  private _revertParams(params: any[]): [BN] {
    return validateParams(params, rpcQuantity);
  }

  private async _revertAction(snapshotId: BN): Promise<boolean> {
    return this._node.revertToSnapshot(snapshotId.toNumber());
  }

  // evm_snapshot

  private _snapshotParams(params: any[]): [] {
    return [];
  }

  private async _snapshotAction(): Promise<string> {
    const snapshotId = await this._node.takeSnapshot();
    return numberToRpcQuantity(snapshotId);
  }

  // evm_setAutomineEnabled

  private _setAutomineEnabledParams(params: any[]): [boolean] {
    return validateParams(params, t.boolean);
  }

  private async _setAutomineEnabledAction(automine: boolean): Promise<true> {
    this._node.setAutomineEnabled(automine);
    return true;
  }

  // evm_setIntervalMining

  private _setIntervalMiningParams(params: any[]): [RpcIntervalMining] {
    return validateParams(params, rpcIntervalMining);
  }

  private async _setIntervalMiningAction(
    miningConfig: RpcIntervalMining
  ): Promise<true> {
    this._node.runIntervalMining(miningConfig.enabled, miningConfig.blockTime);

    return true;
  }
}
