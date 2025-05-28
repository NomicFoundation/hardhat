/* This file is inspired by https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/transports/http.ts */

import type {
  BaseTransportOptions,
  Transport,
  TransportMakeRequestResponse,
  TransportRequest,
} from "@sentry/core";

import { createTransport } from "@sentry/core";

export interface FetchTransportOptions extends BaseTransportOptions {
  /** Define custom headers */
  headers?: Record<string, string>;
}

/**
 * Creates a Transport that uses native fetch to send events to Sentry.
 */
export function makeFetchTransport(options: FetchTransportOptions): Transport {
  async function makeRequest(
    request: TransportRequest,
  ): Promise<TransportMakeRequestResponse> {
    const response = await fetch(options.url, {
      method: "POST",
      body: request.body,
      headers: options.headers,
    });

    // NOTE: TransportMakeRequestResponse expects the headers to be an object
    // with retry-after and x-sentry-rate-limits keys set.

    const headers: TransportMakeRequestResponse["headers"] = {
      "retry-after": null,
      "x-sentry-rate-limits": null,
      ...Object.fromEntries(response.headers.entries()),
    };

    if (
      Array.isArray(headers["x-sentry-rate-limits"]) &&
      headers["x-sentry-rate-limits"].length > 0
    ) {
      headers["x-sentry-rate-limits"] = headers["x-sentry-rate-limits"][0];
    }

    return {
      ...response,
      headers,
    };
  }

  return createTransport(options, makeRequest);
}
