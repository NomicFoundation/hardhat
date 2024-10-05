import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
} from "../../../types/providers.js";

import EventEmitter from "node:events";
import util from "node:util";

import { ensureError } from "@ignored/hardhat-vnext-utils/error";

export class EdrProvider extends EventEmitter implements EthereumProvider {
  public static async create({}: {}): Promise<EdrProvider> {
    const edrProvider = new EdrProvider();

    return edrProvider;
  }

  constructor() {
    super();
  }

  public async request(_requestArguments: RequestArguments): Promise<unknown> {
    return null;
  }

  public async close(): Promise<void> {}

  public async send(method: string, params?: unknown[]): Promise<unknown> {
    return this.request({ method, params });
  }

  public sendAsync(
    jsonRpcRequest: JsonRpcRequest,
    callback: (error: any, jsonRpcResponse: JsonRpcResponse) => void,
  ): void {
    // TODO: this is a straight copy of the HTTP Provider,
    // can we pull this out and share the logic.
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
        ensureError(error);

        if (!("code" in error) || error.code === undefined) {
          throw error;
        }

        /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        -- Allow string interpolation of unknown `error.code`. It will be converted
        to a number, and we will handle NaN cases appropriately afterwards. */
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
