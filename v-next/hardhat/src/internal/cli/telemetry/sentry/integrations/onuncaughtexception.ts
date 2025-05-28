/* This file is inspired by https://github.com/getsentry/sentry-javascript/blob/9.4.0/packages/node/src/integrations/onuncaughtexception.ts */

import type { Integration, ServerRuntimeClient } from "@sentry/core";

import { captureException, defineIntegration, getClient } from "@sentry/core";

/**
 * Add a global exception handler.
 */
export const onUncaughtExceptionIntegration: () => Integration =
  defineIntegration(() => {
    return {
      name: "OnUncaughtException",
      setup(client: ServerRuntimeClient) {
        process.on("uncaughtException", makeUncaughtExceptionListener(client));
      },
    };
  });

function makeUncaughtExceptionListener(
  client: ServerRuntimeClient,
): NodeJS.UncaughtExceptionListener {
  return (error: Error): void => {
    if (getClient() === client) {
      captureException(error, {
        originalException: error,
        captureContext: {
          level: "fatal",
        },
        mechanism: {
          handled: false,
          type: "onuncaughtexception",
        },
      });
    }

    console.error(error);
    process.exit(1);
  };
}
