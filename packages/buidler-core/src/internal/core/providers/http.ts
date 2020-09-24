import { EventEmitter } from "events";

import { EIP1193Provider, RequestArguments } from "../../../types";
import {
  FailedJsonRpcResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  parseJsonResponse,
  SuccessfulJsonRpcResponse,
} from "../../util/jsonrpc";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

import { ProviderError } from "./errors";

function isErrorResponse(response: any): response is FailedJsonRpcResponse {
  return typeof response.error !== "undefined";
}

export class HttpProvider extends EventEmitter implements EIP1193Provider {
  private _nextRequestId = 1;

  constructor(
    private readonly _url: string,
    private readonly _networkName: string,
    private readonly _extraHeaders: { [name: string]: string } = {},
    private readonly _timeout = 20000
  ) {
    super();
  }

  get url(): string {
    return this._url;
  }

  public async request(args: RequestArguments): Promise<unknown> {
    // We create the error here to capture the stack traces at this point,
    // the async call that follows would probably loose of the stack trace
    const error = new ProviderError("HttpProviderError", -1);

    const jsonRpcRequest = this._getJsonRpcRequest(
      args.method,
      args.params as any[]
    );
    const jsonRpcResponse = await this._fetchJsonRpcResponse(jsonRpcRequest);

    if (isErrorResponse(jsonRpcResponse)) {
      error.message = jsonRpcResponse.error.message;
      error.code = jsonRpcResponse.error.code;
      error.data = jsonRpcResponse.error.data;
      // tslint:disable-next-line only-hardhat-error
      throw error;
    }

    return jsonRpcResponse.result;
  }

  /**
   * Sends a batch of requests. Fails if any of them fails.
   */
  public async sendBatch(
    batch: Array<{ method: string; params: any[] }>
  ): Promise<any[]> {
    // We create the errors here to capture the stack traces at this point,
    // the async call that follows would probably loose of the stack trace
    const error = new ProviderError("HttpProviderError", -1);

    const requests = batch.map((r) =>
      this._getJsonRpcRequest(r.method, r.params)
    );

    const jsonRpcResponses = await this._fetchJsonRpcResponse(requests);

    for (const response of jsonRpcResponses) {
      if (isErrorResponse(response)) {
        error.message = response.error.message;
        error.code = response.error.code;
        error.data = response.error.data;
        // tslint:disable-next-line only-hardhat-error
        throw error;
      }
    }

    // We already know that it has this type, but TS can't infer it.
    const responses = jsonRpcResponses as SuccessfulJsonRpcResponse[];

    return responses.map((response) => response.result);
  }

  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest
  ): Promise<JsonRpcResponse>;
  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest[]
  ): Promise<JsonRpcResponse[]>;
  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest | JsonRpcRequest[]
  ): Promise<JsonRpcResponse | JsonRpcResponse[]> {
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
        throw new HardhatError(
          ERRORS.NETWORK.NODE_IS_NOT_RUNNING,
          { network: this._networkName },
          error
        );
      }

      if (error.type === "request-timeout") {
        throw new HardhatError(ERRORS.NETWORK.NETWORK_TIMEOUT, {}, error);
      }

      // tslint:disable-next-line only-hardhat-error
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
