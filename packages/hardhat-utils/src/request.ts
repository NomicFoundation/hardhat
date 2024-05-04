import type UndiciT from "undici";
import type { ParsedUrlQueryInput } from "node:querystring";

import fs from "node:fs";
import stream from "node:stream/promises";
import EventEmitter from "node:events";
import querystring from "node:querystring";

import { ensureError } from "./errors/catch-utils.js";
import {
  DownloadError,
  RequestError,
  DispatcherError,
} from "./errors/request.js";
import {
  generateTempFilePath,
  getBaseDispatcherOptions,
  getBaseRequestOptions,
  getBasicDispatcher,
  getPoolDispatcher,
  getProxyDispatcher,
} from "./internal/request.js";
import { move } from "./fs.js";

export const DEFAULT_TIMEOUT_IN_MILLISECONDS = 30_000;
export const DEFAULT_MAX_REDIRECTS = 10;
export const DEFAULT_POOL_MAX_CONNECTIONS = 128;
export const DEFAULT_USER_AGENT = "Hardhat";

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

/**
 * Performs a HTTP request.
 *
 * @param url The url to make the request to.
 * @param requestOptions The options to configure the request. See {@link RequestOptions}.
 * @param dispatcherOrDispatcherOptions Either a dispatcher or dispatcher options. See {@link DispatcherOptions}.
 * @returns The response data object. See {@link https://undici.nodejs.org/#/docs/api/Dispatcher?id=parameter-responsedata}.
 * @throws RequestError If the request fails.
 */
export async function getRequest(
  url: string,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<UndiciT.Dispatcher.ResponseData> {
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
 * @returns The response data object. See {@link https://undici.nodejs.org/#/docs/api/Dispatcher?id=parameter-responsedata}.
 * @throws RequestError If the request fails.
 */
export async function postJsonRequest(
  url: string,
  body: unknown,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<UndiciT.Dispatcher.ResponseData> {
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
 * @returns The response data object. See {@link https://undici.nodejs.org/#/docs/api/Dispatcher?id=parameter-responsedata}.
 * @throws RequestError If the request fails.
 */
export async function postFormRequest(
  url: string,
  body: unknown,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<UndiciT.Dispatcher.ResponseData> {
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
      body: querystring.stringify(body as ParsedUrlQueryInput),
    });
  } catch (e) {
    ensureError(e);
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
 * @throws DownloadFailedError If the download fails.
 */
export async function download(
  url: string,
  destination: string,
  requestOptions: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<void> {
  let statusCode: number | undefined;

  try {
    const response = await getRequest(
      url,
      requestOptions,
      dispatcherOrDispatcherOptions,
    );
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
): Promise<UndiciT.Dispatcher> {
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
