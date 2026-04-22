import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import debug from "debug";

import { sendErrorTelemetry } from "./reporter.js";

const log = debug("hardhat:core:telemetry:global-error-handlers");

function createUnhandledErrorListener(isPromiseRejection: boolean) {
  const description = isPromiseRejection
    ? "Unhandled promise rejection"
    : "Uncaught exception";

  const mechanismType = isPromiseRejection
    ? "onunhandledrejection"
    : "onuncaughtexception";

  async function listener(error: Error | unknown) {
    log(description, error);

    const telemetryError =
      error instanceof Error
        ? error
        : new Error(
            isObject(error) &&
            "message" in error &&
            typeof error.message === "string"
              ? error.message
              : "Unknown error",
            { cause: error },
          );

    try {
      await sendErrorTelemetry(telemetryError, {
        unhandled: true,
        mechanismType,
      });
    } catch (telemetryErrorReportingError) {
      log(
        "Failed to send telemetry for unhandled error",
        telemetryErrorReportingError,
      );
    }

    console.error();
    console.error(`${description}:`);
    console.error();
    console.error(error);

    process.exit(1);
  }

  return listener;
}

/**
 * Sets up global error handlers that report unhandled errors and promise
 * rejections if authorized by the user.
 */
export function setupGlobalUnhandledErrorHandlers(): void {
  log("Setting up global unhandled error handlers");

  process.on("uncaughtException", createUnhandledErrorListener(false));
  process.on("unhandledRejection", createUnhandledErrorListener(true));
}
