import { BN } from "ethereumjs-util";
import * as t from "io-ts";

import { MethodNotFoundError, MethodNotSupportedError } from "../errors";
import { validateParams } from "../input";
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
        throw new MethodNotSupportedError(`Method ${method} is not supported`);

      case "evm_snapshot":
        throw new MethodNotSupportedError(`Method ${method} is not supported`);
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
    return validateParams(params);
  }

  private async _mineAction(): Promise<string> {
    await this._node.mineEmptyBlock();
    return numberToRpcQuantity(0);
  }

  // evm_revert

  // evm_snapshot
}
