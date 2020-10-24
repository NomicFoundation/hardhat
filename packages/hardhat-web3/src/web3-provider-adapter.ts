import { EthereumProvider } from "hardhat/types";
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

export class Web3HTTPProviderAdapter {
  private readonly _provider: EthereumProvider;

  constructor(provider: EthereumProvider) {
    this._provider = provider;
    // We bind everything here because some test suits break otherwise
    this.send = this.send.bind(this) as any;
    this.isConnected = this.isConnected.bind(this) as any;
    this._sendJsonRpcRequest = this._sendJsonRpcRequest.bind(this) as any;
  }

  public send(
    payload: JsonRpcRequest,
    callback: (error: Error | null, response?: JsonRpcResponse) => void
  ): void;
  public send(
    payload: JsonRpcRequest[],
    callback: (error: Error | null, response?: JsonRpcResponse[]) => void
  ): void;
  public send(
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
      jsonrpc: "2.0",
    };

    try {
      const result = await this._provider.send(request.method, request.params);
      response.result = result;
    } catch (error) {
      if (error.code === undefined) {
        throw error;
      }

      response.error = {
        code: error.code ? +error.code : 404,
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
