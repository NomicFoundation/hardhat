import type { DispatcherOptions, RequestOptions } from "../request.js";
import type EventEmitter from "node:events";
import type * as UndiciT from "undici";

import crypto from "node:crypto";
import { STATUS_CODES } from "node:http";
import path from "node:path";

import { mkdir } from "../fs.js";
import { isObject } from "../lang.js";
import {
  ConnectionRefusedError,
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_TIMEOUT_IN_MILLISECONDS,
  DEFAULT_USER_AGENT,
  getDispatcher,
  RequestTimeoutError,
  ResponseStatusCodeError,
} from "../request.js";

// We don't load undici on startup because this package is transitively imported
// from too many places and it's too complex to optimize case by case.
let undici: typeof UndiciT | undefined;

export async function generateTempFilePath(filePath: string): Promise<string> {
  const { dir, ext, name } = path.parse(filePath);

  await mkdir(dir);

  return path.format({
    dir,
    ext,
    name: `tmp-${name}-${crypto.randomBytes(8).toString("hex")}`,
  });
}

export async function getBaseRequestOptions(
  requestUrl: string,
  { extraHeaders, abortSignal, queryParams }: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<{
  query?: Record<string, any> | undefined;
  signal?: EventEmitter | AbortSignal | undefined;
  dispatcher: UndiciT.Dispatcher;
  headers: Record<string, string>;
}> {
  if (undici === undefined) {
    undici = await import("undici");
  }

  const dispatcher =
    dispatcherOrDispatcherOptions instanceof undici.Dispatcher
      ? dispatcherOrDispatcherOptions
      : await getDispatcher(requestUrl, dispatcherOrDispatcherOptions);

  // We always build our own dispatcher instead of letting undici fall back to
  // the global one, which is a bare `new Agent()` and would drop our timeouts.
  // Configuring it with `setGlobalDispatcher` would affect the whole process.
  // https://github.com/nodejs/undici/blob/v7.29.0/lib/global.js#L10-L12
  return {
    dispatcher: dispatcher.compose(
      undici.interceptors.redirect({ maxRedirections: DEFAULT_MAX_REDIRECTS }),
      // responseError is what makes 4xx and 5xx responses throw
      undici.interceptors.responseError(),
    ),
    headers: getHeaders(requestUrl, extraHeaders),
    ...(abortSignal !== undefined ? { signal: abortSignal } : {}),
    ...(queryParams !== undefined ? { query: queryParams } : {}),
  };
}

export function getHeaders(
  requestUrl: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    ...extraHeaders,
    "User-Agent": extraHeaders["User-Agent"] ?? DEFAULT_USER_AGENT,
  };

  const authHeader = getAuthHeader(requestUrl);
  if (authHeader !== undefined) {
    headers.Authorization = authHeader;
  }

  return headers;
}

export function getAuthHeader(requestUrl: string): string | undefined {
  const parsedUrl = new URL(requestUrl);
  if (parsedUrl.username === "") {
    return undefined;
  }

  return `Basic ${Buffer.from(
    `${parsedUrl.username}:${parsedUrl.password}`,
  ).toString("base64")}`;
}

export async function getProxyDispatcher(
  proxy: string,
  options: Omit<UndiciT.ProxyAgent.Options, "uri">,
): Promise<UndiciT.ProxyAgent> {
  if (undici === undefined) {
    undici = await import("undici");
  }

  return new undici.ProxyAgent({
    uri: proxy,
    ...options,
  });
}

export async function getPoolDispatcher(
  requestUrl: string,
  options: UndiciT.Pool.Options,
): Promise<UndiciT.Pool> {
  if (undici === undefined) {
    undici = await import("undici");
  }

  const parsedUrl = new URL(requestUrl);
  return new undici.Pool(parsedUrl.origin, options);
}

export async function getBasicDispatcher(
  options: UndiciT.Agent.Options,
): Promise<UndiciT.Agent> {
  if (undici === undefined) {
    undici = await import("undici");
  }

  return new undici.Agent(options);
}

export function getBaseDispatcherOptions(
  timeout: number = DEFAULT_TIMEOUT_IN_MILLISECONDS,
  isTestDispatcher: boolean = false,
): UndiciT.Client.Options {
  // These have good defaults for production, but need to be tweaked to avoid hanging tests.
  // https://github.com/nodejs/undici/blob/v7.29.0/docs/docs/best-practices/writing-tests.md
  const keepAliveTimeouts = isTestDispatcher
    ? { keepAliveTimeout: 10, keepAliveMaxTimeout: 10 }
    : {};

  return {
    headersTimeout: timeout,
    bodyTimeout: timeout,
    connectTimeout: timeout,
    ...keepAliveTimeouts,
  };
}

export function sanitizeUrl(requestUrl: string): string {
  const parsedUrl = new URL(requestUrl);
  // Return only the origin to avoid leaking sensitive information
  return parsedUrl.origin;
}

export function handleError(e: Error, requestUrl: string): void {
  let causeCode: unknown;
  if (isObject(e.cause)) {
    causeCode = e.cause.code;
  }
  const errorCode = "code" in e ? e.code : causeCode;

  if (errorCode === "ECONNREFUSED") {
    throw new ConnectionRefusedError(requestUrl, e);
  }

  if (
    errorCode === "UND_ERR_CONNECT_TIMEOUT" ||
    errorCode === "UND_ERR_HEADERS_TIMEOUT" ||
    errorCode === "UND_ERR_BODY_TIMEOUT"
  ) {
    throw new RequestTimeoutError(requestUrl, e);
  }

  if (errorCode === "UND_ERR_RESPONSE") {
    describeResponseError(e);
    throw new ResponseStatusCodeError(requestUrl, e);
  }
}

/**
 * Restores the message that undici used to produce for status code errors.
 *
 * Until v7, undici's `throwOnError` described the failure as
 * `Response status code <code>: <reason>`. The `responseError` interceptor that
 * replaced it always uses the generic "Response Error" instead, dropping the
 * only actionable part of the message. Consumers surface this message to users,
 * so we describe the error again.
 */
function describeResponseError(e: Error): void {
  if (e.message !== "Response Error") {
    return;
  }

  const statusCode = "statusCode" in e ? e.statusCode : undefined;
  if (typeof statusCode !== "number") {
    return;
  }

  const reason = STATUS_CODES[statusCode];

  e.message = `Response status code ${statusCode}${
    reason !== undefined ? `: ${reason}` : ""
  }`;
}
