import { EventEmitter } from "events";
import { promisify } from "util";
import { Provider } from "web3x/providers";
import { toPayload } from "web3x/request-manager/jsonrpc";

import { FixedJsonRPCResponse } from "../../types";

export interface IEthereumProvider extends EventEmitter {
  send(method: string, params?: any[]): Promise<any>;
  on(type: string, listener: (result: any) => void): this;
}

class EthereumProviderError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: number,
    public readonly data: any
  ) {
    super(message);
  }
}

export class EthereumProvider extends EventEmitter
  implements IEthereumProvider {
  constructor(private readonly provider: Provider) {
    super();
  }

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_requestAccounts") {
      throw new Error("'eth_requestAccounts' is not yet supported");
    }

    const payload = toPayload(method, params);

    const promisifiedSend = promisify(this.provider.send.bind(this.provider));

    const response = (await promisifiedSend(payload)) as FixedJsonRPCResponse;

    if (response.error === undefined) {
      return response.result;
    } else {
      const error = response.error;

      throw new EthereumProviderError(error.message, error.code, error.data);
    }
  }

  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Event listeners are not yet supported");
  }

  public once(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this {
    throw new Error("Event listeners are not yet supported");
  }
}
