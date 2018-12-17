import { EventEmitter } from "events";

import { IEthereumProvider } from "../../../src/core/providers/ethereum";

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
