import { EventEmitter } from "events";
import { Callback, JsonRPCRequest, Provider } from "web3x/providers";

import { IEthereumProvider } from "./ethereum";

export class EthereumWeb3xProvider extends EventEmitter implements Provider {
  private readonly _provider: IEthereumProvider;

  constructor(provider: IEthereumProvider) {
    super();
    this._provider = provider;
  }

  public send(payload: JsonRPCRequest, callback: Callback): any {
    this._provider
      .send(payload.method, payload.params)
      .then(response => {
        callback(undefined, response);
      })
      .catch(error => {
        callback(error, undefined);
      });
  }

  public disconnect() {}
}
