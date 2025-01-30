import type { JsonRpcRequestWrapperFunction } from "./network-manager.js";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  RequestArguments,
  SuccessfulJsonRpcResponse,
} from "../../../types/providers.js";
import type {
  Dispatcher,
  RequestOptions,
} from "@ignored/hardhat-vnext-utils/request";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { sleep, isObject } from "@ignored/hardhat-vnext-utils/lang";
import {
  getDispatcher,
  isValidUrl,
  postJsonRequest,
  shouldUseProxy,
  ConnectionRefusedError,
  RequestTimeoutError,
  ResponseStatusCodeError,
} from "@ignored/hardhat-vnext-utils/request";

import { EDR_NETWORK_REVERT_SNAPSHOT_EVENT } from "../../constants.js";
import { getHardhatVersion } from "../../utils/package.js";

import { BaseProvider } from "./base-provider.js";
import {
  getJsonRpcRequest,
  isFailedJsonRpcResponse,
  parseJsonRpcResponse,
} from "./json-rpc.js";
import { ProviderError, LimitExceededError } from "./provider-errors.js";

const TOO_MANY_REQUEST_STATUS = 429;
const MAX_RETRIES = 6;
const MAX_RETRY_WAIT_TIME_SECONDS = 5;

interface HttpProviderConfig {
  url: string;
  networkName: string;
  extraHeaders?: Record<string, string>;
  timeout: number;
  jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;
  testDispatcher?: Dispatcher;
}

export class HttpProvider extends BaseProvider {
  readonly #url: string;
  readonly #networkName: string;
  readonly #extraHeaders: Readonly<Record<string, string>>;
  readonly #jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction;

  #dispatcher: Dispatcher | undefined;
  #nextRequestId = 1;

  /**
   * Creates a new instance of `HttpProvider`.
   */
  public static async create({
    url,
    networkName,
    extraHeaders = {},
    timeout,
    jsonRpcRequestWrapper,
    testDispatcher,
  }: HttpProviderConfig): Promise<HttpProvider> {
    if (!isValidUrl(url)) {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.INVALID_URL, {
        value: url,
      });
    }

    const dispatcher =
      testDispatcher ?? (await getHttpDispatcher(url, timeout));

    const httpProvider = new HttpProvider(
      url,
      networkName,
      extraHeaders,
      dispatcher,
      jsonRpcRequestWrapper,
    );

