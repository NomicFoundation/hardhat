import type { TaskTelemetryRecording } from "../../../builtin-plugins/telemetry/recorder.js";
import type { Event } from "@sentry/core";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { createDebug } from "@nomicfoundation/hardhat-utils/debug";
import {
  createEventEnvelope,
  generateSpanId,
  generateTraceId,
  makeDsn,
} from "@sentry/core";

import { getHardhatVersion } from "../../../utils/package.js";
import { createDetachedProcessTransport } from "../sentry/transport.js";

const log = createDebug("hardhat:core:cli:telemetry:performance:sender");

// Prototype DSN: the DEV Sentry project, so prototype performance data stays
// out of production. This mirrors the commented-out DEV DSN in
// `../sentry/reporter.ts`.
const SENTRY_DEV_DSN =
  "https://d578a176729662a28e7a8da268d36912@o385026.ingest.us.sentry.io/4507685793103872";

/**
 * Converts an internal task telemetry recording into a Sentry transaction
 * envelope and sends it via the detached process transport.
 *
 * This is the only place a Sentry data structure is constructed. It is reached
 * exclusively from the recorder's lazy `flush`, i.e. only when telemetry is
 * enabled, the run was sampled, and a recording is active.
 */
export async function sendTaskTransaction(
  recording: TaskTelemetryRecording,
): Promise<void> {
  const release = `hardhat@${await getHardhatVersion()}`;
  const environment = "development";

  const event: Event = {
    type: "transaction",
    transaction: recording.name,
    start_timestamp: recording.startTime,
    timestamp: recording.endTime,
    contexts: {
      trace: {
        trace_id: generateTraceId(),
        span_id: generateSpanId(),
        op: "task",
      },
    },
    spans: [],
    tags: recording.tags,
    release,
    environment,
    platform: "node",
  };

  const dsn = makeDsn(SENTRY_DEV_DSN);
  assertHardhatInvariant(
    dsn !== undefined,
    "The performance telemetry DSN should be valid",
  );

  const envelope = createEventEnvelope(event, dsn, undefined, undefined);

  log("Sending task transaction %s via detached process", recording.name);

  const transport = createDetachedProcessTransport(
    SENTRY_DEV_DSN,
    release,
    environment,
    () => undefined,
  );

  await transport.send(envelope);
}
