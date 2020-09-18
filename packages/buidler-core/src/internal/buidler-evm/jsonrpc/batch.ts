import { JsonRpcRequest } from "../../util/jsonrpc";

import { HttpRequestService } from "./http";

type BatchJsonRpcRequest = JsonRpcRequest[];
type ResolveFunction = (value?: unknown) => void;
type RejectFunction = (error?: any) => void;

interface DeferredRequest {
  body: JsonRpcRequest;
  resolve: RejectFunction;
  reject: RejectFunction;
}

export class JsonRpcRequestBatcher {
  private _deferredRequests: DeferredRequest[] = [];
  private _nextRequestId = 1;

  constructor(
    private readonly _httpService: HttpRequestService,
    private readonly _batchingTime: number
  ) {}

  public send(method: string, params?: any[]): Promise<any> {
    const request = this._getJsonRpcRequest(method, params);
    return this._deferSend(request);
  }

  private _deferSend(request: JsonRpcRequest) {
    return new Promise((resolve, reject) => {
      this._deferredRequests.push({ body: request, resolve, reject });

      if (this._deferredRequests.length === 1) {
        setTimeout(this._performSend.bind(this), this._batchingTime);
      }
    });
  }

  private async _performSend() {
    const requests = this._deferredRequests.map((req) => req.body);
    const resolves = this._deferredRequests.map((req) => req.resolve);
    const rejects = this._deferredRequests.map((req) => req.reject);
    this._deferredRequests = [];
    try {
      const responses = await this._httpService.send(requests);
      for (let i = 0; i < responses.length; i++) {
        if (responses[i] instanceof Error) {
          rejects[i](responses[i]);
        } else {
          resolves[i](responses[i]);
        }
      }
    } catch (e) {
      for (const reject of rejects) {
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
