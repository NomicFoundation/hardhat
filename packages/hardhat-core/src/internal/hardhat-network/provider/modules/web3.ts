import {
  bufferToRpcData,
  rpcData,
} from "../../../core/jsonrpc/types/base-types";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import { MethodNotFoundError } from "../../../core/providers/errors";
import { keccak256 } from "../../../util/keccak";
import { HardhatNode } from "../node";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class Web3Module {
  constructor(private readonly _node: HardhatNode) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "web3_clientVersion":
        return this._clientVersionAction(...this._clientVersionParams(params));

      case "web3_sha3":
        return this._sha3Action(...this._sha3Params(params));
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // web3_clientVersion

  private _clientVersionParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _clientVersionAction(): Promise<string> {
    return this._node.getClientVersion();
  }

  // web3_sha3

  private _sha3Params(params: any[]): [Buffer] {
    return validateParams(params, rpcData);
  }

  private async _sha3Action(buffer: Buffer): Promise<string> {
    return bufferToRpcData(keccak256(buffer));
  }
}
