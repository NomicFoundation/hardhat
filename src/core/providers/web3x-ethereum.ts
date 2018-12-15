import { Callback, JsonRPCRequest, Provider } from "web3x/providers";

import { IEthereumProvider } from "./ethereum";

export class EthereumWeb3xProvider implements Provider {
  private readonly _provider: IEthereumProvider;

  constructor(provider: IEthereumProvider) {
    this._provider = provider;
  }

  public send(payload: JsonRPCRequest, callback: Callback): any {
    this._provider.send(payload.method, payload.params).then(
      response => {
        callback(undefined, {
          result: response,
          jsonrpc: payload.jsonrpc,
          id: payload.id
        });
      },
      error => {
        callback(error, undefined);
      }
    );
  }

  public disconnect() {}
}
