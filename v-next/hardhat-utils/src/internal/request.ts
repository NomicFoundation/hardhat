import type { DispatcherOptions, RequestOptions } from "../request.js";
import type EventEmitter from "node:events";
import type UndiciT from "undici";

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

export async function generateTempFilePath(filePath: string): Promise<string> {
  const { dir, ext, name } = path.parse(filePath);

  await mkdir(dir);

  return path.format({
    dir,
    ext,
    name: `tmp-${name}`,
  });
}

export async function getBaseRequestOptions(
  requestUrl: string,
  { extraHeaders, abortSignal, queryParams, throwOnError }: RequestOptions = {},
  dispatcherOrDispatcherOptions?: UndiciT.Dispatcher | DispatcherOptions,
): Promise<{
  query?: Record<string, any> | undefined;
  signal?: EventEmitter | AbortSignal | undefined;
  dispatcher: UndiciT.Dispatcher;
  headers: Record<string, string>;
  throwOnError: boolean;
}> {
  const { Dispatcher } = await import("undici");
  const dispatcher =
    dispatcherOrDispatcherOptions instanceof Dispatcher
      ? dispatcherOrDispatcherOptions
      : await getDispatcher(requestUrl, dispatcherOrDispatcherOptions);

  // We could use the global dispatcher if neither dispatcher nor dispatcherOptions were passed,
  // but there's no way to configure it, so we don't do it.
  // https://github.com/nodejs/undici/blob/961b76ad7cac17d23580d172702e11a080974f5d/lib/global.js#L9
  return {
    dispatcher,
    headers: getHeaders(requestUrl, extraHeaders),
    throwOnError: throwOnError ?? true,
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
  const { ProxyAgent } = await import("undici");

  return new ProxyAgent({
    uri: proxy,
    ...options,
  });
}

export async function getPoolDispatcher(
  requestUrl: string,
  options: UndiciT.Pool.Options,
): Promise<UndiciT.Pool> {
  const { Pool } = await import("undici");

  const parsedUrl = new URL(requestUrl);
  return new Pool(parsedUrl.origin, options);
}

export async function getBasicDispatcher(
  options: UndiciT.Agent.Options,
): Promise<UndiciT.Agent> {
  const { Agent } = await import("undici");

  return new Agent(options);
}

export function getBaseDispatcherOptions(
  timeout: number = DEFAULT_TIMEOUT_IN_MILLISECONDS,
  isTestDispatcher: boolean = false,
): UndiciT.Client.Options {
  // These have good defaults for production, but need to be tweaked to avoid hanging tests.
  // https://github.com/nodejs/undici/blob/961b76ad7cac17d23580d172702e11a080974f5d/docs/docs/best-practices/writing-tests.md
  const keepAliveTimeouts = isTestDispatcher
    ? { keepAliveTimeout: 10, keepAliveMaxTimeout: 10 }
    : {};

  return {
    headersTimeout: timeout,
    bodyTimeout: timeout,
    connectTimeout: timeout,
    maxRedirections: DEFAULT_MAX_REDIRECTS,
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

  if (errorCode === "UND_ERR_RESPONSE_STATUS_CODE") {
    throw new ResponseStatusCodeError(requestUrl, e);
  }
}
