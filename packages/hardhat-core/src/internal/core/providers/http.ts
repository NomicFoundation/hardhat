import { EventEmitter } from "events";
import type { Response } from "node-fetch";

import { EIP1193Provider, RequestArguments } from "../../../types";
import {
  HARDHAT_NETWORK_RESET_EVENT,
  HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT,
} from "../../constants";
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

const MAX_RETRIES = 6;
const MAX_RETRY_AWAIT_SECONDS = 5;

const TOO_MANY_REQUEST_STATUS = 429;

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

  public get url(): string {
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
      // eslint-disable-next-line @nomiclabs/only-hardhat-error
      throw error;
    }

    if (args.method === "hardhat_reset") {
      this.emit(HARDHAT_NETWORK_RESET_EVENT);
    }
    if (args.method === "evm_revert") {
      this.emit(HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT);
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

    // we need this to sort the responses
    const idToIndexMap: Record<string, number> = {};

    const requests = batch.map((r, i) => {
      const jsonRpcRequest = this._getJsonRpcRequest(r.method, r.params);
      idToIndexMap[jsonRpcRequest.id] = i;
      return jsonRpcRequest;
    });

    const jsonRpcResponses = await this._fetchJsonRpcResponse(requests);

    for (const response of jsonRpcResponses) {
      if (isErrorResponse(response)) {
        error.message = response.error.message;
        error.code = response.error.code;
        error.data = response.error.data;
        // eslint-disable-next-line @nomiclabs/only-hardhat-error
        throw error;
      }
    }

    // We already know that it has this type, but TS can't infer it.
    const responses = jsonRpcResponses as SuccessfulJsonRpcResponse[];

    // we use the id to sort the responses so that they match the order of the requests
    const sortedResponses = responses
      .map(
        (response) =>
          [idToIndexMap[response.id], response.result] as [number, any]
      )
      .sort(([indexA], [indexB]) => indexA - indexB)
      .map(([, result]) => result);

    return sortedResponses;
  }

  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest,
    retryNumber?: number
  ): Promise<JsonRpcResponse>;
  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest[],
    retryNumber?: number
  ): Promise<JsonRpcResponse[]>;
  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest | JsonRpcRequest[],
    retryNumber?: number
  ): Promise<JsonRpcResponse | JsonRpcResponse[]>;
  private async _fetchJsonRpcResponse(
    request: JsonRpcRequest | JsonRpcRequest[],
    retryNumber = 0
  ): Promise<JsonRpcResponse | JsonRpcResponse[]> {
    const { default: fetch } = await import("node-fetch");

    try {
      const response = await fetch(this._url, {
        method: "POST",
        body: JSON.stringify(request),
        redirect: "follow",
        timeout:
          process.env.DO_NOT_SET_THIS_ENV_VAR____IS_HARDHAT_CI !== undefined
            ? 0
            : this._timeout,
        headers: {
          "Content-Type": "application/json",
          ...this._extraHeaders,
        },
      });

      if (this._isRateLimitResponse(response)) {
        // Consume the response stream and discard its result
        // See: https://github.com/node-fetch/node-fetch/issues/83
        const _discarded = await response.text();

        const seconds = this._getRetryAfterSeconds(response);
        if (seconds !== undefined && this._shouldRetry(retryNumber, seconds)) {
          return await this._retry(request, seconds, retryNumber);
        }

        const url = new URL(this._url);

        // eslint-disable-next-line @nomiclabs/only-hardhat-error
        throw new ProviderError(
          `Too Many Requests error received from ${url.hostname}`,
          -32005 // Limit exceeded according to EIP1474
        );
      }

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

      // eslint-disable-next-line @nomiclabs/only-hardhat-error
      throw error;
    }
  }

  private async _retry(
    request: JsonRpcRequest | JsonRpcRequest[],
    seconds: number,
    retryNumber: number
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
    return this._fetchJsonRpcResponse(request, retryNumber + 1);
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

  private _shouldRetry(retryNumber: number, retryAfterSeconds: number) {
    if (retryNumber > MAX_RETRIES) {
      return false;
    }

    if (retryAfterSeconds > MAX_RETRY_AWAIT_SECONDS) {
      return false;
    }

    return true;
  }

  private _isRateLimitResponse(response: Response) {
    return response.status === TOO_MANY_REQUEST_STATUS;
  }

  private _getRetryAfterSeconds(response: Response): number | undefined {
    const header = response.headers.get("Retry-After");

    if (header === undefined || header === null) {
      return undefined;
    }

    const parsed = parseInt(header, 10);
    if (isNaN(parsed)) {
      return undefined;
    }

    return parsed;
  }
}
