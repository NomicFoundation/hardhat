/* eslint-disable no-restricted-syntax -- This is the entry point of a
subprocess, so we need to allow of top-level await here */
import type { Event } from "@sentry/core";

import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";
import { captureEvent, captureMessage } from "@sentry/core";

import { Anonymizer } from "./anonymizer.js";
import { init } from "./init.js";
import { SENTRY_DSN } from "./reporter.js";
import { makeFetchTransport } from "./transports/fetch.js";

try {
  init({
    dsn: SENTRY_DSN,
    serverName: "<user-server>",
    transport: makeFetchTransport,
  });
} catch (_error) {
  process.exit(1);
}

const serializedEvent = process.argv[2];
const configPath = process.argv[3];

if (serializedEvent === undefined) {
  await sendMsgToSentry(
    "There was an error parsing an event: 'process.argv[2]' argument is not set",
  );

  process.exit(1);
}

let sentryEvent: any;
try {
  sentryEvent = JSON.parse(serializedEvent);
} catch {
  await sendMsgToSentry(
    "There was an error parsing an event: 'process.argv[2]' doesn't have a valid JSON",
  );

  process.exit(1);
}

try {
  const anonymizer = new Anonymizer(configPath);
  const anonymizedEvent = await anonymizer.anonymize(sentryEvent);

  if (anonymizedEvent.success) {
    if (anonymizer.raisedByHardhat(anonymizedEvent.event)) {
      await sendEventToSentry(anonymizedEvent.event);
    }
  } else {
    await sendMsgToSentry(
      `There was an error anonymizing an event: ${anonymizedEvent.error}`,
    );
  }
} catch (error: any) {
  await sendMsgToSentry(
    `There was an error capturing an event: ${error.message}`,
  );
}

async function sendMsgToSentry(msg: string) {
  if (process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH !== undefined) {
    // ATTENTION: only for testing
    await writeJsonFile(process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH, {
      msg,
    });
    return;
  }

  captureMessage(msg);
}

async function sendEventToSentry(e: Event) {
  if (process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH !== undefined) {
    // ATTENTION: only for testing
    await writeJsonFile(process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH, e);
    return;
  }

  captureEvent(e);
}
