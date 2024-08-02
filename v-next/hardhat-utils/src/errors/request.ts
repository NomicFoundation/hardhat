import type UndiciT from "undici";

import { CustomError } from "../error.js";
import { sanitizeUrl } from "../internal/request.js";

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
