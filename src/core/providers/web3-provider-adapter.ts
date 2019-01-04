import { JsonRpcRequest, JsonRpcResponse } from "web3x/providers/jsonrpc";

import { BuidlerError, ERRORS } from "../errors";

import { IEthereumProvider } from "./ethereum";

export class Web3HTTPProviderAdapter {
  constructor(private provider: IEthereumProvider) {}

  public send(payload: any, callback: any) {
    throw new BuidlerError(ERRORS.NOT_SUPPORTED, "send");
  }
  public sendAsync(payload: JsonRpcRequest | JsonRpcRequest[], callback: any) {
    const requests = payload instanceof Array ? payload : [payload];

    requests.forEach(async request => {
      const resp: JsonRpcResponse = {
        id: request.id,
        jsonrpc: request.jsonrpc
      };
      try {
        const response = await this.provider.send(
          request.method,
          request.params
        );
        resp.result = response;
        callback(undefined, resp);
      } catch (error) {
        resp.error = {
          code: error.code,
          message: error.message
        };
        callback(resp);
      }
    });
  }

  public isConnected(): boolean {
    return true;
  }
}
