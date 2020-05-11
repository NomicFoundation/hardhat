import { EventEmitter } from "events";

import {
  FailedJsonRpcResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  parseJsonResponse,
} from "../../util/jsonrpc";
import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

interface ProviderError extends Error {
  code?: number;
  data?: any;
}

function isErrorResponse(response: any): response is FailedJsonRpcResponse {
  return typeof response.error !== "undefined";
}

export class HttpProvider extends EventEmitter {
  private _nextRequestId = 1;

  constructor(
    private readonly _url: string,
    private readonly _networkName: string,
    private readonly _extraHeaders: { [name: string]: string } = {},
    private readonly _timeout = 20000
  ) {
    super();
  }

  public async send(method: string, params?: any[]): Promise<any> {
    // We create the error here to capture the stack traces at this point,
    // the async call that follows would probably loose of the stack trace
    const error: ProviderError = new Error();

    const jsonRpcRequest = this._getJsonRpcRequest(method, params);
    const jsonRpcResponse = await this._fetchJsonRpcResponse(jsonRpcRequest);

    if (isErrorResponse(jsonRpcResponse)) {
      error.message = jsonRpcResponse.error.message;
      error.code = jsonRpcResponse.error.code;
      error.data = jsonRpcResponse.error.data;
      // tslint:disable-next-line only-buidler-error
      throw error;
    }

    return jsonRpcResponse.result;
  }

  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse> {
    const { default: fetch } = await import("node-fetch");

    try {
      const response = await fetch(this._url, {
        method: "POST",
        body: JSON.stringify(request),
        redirect: "follow",
        timeout: this._timeout,
        headers: {
          "Content-Type": "application/json",
          ...this._extraHeaders,
        },
      });

      return parseJsonResponse(await response.text());
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        throw new BuidlerError(
          ERRORS.NETWORK.NODE_IS_NOT_RUNNING,
          { network: this._networkName },
          error
        );
      }

      if (error.type === "request-timeout") {
        throw new BuidlerError(ERRORS.NETWORK.NETWORK_TIMEOUT, {}, error);
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
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
