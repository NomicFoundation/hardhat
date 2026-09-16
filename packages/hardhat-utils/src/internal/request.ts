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

export interface ProxyEnvVar {
  name: string;
  value: string;
}

interface NoProxyEntry {
  hostname: string;
  port: number;
}

// We don't load undici on startup because this package is transitively imported
// from too many places and it's too complex to optimize case by case.
let undici: typeof UndiciT | undefined;

const HTTPS_PROXY_ENV_VARS: string[] = ["https_proxy", "HTTPS_PROXY"];
const HTTP_PROXY_ENV_VARS: string[] = ["http_proxy", "HTTP_PROXY"];

// `URL` normalizes IPv6 loopback to `[::1]` and alternate IPv4 forms to
// dotted decimal. Only IPv6 hostnames include brackets.
const LOOPBACK_HOSTNAMES: Set<string> = new Set([
  "localhost",
  "0.0.0.0",
  "[::1]",
]);

const DEFAULT_PORTS: Map<string, number> = new Map([
  ["http:", 80],
  ["https:", 443],
]);

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

/**
 * Determines whether a url points at the loopback interface.
 */
export function isLoopbackUrl(parsedUrl: URL): boolean {
  const hostname = parsedUrl.hostname.toLowerCase();

  if (LOOPBACK_HOSTNAMES.has(hostname)) {
    return true;
  }

  // Subdomains of localhost, e.g. `api.localhost`.
  if (hostname.endsWith(".localhost")) {
    return true;
  }

  // The whole 127.0.0.0/8 range is loopback, not just 127.0.0.1.
  return /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

/**
 * Determines whether `NO_PROXY` (or `no_proxy`) excludes a url from being
 * proxied. A value of `*` excludes everything; the other entries are matched as
 * described in {@link parseNoProxy}.
 */
export function isExcludedByNoProxy(parsedUrl: URL): boolean {
  const noProxy = (process.env.no_proxy ?? process.env.NO_PROXY)?.trim();

  if (noProxy === undefined || noProxy === "") {
    return false;
  }

  if (noProxy === "*") {
    return true;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const parsedPort = Number.parseInt(parsedUrl.port, 10);
  const port = Number.isNaN(parsedPort)
    ? DEFAULT_PORTS.get(parsedUrl.protocol)
    : parsedPort;

  for (const entry of parseNoProxy(noProxy)) {
    // A portless entry matches every port.
    if (entry.port !== 0 && entry.port !== port) {
      continue;
    }

    if (
      hostname === entry.hostname ||
      hostname.endsWith(`.${entry.hostname}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Finds the environment variable that configures the proxy for a given url,
 * following the usual precedence: the variable matching the url's protocol
 * first, lowercase before uppercase, then the other protocol's as a fallback.
 *
 * Empty and whitespace-only values are treated as unset, as that's how users
 * disable a variable inherited from a parent environment. The returned value is
 * trimmed, but not validated.
 *
 * @param requestUrl The url the proxy would be used for.
 * @returns The variable's name and value, or `undefined` if none is set or the
 * url's protocol isn't proxyable.
 */
export function findProxyEnvVar(requestUrl: string): ProxyEnvVar | undefined {
  const { protocol } = new URL(requestUrl);

  let names: string[];
  if (protocol === "https:") {
    names = HTTPS_PROXY_ENV_VARS.concat(HTTP_PROXY_ENV_VARS);
  } else if (protocol === "http:") {
    names = HTTP_PROXY_ENV_VARS.concat(HTTPS_PROXY_ENV_VARS);
  } else {
    return undefined;
  }

  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value !== undefined && value !== "") {
      return { name, value };
    }
  }

  return undefined;
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

/**
 * Parses a `NO_PROXY` value into its entries.
 *
 * Entries are separated by commas or whitespace. A leading `.` or `*.` marks
 * the suffix form (`.example.com`), but a bare `example.com` matches its
 * subdomains too, so both are stored the same way. An entry may carry a port,
 * as in `example.com:8080`, which restricts it to that port. CIDR ranges aren't
 * supported.
 */
function parseNoProxy(noProxy: string): NoProxyEntry[] {
  const entries: NoProxyEntry[] = [];

  for (const rawEntry of noProxy.split(/[,\s]/)) {
    const entry = rawEntry.trim();

    if (entry === "") {
      continue;
    }

    const withPort = entry.match(/^(.+):(\d+)$/);

    entries.push({
      hostname: (withPort !== null ? withPort[1] : entry)
        .replace(/^\*?\./, "")
        .toLowerCase(),
      port: withPort !== null ? Number.parseInt(withPort[2], 10) : 0,
    });
  }

  return entries;
}
