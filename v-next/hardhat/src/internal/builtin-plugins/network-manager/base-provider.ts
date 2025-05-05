import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "../../../types/providers.js";

import EventEmitter from "node:events";
import util from "node:util";

import { ensureNodeErrnoExceptionError } from "@nomicfoundation/hardhat-utils/error";

export abstract class BaseProvider
  extends EventEmitter
  implements EthereumProvider
{
  public abstract request(
    requestArguments: RequestArguments,
  ): Promise<SuccessfulJsonRpcResponse["result"]>;
  public abstract close(): Promise<void>;

  public send(
    method: string,
    params?: unknown[],
  ): Promise<SuccessfulJsonRpcResponse["result"]> {
    return this.request({ method, params });
  }

  public sendAsync(
    jsonRpcRequest: JsonRpcRequest,
    callback: (error: any, jsonRpcResponse: JsonRpcResponse) => void,
  ): void {
    const handleJsonRpcRequest = async () => {
      let jsonRpcResponse: JsonRpcResponse;
      try {
        const result = await this.request({
          method: jsonRpcRequest.method,
          params: jsonRpcRequest.params,
        });
        jsonRpcResponse = {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          result,
        };
      } catch (error) {
        ensureNodeErrnoExceptionError(error);
        const errorCode = parseInt(`${error.code}`, 10);
        jsonRpcResponse = {
          jsonrpc: "2.0",
          id: jsonRpcRequest.id,
          error: {
            code: !isNaN(errorCode) ? errorCode : -1,
            message: error.message,
            data: {
              stack: error.stack,
              name: error.name,
            },
          },
        };
      }

      return jsonRpcResponse;
    };

    util.callbackify(handleJsonRpcRequest)(callback);
  }
}
