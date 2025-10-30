import type EventEmitter from "node:events";
import type { ParsedUrlQueryInput } from "node:querystring";
import type UndiciT from "undici";

import fs from "node:fs";
import querystring from "node:querystring";
import stream from "node:stream/promises";

import { ensureError } from "./error.js";
import {
  DownloadError,
  RequestError,
  DispatcherError,
} from "./errors/request.js";
import { move } from "./fs.js";
import {
  generateTempFilePath,
  getBaseDispatcherOptions,
  getBaseRequestOptions,
  getBasicDispatcher,
  getPoolDispatcher,
  getProxyDispatcher,
  handleError,
} from "./internal/request.js";

export const DEFAULT_TIMEOUT_IN_MILLISECONDS = 300_000; // Aligned with unidici
export const DEFAULT_MAX_REDIRECTS = 10;
export const DEFAULT_POOL_MAX_CONNECTIONS = 128;
export const DEFAULT_USER_AGENT = "Hardhat";

export type Dispatcher = UndiciT.Dispatcher;
export type TestDispatcher = UndiciT.MockAgent;
export type Interceptable = UndiciT.Interceptable;

/**
 * Options to configure the dispatcher.
 *
 * @param timeout The timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT_IN_MILLISECONDS}.
 * @param proxy The proxy to use. If not provided, no proxy is used.
 * @param pool Whether to use a pool dispatcher. Defaults to `false`.
 * @param maxConnections The maximum number of connections to use in the pool. Defaults to {@link DEFAULT_POOL_MAX_CONNECTIONS}.
 * @param isTestDispatcher Whether to use a test dispatcher. Defaults to `false`. It's highly recommended to use a test dispatcher in tests to avoid hanging tests.
 */
export interface DispatcherOptions {
  timeout?: number;
  proxy?: string;
  pool?: boolean;
  maxConnections?: number;
  isTestDispatcher?: boolean;
}

/**
 * Options to configure a request.
 *
 * @param queryParams The query parameters to append to the url.
 * @param extraHeaders Additional headers to include in the request.
 * @param abortSignal The signal to abort the request.
 */
export interface RequestOptions {
  queryParams?: Record<string, any>;
  extraHeaders?: Record<string, string>;
  abortSignal?: AbortSignal | EventEmitter;
}

export interface HttpResponse {
  statusCode: number;
  body: {
    json(): Promise<any>;
    text(): Promise<string>;
  };
}

/**
 * Performs a HTTP request.
 *
 * @param url The url to make the request to.
 * @param requestOptions The options to configure the request. See {@link RequestOptions}.
 * @param dispatcherOrDispatcherOptions Either a dispatcher or dispatcher options. See {@link DispatcherOptions}.
 * @returns An object containing the status code and the response body. The body can be accessed as JSON or text.
 * `body` can not be consumed twice. For example, calling `text()` after `json()` throws `TypeError`.
 * @throws ConnectionRefusedError If the connection is refused by the server.
 * @throws RequestTimeoutError If the request times out.
 * @throws RequestError If the request fails for any other reason.
 */
