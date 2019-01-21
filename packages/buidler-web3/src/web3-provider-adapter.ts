import { BuidlerPluginError } from "buidler/plugins";
import { IEthereumProvider } from "buidler/types";
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
  constructor(private readonly provider: IEthereumProvider) {}

  // public send(payload: any) {
  //   throw new BuidlerPluginError("Synchronous requests are not supported");
  // }

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
      util.callbackify(() => this.sendJsonRpcRequest(payload))(callback);
      return;
    }

    util.callbackify(async () => {
      const responses: JsonRpcResponse[] = [];

      for (const request of payload) {
        const response = await this.sendJsonRpcRequest(request);

        responses.push(response);

        if (response.error) {
          break;
        }
      }

      return responses;
    })(callback);
  }

  public isConnected(): boolean {
    return true;
  }

  private async sendJsonRpcRequest(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    const response: JsonRpcResponse = {
      id: request.id,
      jsonrpc: "2.0"
    };

    try {
      const result = await this.provider.send(request.method, request.params);
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
