import { Common } from "@nomicfoundation/ethereumjs-common";

import { numberToRpcQuantity } from "../../../core/jsonrpc/types/base-types";
import { validateParams } from "../../../core/jsonrpc/types/input/validation";
import { MethodNotFoundError } from "../../../core/providers/errors";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

export class NetModule {
  constructor(private readonly _common: Common) {}

  public async processRequest(
    method: string,
    params: any[] = []
  ): Promise<any> {
    switch (method) {
      case "net_listening":
        return this._listeningAction(...this._listeningParams(params));

      case "net_peerCount":
        return this._peerCountAction(...this._peerCountParams(params));

      case "net_version":
        return this._versionAction(...this._versionParams(params));
    }

    throw new MethodNotFoundError(`Method ${method} not found`);
  }

  // net_listening

  private _listeningParams(params: any[]): [] {
    return validateParams(params);
  }

  private async _listeningAction(): Promise<boolean> {
    return true;
  }

  // net_peerCount

  private _peerCountParams(_params: any[]): [] {
    return [];
  }

  private async _peerCountAction(): Promise<string> {
    return numberToRpcQuantity(0);
  }

  // net_version

  private _versionParams(_params: any[]): [] {
    return [];
  }

  private async _versionAction(): Promise<string> {
    // This RPC call is an exception: it returns a number in decimal
    return this._common.networkId().toString();
  }
}
