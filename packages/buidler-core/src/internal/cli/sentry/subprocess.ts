import * as Sentry from "@sentry/node";
import debug from "debug";

import { SENTRY_DSN } from "./reporter";

const log = debug("buidler:sentry:subprocess");

async function main() {
  const verbose = process.env.BUIDLER_SENTRY_VERBOSE === "true";

  if (verbose) {
    debug.enable("buidler*");
  }

  log("starting subprocess");
  Sentry.init({
    dsn: SENTRY_DSN,
  });
  const serializedEvent = process.env.BUIDLER_SENTRY_EVENT;

  if (serializedEvent === undefined) {
    log("BUIDLER_SENTRY_EVENT env variable is not set, exiting");
    process.exit(1);
  }

  let event: any;
  try {
    event = JSON.parse(serializedEvent);
  } catch (error) {
    log("BUIDLER_SENTRY_EVENT env variable doesn't have a valid JSON, exiting");
    process.exit(1);
  }

  Sentry.captureEvent(event);
  log("sentry event was sent");
}

main().catch(console.error);
