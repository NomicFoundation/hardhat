import util from "util";

import {
  EIP1193Provider,
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
} from "../../../types";
import { EventEmitterWrapper } from "../../util/event-emitter";

/**
 * Hardhat predates the EIP1193 (Javascript Ethereum Provider) standard. It was
 * built following a draft of that spec, but then it changed completely. We
 * still need to support the draft api, but internally we use EIP1193. So we
 * use BackwardsCompatibilityProviderAdapter to wrap EIP1193 providers before
 * exposing them to the user.
 */
export class BackwardsCompatibilityProviderAdapter
  extends EventEmitterWrapper
  implements EthereumProvider
{
  constructor(private readonly _provider: EIP1193Provider) {
    super(_provider);
    // We bind everything here because some test suits break otherwise
    this.sendAsync = this.sendAsync.bind(this) as any;
    this.send = this.send.bind(this) as any;
    this._sendJsonRpcRequest = this._sendJsonRpcRequest.bind(this) as any;
  }

  public request(args: RequestArguments): Promise<unknown> {
    return this._provider.request(args);
  }

  public send(method: string, params?: any[]): Promise<any> {
    return this._provider.request({ method, params });
  }

  public sendAsync(
    payload: JsonRpcRequest,
    callback: (error: any, response: JsonRpcResponse) => void
  ): void {
    util.callbackify(() => this._sendJsonRpcRequest(payload))(callback);
  }

  private async _sendJsonRpcRequest(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    const response: JsonRpcResponse = {
      id: request.id,
      jsonrpc: "2.0",
    };

    try {
      response.result = await this._provider.request({
        method: request.method,
        params: request.params,
      });
    } catch (error) {
      if (error.code === undefined) {
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw error;
      }

      response.error = {
        code: error.code ? +error.code : -1,
        message: error.message,
        data: {
          stack: error.stack,
          name: error.name,
        },
      };
    }

    return response;
  }
}
