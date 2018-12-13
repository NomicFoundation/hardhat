import { EventEmitter } from "events";
import { Provider } from "web3x/providers";
import { toPayload } from "web3x/request-manager/jsonrpc";

export class EthereumProvider extends EventEmitter
  implements IEthereumProvider {
  private readonly _provider: Provider;
  constructor(provider: Provider) {
    super();
    this._provider = provider;
  }

  public async send(method: string, params?: any[]): Promise<any> {
    const payload = toPayload(method, params);

    return new Promise((resolve, reject) => {
      this._provider.send(payload, (err, response) => {
        if (response !== undefined) {
          if (response.error === undefined) {
            resolve(response.result);
          } else {
            reject(new Error(response.error));
          }
        }
        if (err !== undefined) {
          reject(err);
        }
        // response and error are undefined, this should never happen
        reject(new Error("There was no response nor error"));
      });
    });
  }
}
export interface IEthereumProvider {
  send(method: string, params?: any[]): Promise<any>;
  on(type: string, listener: (result: any) => void): this;
}
