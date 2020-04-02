import { BN } from "ethereumjs-util";
import * as t from "io-ts";

import { MethodNotFoundError, MethodNotSupportedError } from "../errors";
import { rpcQuantity, validateParams } from "../input";
import { BuidlerNode } from "../node";
import { numberToRpcQuantity } from "../output";

// tslint:disable only-buidler-error

export class EvmModule {
  constructor(private readonly _node: BuidlerNode) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "evm_increaseTime":
        return this._increaseTimeAction(...this._increaseTimeParams(params));

      case "evm_mine":
        return this._mineAction(...this._mineParams(params));

      case "evm_revert":
        return this._revertAction(...this._revertParams(params));

      case "evm_snapshot":
        return this._snapshotAction(...this._snapshotParams(params));
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
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

  private _mineParams(params: any[]): [] {
    if (params.length == 1) {
      return validateParams(params, t.number);
    } else {
      return validateParams(params);
    }
  }

  private async _mineAction(timestamp?: BN): Promise<string> {
    if (timestamp !== undefined) {
      const latestBlock = await this._node.getLatestBlock();
      const increment = new BN(timestamp).sub(new BN(latestBlock.header.timestamp));
      if (increment.lte(new BN(0))) {
        throw new InvalidInputError(`Timestamp ${timestamp} is lower than previous block's timestamp`);
      }
      await this._node.increaseTime(increment);
    }
    await this._node.mineEmptyBlock(timestamp);
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
}