    return httpProvider;
  }

  /**
   * @private
   *
   * This constructor is intended for internal use only.
   * Use the static method {@link HttpProvider.create} to create an instance of
   * `HttpProvider`.
   */
  private constructor(
    url: string,
    networkName: string,
    extraHeaders: Record<string, string>,
    dispatcher: Dispatcher,
    jsonRpcRequestWrapper?: JsonRpcRequestWrapperFunction,
  ) {
    super();

    this.#url = url;
    this.#networkName = networkName;
    this.#extraHeaders = extraHeaders;
    this.#dispatcher = dispatcher;
    this.#jsonRpcRequestWrapper = jsonRpcRequestWrapper;
  }

  public async request(
    requestArguments: RequestArguments,
  ): Promise<SuccessfulJsonRpcResponse["result"]> {
    if (this.#dispatcher === undefined) {
      throw new HardhatError(HardhatError.ERRORS.NETWORK.PROVIDER_CLOSED);
    }

    const { method, params } = requestArguments;

    const jsonRpcRequest = getJsonRpcRequest(
      this.#nextRequestId++,
      method,
      params,
    );

    let jsonRpcResponse: JsonRpcResponse;

    if (this.#jsonRpcRequestWrapper !== undefined) {
      jsonRpcResponse = await this.#jsonRpcRequestWrapper(
        jsonRpcRequest,
        (request) => this.#fetchJsonRpcResponse(request),
      );
    } else {
      jsonRpcResponse = await this.#fetchJsonRpcResponse(jsonRpcRequest);
    }

    if (isFailedJsonRpcResponse(jsonRpcResponse)) {
      const error = new ProviderError(
        jsonRpcResponse.error.message,
        jsonRpcResponse.error.code,
      );
      error.data = jsonRpcResponse.error.data;

      // eslint-disable-next-line no-restricted-syntax -- allow throwing ProviderError
      throw error;
    }

    if (jsonRpcRequest.method === "evm_revert") {
      this.emit(EDR_NETWORK_REVERT_SNAPSHOT_EVENT);
    }

    return jsonRpcResponse.result;
  }

  public async close(): Promise<void> {
    if (this.#dispatcher !== undefined) {
      // See https://github.com/nodejs/undici/discussions/3522#discussioncomment-10498734
      await this.#dispatcher.close();
      this.#dispatcher = undefined;
    }
  }

  async #fetchJsonRpcResponse(
    jsonRpcRequest: JsonRpcRequest,
    retryCount = 0,
  ): Promise<JsonRpcResponse> {
    const requestOptions: RequestOptions = {
      extraHeaders: {
        "User-Agent": `Hardhat ${await getHardhatVersion()}`,
        ...this.#extraHeaders,
      },
    };

    let response;
    try {
      response = await postJsonRequest(
        this.#url,
        jsonRpcRequest,
        requestOptions,
        this.#dispatcher,
      );
    } catch (e) {
      if (e instanceof ConnectionRefusedError) {
        throw new HardhatError(
          HardhatError.ERRORS.NETWORK.CONNECTION_REFUSED,
          { network: this.#networkName },
          e,
        );
      }

      if (e instanceof RequestTimeoutError) {
        throw new HardhatError(HardhatError.ERRORS.NETWORK.NETWORK_TIMEOUT, e);
      }

      /**
       * Nodes can have a rate limit mechanism to avoid abuse. This logic checks
       * if the response indicates a rate limit has been reached and retries the
       * request after the specified time.
       */
      if (
        e instanceof ResponseStatusCodeError &&
        e.statusCode === TOO_MANY_REQUEST_STATUS
      ) {
        const retryAfterHeader =
          isObject(e.headers) && typeof e.headers["retry-after"] === "string"
            ? e.headers["retry-after"]
            : undefined;
        const retryAfterSeconds = this.#getRetryAfterSeconds(
          retryAfterHeader,
          retryCount,
        );
        if (this.#shouldRetryRequest(retryAfterSeconds, retryCount)) {
          return this.#retry(jsonRpcRequest, retryAfterSeconds, retryCount);
        }

        // eslint-disable-next-line no-restricted-syntax -- allow throwing ProviderError
        throw new LimitExceededError(undefined, e);
      }

      throw e;
    }

    return parseJsonRpcResponse(await response.body.text());
  }

  #getRetryAfterSeconds(
    retryAfterHeader: string | undefined,
    retryCount: number,
  ) {
    const parsedRetryAfter = parseInt(`${retryAfterHeader}`, 10);
    if (isNaN(parsedRetryAfter)) {
      // use an exponential backoff if the retry-after header can't be parsed
      return Math.min(2 ** retryCount, MAX_RETRY_WAIT_TIME_SECONDS);
    }

    return parsedRetryAfter;
  }

  #shouldRetryRequest(retryAfterSeconds: number, retryCount: number) {
    if (retryCount > MAX_RETRIES) {
      return false;
    }

    if (retryAfterSeconds > MAX_RETRY_WAIT_TIME_SECONDS) {
      return false;
    }

    return true;
  }

  async #retry(
    request: JsonRpcRequest,
    retryAfterSeconds: number,
    retryCount: number,
  ) {
    await sleep(retryAfterSeconds);
    return this.#fetchJsonRpcResponse(request, retryCount + 1);
  }
}

/**
 * Gets either a pool or proxy dispatcher depending on the URL and the
 * environment variable `http_proxy`. This function is used internally by
 * `HttpProvider.create` and should not be used directly.
 */
export async function getHttpDispatcher(
  url: string,
  timeout?: number,
): Promise<Dispatcher> {
  let dispatcher: Dispatcher;

  if (process.env.http_proxy !== undefined && shouldUseProxy(url)) {
    dispatcher = await getDispatcher(url, {
      proxy: process.env.http_proxy,
      timeout,
    });
  } else {
    dispatcher = await getDispatcher(url, { pool: true, timeout });
  }

  return dispatcher;
}
