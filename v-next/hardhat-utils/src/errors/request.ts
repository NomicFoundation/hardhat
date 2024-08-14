import type UndiciT from "undici";

import { CustomError } from "../error.js";
import { sanitizeUrl } from "../internal/request.js";
import { isObject } from "../lang.js";

export class RequestError extends CustomError {
  constructor(url: string, type: UndiciT.Dispatcher.HttpMethod, cause?: Error) {
    super(`Failed to make ${type} request to ${sanitizeUrl(url)}`, cause);
  }
}

export class DownloadError extends CustomError {
  constructor(url: string, cause?: Error) {
    super(`Failed to download file from ${sanitizeUrl(url)}`, cause);
  }
}

export class DispatcherError extends CustomError {
  constructor(message: string, cause?: Error) {
    super(`Failed to create dispatcher: ${message}`, cause);
  }
}

export class RequestTimeoutError extends CustomError {
  constructor(url: string, cause?: Error) {
    super(`Request to ${sanitizeUrl(url)} timed out`, cause);
  }
}

export class ConnectionRefusedError extends CustomError {
  constructor(url: string, cause?: Error) {
    super(`Connection to ${sanitizeUrl(url)} was refused`, cause);
  }
}

export class ResponseStatusCodeError extends CustomError {
  public readonly statusCode: number;
  public readonly headers:
    | string[]
    | Record<string, string | string[] | undefined>
    | null;
  public readonly body: null | Record<string, any> | string;

  constructor(url: string, cause: Error) {
    super(`Received an unexpected status code from ${sanitizeUrl(url)}`, cause);
    this.statusCode =
      "statusCode" in cause && typeof cause.statusCode === "number"
        ? cause.statusCode
        : -1;
    this.headers = this.#extractHeaders(cause);
    this.body = "body" in cause && isObject(cause.body) ? cause.body : null;
  }

  #extractHeaders(
    cause: Error,
  ): string[] | Record<string, string | string[] | undefined> | null {
    if ("headers" in cause) {
      const headers = cause.headers;
      if (Array.isArray(headers)) {
        return headers;
      } else if (this.#isValidHeaders(headers)) {
        return headers;
      }
    }
    return null;
  }

  #isValidHeaders(
    headers: unknown,
  ): headers is Record<string, string | string[] | undefined> {
    if (!isObject(headers)) {
      return false;
    }

    return Object.values(headers).every(
      (header) =>
        typeof header === "string" ||
        (Array.isArray(header) &&
          header.every((item: unknown) => typeof item === "string")) ||
        header === undefined,
    );
  }
}
