import { IEthereumProvider } from "@nomiclabs/buidler/types";
import { JsonRpcProvider } from "ethers/providers";

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

let nextId = 1;

// This can be avoided if the ethers' request creation is extracted to another method.
function createJsonRpcRequest(
  method: string,
  params: any[] = []
): JsonRpcRequest {
  return {
    id: nextId++,
    jsonrpc: "2.0",
    method,
    params
  };
}

export class EthersProviderWrapper extends JsonRpcProvider {
  constructor(private readonly provider: IEthereumProvider) {
    super();
  }

  public async send(method: string, params: any): Promise<JsonRpcResponse> {
    const result = await this.provider.send(method, params);

    // We replicate ethers' behavior.
    this.emit("debug", {
      action: "send",
      request: createJsonRpcRequest(method, params),
      response: result,
      provider: this
    });

    return result;
  }
}
