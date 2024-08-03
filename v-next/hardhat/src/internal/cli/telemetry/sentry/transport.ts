import type { Event, Response } from "@sentry/node";

import { spawnDetachedSubProcess } from "@ignored/hardhat-vnext-utils/subprocess";

// This class is wrapped in a function to avoid having to
// import @sentry/node just for the BaseTransport base class
export async function getSubprocessTransport(): Promise<any> {
  const { Status, Transports } = await import("@sentry/node");

  class SubprocessTransport extends Transports.BaseTransport {
    public override async sendEvent(event: Event): Promise<Response> {
      const extra: { configPath?: string } = event.extra ?? {};
      const { configPath } = extra;

      // Don't send user's full config path for privacy reasons
      delete event.extra?.configPath;
      // We don't care about the verbose setting
      delete event.extra?.verbose;

      const serializedEvent = JSON.stringify(event);

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

      return {
        status: Status.Success,
      };
    }
  }

  return SubprocessTransport;
}