export async function getRequest(
  url: string,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<HttpResponse> {
  const { request } = await import("undici");

  try {
    const baseRequestOptions = await getBaseRequestOptions(
      url,
      requestOptions,
      dispatcherOrDispatcherOptions,
    );
    return await request(url, {
      method: "GET",
      ...baseRequestOptions,
    });
  } catch (e) {
    ensureError(e);

    handleError(e, url);

    throw new RequestError(url, "GET", e);
  }
}

/**
 * Performs a POST request with a JSON body.
 *
 * @param url The url to make the request to.
 * @param body The body of the request, represented as an object.
 * @param requestOptions The options to configure the request. See {@link RequestOptions}.
 * @param dispatcherOrDispatcherOptions Either a dispatcher or dispatcher options. See {@link DispatcherOptions}.
 * @returns An object containing the status code and the response body. The body can be accessed as JSON or text.
 * `body` can not be consumed twice. For example, calling `text()` after `json()` throws `TypeError`.
 * @throws ConnectionRefusedError If the connection is refused by the server.
 * @throws RequestTimeoutError If the request times out.
 * @throws RequestError If the request fails for any other reason.
 */
export async function postJsonRequest(
  url: string,
  body: unknown,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<HttpResponse> {
  const { request } = await import("undici");

  try {
    const { headers, ...baseRequestOptions } = await getBaseRequestOptions(
      url,
      requestOptions,
      dispatcherOrDispatcherOptions,
    );
    return await request(url, {
      method: "POST",
      ...baseRequestOptions,
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    ensureError(e);

    handleError(e, url);

    throw new RequestError(url, "POST", e);
  }
}

/**
 * Performs a POST request with a form body.
 *
 * @param url The url to make the request to.
 * @param body The body of the request, represented as an object.
 * @param requestOptions The options to configure the request. See {@link RequestOptions}.
 * @param dispatcherOrDispatcherOptions Either a dispatcher or dispatcher options. See {@link DispatcherOptions}.
 * @returns An object containing the status code and the response body. The body can be accessed as JSON or text.
 * `body` can not be consumed twice. For example, calling `text()` after `json()` throws `TypeError`.
 * @throws ConnectionRefusedError If the connection is refused by the server.
 * @throws RequestTimeoutError If the request times out.
 * @throws RequestError If the request fails for any other reason.
 */
export async function postFormRequest(
  url: string,
  body: unknown,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<HttpResponse> {
  const { request } = await import("undici");

  try {
    const { headers, ...baseRequestOptions } = await getBaseRequestOptions(
      url,
      requestOptions,
      dispatcherOrDispatcherOptions,
    );
    return await request(url, {
      method: "POST",
      ...baseRequestOptions,
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO: Add a runtime check for body's type
      body: querystring.stringify(body as ParsedUrlQueryInput),
    });
  } catch (e) {
    ensureError(e);

    handleError(e, url);

    throw new RequestError(url, "POST", e);
  }
}

/**
 * Downloads a file from a url to a destination path.
 *
 * @param url The url to download from.
 * @param destination The absolute path to save the file to.
 * @param requestOptions The options to configure the request. See {@link RequestOptions}.
 * @param dispatcherOrDispatcherOptions Either a dispatcher or dispatcher options. See {@link DispatcherOptions}.
 * @throws ConnectionRefusedError If the connection is refused by the server.
 * @throws RequestTimeoutError If the request times out.
 * @throws DownloadFailedError If the download fails for any other reason.
 */
export async function download(
  url: string,
  destination: string,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<void> {
  let statusCode: number | undefined;

  try {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    -- We need the full Dispatcher.ResponseData here for stream.pipeline,
    but HttpResponse doesn’t expose the raw ReadableStream.
    TODO: wrap undici's request so we can keep the public API
    strictly typed without falling back to Undici types. */
    const response = (await getRequest(
      url,
      requestOptions,
      dispatcherOrDispatcherOptions,
    )) as UndiciT.Dispatcher.ResponseData;
    const { body } = response;
    statusCode = response.statusCode;

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(await body.text());
    }

    const tempFilePath = await generateTempFilePath(destination);
    const fileStream = fs.createWriteStream(tempFilePath);
    await stream.pipeline(body, fileStream);
    await move(tempFilePath, destination);
  } catch (e) {
    ensureError(e);

    handleError(e, url);

    throw new DownloadError(url, e);
  }
}

/**
 * Creates a dispatcher based on the provided options.
 * If the `proxy` option is set, it creates a {@link UndiciT.ProxyAgent} dispatcher.
 * If the `pool` option is set to `true`, it creates a {@link UndiciT.Pool} dispatcher.
 * Otherwise, it creates a basic {@link UndiciT.Agent} dispatcher.
 *
 * @param url The url to make requests to.
 * @param options The options to configure the dispatcher. See {@link DispatcherOptions}.
 * @returns The configured dispatcher instance.
 * @throws DispatcherError If the dispatcher can't be created.
 */
export async function getDispatcher(
  url: string,
  {
    timeout,
    proxy,
    pool,
    maxConnections,
    isTestDispatcher,
  }: DispatcherOptions = {},
): Promise<Dispatcher> {
  try {
    if (pool !== undefined && proxy !== undefined) {
      throw new Error(
        "The pool and proxy options can't be used at the same time",
      );
    }
    const baseOptions = getBaseDispatcherOptions(timeout, isTestDispatcher);

    if (proxy !== undefined) {
      return await getProxyDispatcher(proxy, baseOptions);
    }

    if (pool === true) {
      return await getPoolDispatcher(url, {
        ...baseOptions,
        connections: maxConnections ?? DEFAULT_POOL_MAX_CONNECTIONS,
      });
    }

    return await getBasicDispatcher(baseOptions);
  } catch (e) {
    ensureError(e);
    throw new DispatcherError(e.message, e);
  }
}

export async function getTestDispatcher(
  options: {
    timeout?: number;
  } = {},
): Promise<TestDispatcher> {
  const { MockAgent } = await import("undici");

  const baseOptions = getBaseDispatcherOptions(options.timeout, true);
  return new MockAgent(baseOptions);
}

/**
 * Determines whether a proxy should be used for a given url.
 *
 * @param url The url to check.
 * @returns `true` if a proxy should be used for the url, `false` otherwise.
 */
export function shouldUseProxy(url: string): boolean {
  const { hostname } = new URL(url);
  const noProxy = process.env.NO_PROXY;

  if (hostname === "localhost" || hostname === "127.0.0.1" || noProxy === "*") {
    return false;
  }

  if (noProxy !== undefined && noProxy !== "") {
    const noProxySet = new Set(noProxy.split(","));

    if (noProxySet.has(hostname)) {
      return false;
    }
  }

  return true;
}

/**
 * Determines whether an absolute url is valid.
 *
 * @param url The url to check.
 * @returns `true` if the url is valid, `false` otherwise.
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the proxy URL from environment variables based on the target URL.
 * For HTTPS URLs, checks `https_proxy` then `HTTPS_PROXY`.
 * For HTTP URLs, checks `http_proxy` then `HTTP_PROXY`.
 * Falls back to the other protocol's proxy if none found.
 *
 * @param url The target URL to determine proxy for.
 * @returns The proxy URL, or `undefined` if none are set.
 */
export function getProxyUrl(url: string): string | undefined {
  const { protocol } = new URL(url);

  if (protocol === "https:") {
    return (
      process.env.https_proxy ??
      process.env.HTTPS_PROXY ??
      process.env.http_proxy ??
      process.env.HTTP_PROXY
    );
  } else if (protocol === "http:") {
    return (
      process.env.http_proxy ??
      process.env.HTTP_PROXY ??
      process.env.https_proxy ??
      process.env.HTTPS_PROXY
    );
  }

  return undefined;
}

export {
  ConnectionRefusedError,
  DispatcherError,
  DownloadError,
  RequestError,
  RequestTimeoutError,
  ResponseStatusCodeError,
} from "./errors/request.js";
