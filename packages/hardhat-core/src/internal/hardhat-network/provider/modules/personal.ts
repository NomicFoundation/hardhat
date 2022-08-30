import { Address, toRpcSig } from "@nomicfoundation/ethereumjs-util";

import { rpcAddress, rpcData } from "../../../core/jsonrpc/types/base-types";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import { MethodNotFoundError } from "../../../core/providers/errors";
import { HardhatNode } from "../node";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

export class PersonalModule {
  constructor(private readonly _node: HardhatNode) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "personal_sign": {
        return this._signAction(...this._signParams(params));
      }
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // personal_sign

  private _signParams(params: any[]): [Buffer, Buffer] {
    return validateParams(params, rpcData, rpcAddress);
  }

  private async _signAction(data: Buffer, address: Buffer): Promise<string> {
    const signature = await this._node.signPersonalMessage(
      new Address(address),
      data
    );

    return toRpcSig(signature.v, signature.r, signature.s);
  }
}
