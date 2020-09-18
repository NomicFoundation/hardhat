import { JsonRpcRequest, JsonRpcResponse } from "../../util/jsonrpc";

type BatchJsonRpcRequest = JsonRpcRequest[];
type BatchJsonRpcResponse = JsonRpcResponse[];
type ResolveFunction = (value?: unknown) => void;
type RejectFunction = (error?: any) => void;
type DeferredRequest = [JsonRpcRequest, ResolveFunction, RejectFunction];

export interface HttpRequestService {
  send(request: BatchJsonRpcRequest): Promise<BatchJsonRpcResponse>;
}

export class JsonRpcRequestBatcher {
  private _deferredRequests: DeferredRequest[] = [];
  private _nextRequestId = 1;

  constructor(
    private readonly _httpService: HttpRequestService,
    private readonly _batchingTime: number
  ) {
  }

  public send(method: string, params?: any[]): Promise<any> {
    const request = this._getJsonRpcRequest(method, params);
    return this._deferSend(request);
  }

  private _deferSend(request: JsonRpcRequest) {
    return new Promise((resolve, reject) => {
      this._deferredRequests.push([request, resolve, reject]);

      if (this._deferredRequests.length === 1) {
        setTimeout(this._performSend.bind(this), this._batchingTime);
      }
    });
  }

  private async _performSend() {
    const requests = this._deferredRequests.map((req) => req[0]);
    const resolveFunctions = this._deferredRequests.map((req) => req[1]);
    const rejectFunctions = this._deferredRequests.map((req) => req[2]);
    this._deferredRequests = [];
    try {
      const responses = await this._httpService.send(requests);
      for (let i = 0; i < resolveFunctions.length; i++) {
        resolveFunctions[i](responses[i]);
      }
    } catch (e) {
      for (const reject of rejectFunctions) {
        reject(e);
      }
    }
  }

  private _getJsonRpcRequest(
    method: string,
    params: any[] = []
  ): JsonRpcRequest {
    return {
      jsonrpc: "2.0",
      method,
      params,
      id: this._nextRequestId++,
    };
  }
}
