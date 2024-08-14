import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from "../internal/network/utils/json-rpc.js";
import type EventEmitter from "node:events";

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

export interface EIP1193Provider extends EventEmitter {
  request(args: RequestArguments): Promise<unknown>;
}

export interface EthereumProvider extends EIP1193Provider {
  send(method: string, params?: unknown[]): Promise<unknown>;
  sendAsync(
    jsonRpcRequest: JsonRpcRequest,
    callback: (error: any, jsonRpcResponse: JsonRpcResponse) => void,
  ): void;
}
