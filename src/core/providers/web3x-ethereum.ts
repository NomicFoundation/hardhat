import { callbackify } from "util";
import { JsonRpcRequest, JsonRpcResponse } from "web3x/providers/jsonrpc";
import { Callback, LegacyProvider } from "web3x/providers/legacy-provider";

import { IEthereumProvider } from "./ethereum";

export class EthereumWeb3xProvider implements LegacyProvider {
  constructor(private readonly provider: IEthereumProvider) {}

  public send(request: JsonRpcRequest, callback: Callback): any {
    callbackify((payload: JsonRpcRequest) =>
      this.provider.send(payload.method, payload.params).then(
        response => ({
          jsonrpc: payload.jsonrpc,
          id: payload.id,
          result: response
        }),
        error => ({
          jsonrpc: payload.jsonrpc,
          id: payload.id,
          error: {
            message: error.message,
            code: error.code,
            data: error.data
          }
        })
      )
    )(request, callback);
  }

  public disconnect() {}
}
