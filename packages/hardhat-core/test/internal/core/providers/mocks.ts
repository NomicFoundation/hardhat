import { EventEmitter } from "events";

import { EIP1193Provider, RequestArguments } from "../../../../src/types";

export class MockedProvider extends EventEmitter implements EIP1193Provider {
  private _returnValues: any = {};
  private _latestParams: any = {};
  private _numberOfCalls: { [call: string]: number } = {};

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
