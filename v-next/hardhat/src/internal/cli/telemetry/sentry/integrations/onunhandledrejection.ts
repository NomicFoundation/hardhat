/* This file is inspired by https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/onunhandledrejection.ts */

import type { Client, Integration } from "@sentry/core";

import { captureException, defineIntegration, getClient } from "@sentry/core";

/**
 * Add a global promise rejection handler.
 */
export const onUnhandledRejectionIntegration: () => Integration =
  defineIntegration(() => {
    return {
      name: "OnUnhandledRejection",
      setup(client) {
        process.on(
          "unhandledRejection",
          makeUnhandledRejectionListener(client),
        );
      },
    };
  });

export function makeUnhandledRejectionListener(
  client: Client,
): NodeJS.UnhandledRejectionListener {
  return (reason: unknown, promise: Promise<unknown>): void => {
    if (getClient() !== client) {
      return;
    }

    captureException(reason, {
      originalException: promise,
      captureContext: {
        extra: { unhandledPromiseRejection: true },
        level: "error",
      },
      mechanism: {
        handled: false,
        type: "onunhandledrejection",
      },
    });

    console.error(
      reason !== null && typeof reason === "object" && "stack" in reason
        ? reason.stack
        : reason,
    );
  };
}
