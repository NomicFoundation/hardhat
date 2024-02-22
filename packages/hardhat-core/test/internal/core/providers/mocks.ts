import { EventEmitter } from "events";

import {
  EIP1193Provider,
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
} from "../../../../src/types";

export class MockedProvider extends EventEmitter implements EIP1193Provider {
  // Record<methodName, value>
  private _returnValues: Record<string, any> = {};

  // Record<methodName, params>
  private _latestParams: Record<string, RequestArguments["params"]> = {};

  private _numberOfCalls: { [method: string]: number } = {};

  // If a lambda is passed as value, it's return value is used.
  public setReturnValue(method: string, value: any) {
    this._returnValues[method] = value;
  }

  public getNumberOfCalls(method: string): number {
    if (this._numberOfCalls[method] === undefined) {
      return 0;
    }

    return this._numberOfCalls[method];
  }

  public getLatestParams(method: string): any {
    return this._latestParams[method];
  }

  public getTotalNumberOfCalls(): number {
    return Object.values(this._numberOfCalls).reduce((p, c) => p + c, 0);
  }

  public async request({
    method,
    params = [],
  }: RequestArguments): Promise<any> {
    // stringify the params to make sure they are serializable
    JSON.stringify(params);

    this._latestParams[method] = params;

    if (this._numberOfCalls[method] === undefined) {
      this._numberOfCalls[method] = 1;
    } else {
      this._numberOfCalls[method] += 1;
    }

    let ret = this._returnValues[method];

    if (ret instanceof Function) {
      ret = ret();
    }

    return ret;
  }
}

export class EthereumMockedProvider
  extends EventEmitter
  implements EthereumProvider
{
  public async request(_args: RequestArguments): Promise<any> {}

  public async send(_method: string, _params: any[] = []) {}

  public sendAsync(
    _payload: JsonRpcRequest,
    callback: (error: any, response: JsonRpcResponse) => void
  ) {
    callback(null, {} as JsonRpcRequest); // this is here just to finish the "async" operation
  }
}
