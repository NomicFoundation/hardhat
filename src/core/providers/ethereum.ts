import { EventEmitter } from "events";
import { Provider } from "web3x/providers";
import { toPayload } from "web3x/request-manager/jsonrpc";

export class EthereumProvider extends EventEmitter
  implements IEthereumProvider {
  private readonly _provider: Provider;
  constructor(provider: Provider, options?: any) {
    super();
    this._provider = provider;
  }

  public async send(method: string, params?: any[]): Promise<any> {
    const payload = toPayload(method, params);

    return new Promise((resolve, reject) => {
      this._provider.send(payload, (err, response) => {
        if (err !== undefined) {
          reject(err);
        }
        if (response !== undefined && response.error !== undefined) {
          reject(new Error(response.result.error));
        }
        if (response !== undefined && response.result !== undefined) {
          resolve(response.result);
        }
      });
    });
  }
}
export interface IEthereumProvider {
  send(method: string, params?: any[]): Promise<any>;
  on(type: string, listener: (result: any) => void): this;
}
