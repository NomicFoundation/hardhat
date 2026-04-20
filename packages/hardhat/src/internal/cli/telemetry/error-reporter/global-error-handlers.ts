import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import debug from "debug";

import { sendErrorTelemetry } from "./reporter.js";

const log = debug("hardhat:core:telemetry:global-error-handlers");

function createUnhandledErrorListener(isPromiseRejection: boolean) {
  const description = isPromiseRejection
    ? "Unhandled promise rejection"
    : "Uncaught exception";

  async function listener(error: Error | unknown) {
    log(description, error);

    ensureError(error);
    await sendErrorTelemetry(error);

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
