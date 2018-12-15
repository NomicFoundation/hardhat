import { EventEmitter } from "events";
import { promisify } from "util";
import { JsonRPCResponse, Provider } from "web3x/providers";
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

    const promisifiedSend = promisify(this._provider.send.bind(this._provider));

    const response: JsonRPCResponse = await promisifiedSend(payload);
    if (response.error === undefined) {
      return response.result;
    } else {
      throw Error(response.error);
    }
  }
}
export interface IEthereumProvider extends EventEmitter {
  send(method: string, params?: any[]): Promise<any>;
  on(type: string, listener: (result: any) => void): this;
}
