import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { IEthereumProvider } from "@nomiclabs/buidler/types";
import util from "util";

export interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

export interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JsonRpcError extends Error {
  code?: string;
}

export class Web3HTTPProviderAdapter {
  private readonly _provider: IEthereumProvider;

  constructor(provider: IEthereumProvider) {
    this._provider = provider;

    // We bind everything here because some test suits break otherwise
    this.sendAsync = this.sendAsync.bind(this) as any;
    this.send = this.send.bind(this) as any;
    this.isConnected = this.isConnected.bind(this) as any;
    this._sendJsonRpcRequest = this._sendJsonRpcRequest.bind(this) as any;
  }

  public send(payload?: Partial<JsonRpcRequest>) {
    if (payload && payload.method) {
      throw new BuidlerPluginError(
        `Trying to call RPC method ${
          payload.method
        }, but synchronous requests are not supported, use pweb3 instead`
      );
    }

    throw new BuidlerPluginError(
      "Synchronous requests are not supported, use pweb3 instead"
    );
  }

  public sendAsync(
    payload: JsonRpcRequest,
    callback: (error: Error | null, response?: JsonRpcResponse) => void
  ): void;
  public sendAsync(
    payload: JsonRpcRequest[],
    callback: (error: Error | null, response?: JsonRpcResponse[]) => void
  ): void;
  public sendAsync(
    payload: JsonRpcRequest | JsonRpcRequest[],
    callback: (error: Error | null, response?: any) => void
  ): void {
    if (!Array.isArray(payload)) {
      util.callbackify(() => this._sendJsonRpcRequest(payload))(callback);
      return;
    }

    util.callbackify(async () => {
      const responses: JsonRpcResponse[] = [];

      for (const request of payload) {
        const response = await this._sendJsonRpcRequest(request);

        responses.push(response);

        if (response.error !== undefined) {
          break;
        }
      }

      return responses;
    })(callback);
  }

  public isConnected(): boolean {
    return true;
  }

  private async _sendJsonRpcRequest(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    const response: JsonRpcResponse = {
      id: request.id,
      jsonrpc: "2.0"
    };

    try {
      const result = await this._provider.send(request.method, request.params);
      response.result = result;
    } catch (error) {
      response.error = {
        code: error.code ? +error.code : 404,
        message: error.message,
        data: {
          stack: error.stack,
          name: error.name
        }
      };
    }

    return response;
  }
}
