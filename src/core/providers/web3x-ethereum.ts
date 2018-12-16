import { callbackify } from "util";
import { Callback, JsonRPCRequest, Provider } from "web3x/providers";

import { IEthereumProvider } from "./ethereum";

export class EthereumWeb3xProvider implements Provider {
  constructor(private readonly provider: IEthereumProvider) {}

  public send(request: JsonRPCRequest, callback: Callback): any {
    callbackify((payload: JsonRPCRequest) =>
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
    )(request, callback as any);
    // TODO: Remove the any form the above statement once this is fixed:
    // https://github.com/xf00f/web3x/issues/13
  }

  public disconnect() {}
}
