/* eslint-disable no-restricted-syntax -- Allow top-level await */
import { captureMessage, close, captureException } from "@sentry/core";
import debug from "debug";

import { Anonymizer } from "./anonymizer.js";
import { init } from "./init.js";
import {
  createHttpTransport,
  sendEnvelopeToSentryBackend,
} from "./transport.js";

const log = debug("hardhat:core:sentry:subprocess");

const serializedEnvelope = process.argv[2];
const configPath = process.argv[3] !== "" ? process.argv[3] : undefined;
const dsn = process.argv[4];
const release = process.argv[5];
const environment = process.argv[6];

if (process.argv.length !== 7) {
  console.error(
    "Invalid number of arguments. Expected [<script>, <json-serialized-envelope>, <config-path>, <dsn>, <release>]",
  );
  process.exit(1);
}

log("Received envelope to be sent to Sentry from a subprocess");

init({
  dsn,
  release,
  transport: createHttpTransport(dsn),
  environment,
});

const envelope = JSON.parse(serializedEnvelope);

const anonymizer = new Anonymizer(configPath);
const anonymizeResult = await anonymizer.anonymizeEventsFromEnvelope(envelope);

if (!anonymizeResult.success) {
  log("Failed to anonymize envelope", anonymizeResult.error);
  captureMessage(anonymizeResult.error);
} else {
  try {
    log("Sending received envelope to Sentry");

    await sendEnvelopeToSentryBackend(dsn, anonymizeResult.envelope);

    log("Successfully sent received envelope to Sentry");
  } catch (e) {
    log("Failed to send received envelope to Sentry", e);

    captureException(e);
  }
}

await close();
