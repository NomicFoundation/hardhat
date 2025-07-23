import type {
  EIP1193Provider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
} from "hardhat/types/providers";

import EventEmitter from "node:events";

/**
 * Mock implementation of the hardhat `provider`.
 * This mock allows overriding the return value of the `request` method, and provides
 * utilities to inspect the number of calls and the arguments passed to `request`.
 */

export class EthereumMockedProvider
  extends EventEmitter
  implements EIP1193Provider
{
  // Record<methodName, value>
  readonly #returnValues: Record<string, unknown> = {};

  readonly #latestParams: Record<string, RequestArguments["params"]> = {};

  readonly #numberOfCalls: { [method: string]: number } = {};

  // If a lambda is passed as value, it's return value is used.
  public setReturnValue(method: string, value: any): void {
    this.#returnValues[method] = value;
  }

  public getNumberOfCalls(method: string): number {
    if (this.#numberOfCalls[method] === undefined) {
      return 0;
    }

    return this.#numberOfCalls[method];
  }

  public getLatestParams(method: string): any {
    return this.#latestParams[method];
  }

  public getTotalNumberOfCalls(): number {
    return Object.values(this.#numberOfCalls).reduce((p, c) => p + c, 0);
  }

  public async request({
    method,
    params = [],
  }: RequestArguments): Promise<any> {
    // stringify the params to make sure they are serializable
    JSON.stringify(params);

    this.#latestParams[method] = params;

    if (this.#numberOfCalls[method] === undefined) {
      this.#numberOfCalls[method] = 1;
    } else {
      this.#numberOfCalls[method] += 1;
    }

    let ret = this.#returnValues[method];

    if (ret instanceof Function) {
      ret = ret();
    }

    return ret;
  }

  public send(_method: string, _params?: unknown[]): Promise<unknown> {
    return Promise.resolve(null);
  }

  public sendAsync(
    _jsonRpcRequest: JsonRpcRequest,
    _callback: (error: any, jsonRpcResponse: JsonRpcResponse) => void,
  ): void {}

  public async close(): Promise<void> {}
}
