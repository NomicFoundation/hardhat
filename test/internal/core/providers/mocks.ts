import { EventEmitter } from "events";

import { IEthereumProvider } from "../../../../src/types";

export class MethodReturningProvider extends EventEmitter
  implements IEthereumProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    return method;
  }
}

export class ParamsReturningProvider extends EventEmitter
  implements IEthereumProvider {
  public async send(method: string, params?: any[]): Promise<any> {
    return params;
  }
}

export class CountProvider extends EventEmitter implements IEthereumProvider {
  public transactionsCountParams: any[] | undefined = undefined;
  public numberOfCallsToNetVersion: number = 0;

  public async send(method: string, params?: any[]): Promise<any> {
    if (method === "eth_getTransactionCount") {
      this.transactionsCountParams = params;
      return 0x08;
    }

    if (method === "net_version") {
      this.numberOfCallsToNetVersion += 1;
      return 123;
    }

    if (method === "eth_accounts") {
      return [];
    }

    return params;
  }
}
