import type { default as nodeFetch } from "node-fetch";

import { BuidlerError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";
import {
  JsonRpcRequest,
  parseBatchJsonResponse,
  SuccessfulJsonRpcResponse,
} from "../../util/jsonrpc";

type ResultOrError = any | Error;

export interface HttpRequestService {
  send(request: JsonRpcRequest[]): Promise<ResultOrError[]>;
}

export class BatchHttpRequestService implements HttpRequestService {
  constructor(
    private readonly _fetch: typeof nodeFetch,
    private readonly _url: string,
    private readonly _timeout: number
  ) {}

  public async send(request: JsonRpcRequest[]): Promise<ResultOrError[]> {
    try {
      const response = await this._fetch(this._url, {
        method: "POST",
        body: JSON.stringify(request),
        redirect: "follow",
        timeout: this._timeout,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const jsonResponse = parseBatchJsonResponse(await response.text());
      return jsonResponse.map(
        (res) => (res as SuccessfulJsonRpcResponse).result
      );
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        throw new BuidlerError(ERRORS.NETWORK.NODE_IS_NOT_RUNNING, {}, error);
      }

      if (error.type === "request-timeout") {
        throw new BuidlerError(ERRORS.NETWORK.NETWORK_TIMEOUT, {}, error);
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
    }
  }
}
