import type { Event, Response } from "@sentry/node";

import { spawnDetachedSubProcess } from "@nomicfoundation/hardhat-utils/subprocess";
import debug from "debug";

const log = debug("hardhat:cli:telemetry:sentry:transport");

// This class is wrapped in a function to avoid having to
// import @sentry/node just for the BaseTransport base class
export async function getSubprocessTransport(): Promise<any> {
  const { Status, Transports } = await import("@sentry/node");

  class SubprocessTransport extends Transports.BaseTransport {
    public override async sendEvent(event: Event): Promise<Response> {
      // Be aware that any error thrown here will not be propagated to the main process

      const extra: { configPath?: string } = event.extra ?? {};
      const { configPath } = extra;

      log("Processing event");

      // Don't send user's full config path for privacy reasons
      delete event.extra?.configPath;
      // We don't care about the verbose setting
      delete event.extra?.verbose;

      const serializedEvent = JSON.stringify(event);

      // The HARDHAT_TEST_SUBPROCESS_RESULT_PATH env variable is used in the tests to instruct the subprocess to write the payload to a file
      // instead of sending it.
      // During testing, the subprocess file is a ts file, whereas in production, it is a js file (compiled code).
      // The following lines adjust the file extension based on whether the environment is for testing or production.
      const fileExt =
        process.env.HARDHAT_TEST_SUBPROCESS_RESULT_PATH !== undefined
          ? "ts"
          : "js";
      const subprocessFile = `${import.meta.dirname}/subprocess.${fileExt}`;

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

      return {
        status: Status.Success,
      };
    }
  }

  return SubprocessTransport;
}
