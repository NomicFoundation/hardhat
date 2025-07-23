import type {
  BaseTransportOptions,
  Event,
  Transport,
  TransportMakeRequestResponse,
  TransportRequest,
} from "@sentry/core";

import { spawnDetachedSubProcess } from "@nomicfoundation/hardhat-utils/subprocess";
import { createTransport } from "@sentry/core";
import debug from "debug";

const log = debug("hardhat:cli:telemetry:sentry:transport:subprocess");

export function makeSubprocessTransport(
  options: BaseTransportOptions,
): Transport {
  async function makeRequest(
    request: TransportRequest,
  ): Promise<TransportMakeRequestResponse> {
    // Any error thrown here will not be propagated to the main process
    try {
      // From Sentry v7 onwards, the handler receives Envelopes instead of Events.
      // We extract the Event from the Envelope by iterating over the newline-separated objects
      const body = ensureString(request.body);
      const event: Event = body
        .split("\n")
        .map((result) => JSON.parse(result))
        .find(
          (e: any) => e.event_id !== undefined && e.timestamp !== undefined,
        );

      if (event === undefined) {
        log(`No event found in the request body: ${body}`);

        return {
          statusCode: 200,
        };
      }

      const extra: { configPath?: string } = event.extra ?? {};
      const { configPath } = extra;

      log("Processing event");

      // Don't send user's full config path for privacy reasons
      delete event.extra?.configPath;

      const serializedEvent = JSON.stringify(event);

      // The HARDHAT_TEST_SUBPROCESS_RESULT_PATH env variable is used in the tests to instruct the subprocess to write the payload to a file
      // instead of sending it.
      // During testing, the subprocess file is a ts file, whereas in production, it is a js file (compiled code).
      // The following lines adjust the file extension based on whether the environment is for testing or production.
      const fileExt =
        process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH !== undefined
          ? "ts"
          : "js";
      const subprocessFile = `${import.meta.dirname}/../subprocess.${fileExt}`;

      const env: Record<string, string> = {};
      if (process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH !== undefined) {
        // ATTENTION: only for testing
        env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH =
          process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH;
      }

      const args = [serializedEvent];
      if (configPath !== undefined) {
        args.push(configPath);
      }

      await spawnDetachedSubProcess(subprocessFile, args, env);

      log("Exception sent to detached subprocess");
    } catch (error) {
      log("Error sending event to subprocess", error);
    }

    return {
      statusCode: 200,
    };
  }

  // `createTransport` takes care of rate limiting and flushing
  return createTransport(options, makeRequest);
}

export function ensureString(input: string | Uint8Array): string {
  if (typeof input === "string") {
    return input;
  } else {
    return new TextDecoder().decode(input);
  }
}
