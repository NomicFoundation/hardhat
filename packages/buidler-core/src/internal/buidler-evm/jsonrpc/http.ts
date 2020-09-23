import type { default as nodeFetch } from "node-fetch";

import { BuidlerError } from "../../core/errors";
import { ERRORS } from "../../core/errors-list";
import {
  isSuccessfulJsonResponse,
  JsonRpcRequest,
  parseBatchJsonResponse,
} from "../../util/jsonrpc";

type ResultOrError = unknown | Error;

interface RpcError extends Error {
  code?: number;
  data?: any;
}

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
    // We create the error here to capture the stack traces at this point,
    // the async call that follows would probably loose of the stack trace
    const errors: RpcError[] = request.map(() => new Error());

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

      const text = await response.text();
      const jsonResponse = parseBatchJsonResponse(text);
      const orderedResponse = request.map(({ id }) => {
        const matched = jsonResponse.find((el) => el.id === id);
        if (matched === undefined) {
          throw new BuidlerError(ERRORS.NETWORK.INVALID_JSON_RESPONSE, {
            response: text,
          });
        }
        return matched;
      });
      return orderedResponse.map((res, i) => {
        if (isSuccessfulJsonResponse(res)) {
          return res.result;
        }
        const error = errors[i];
        error.message = res.error.message;
        error.code = res.error.code;
        error.data = res.error.data;
        return error;
      });
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
