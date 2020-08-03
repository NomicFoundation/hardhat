import { Event, Response } from "@sentry/node";
import { spawn } from "child_process";
import * as path from "path";

// This class is wrapped in a function to avoid having to
// import @sentry/node just for the BaseTransport base class
export function getSubprocessTransport(): any {
  const { Status, Transports } = require("@sentry/node");

  class SubprocessTransport extends Transports.BaseTransport {
    public async sendEvent(event: Event): Promise<Response> {
      const { verbose = false, configPath } = event.extra ?? {};

      // don't send user's full config path for privacy reasons
      delete event.extra?.configPath;

      // we don't care about the verbose setting
      delete event.extra?.verbose;

      const serializedEvent = JSON.stringify(event);

      const env: Record<string, string> = {
        BUIDLER_SENTRY_EVENT: serializedEvent,
        BUIDLER_SENTRY_VERBOSE: verbose.toString(),
      };

      if (configPath !== undefined) {
        env.BUIDLER_SENTRY_CONFIG_PATH = configPath;
      }

      const subprocessPath = path.join(__dirname, "subprocess");

      const subprocess = spawn(process.execPath, [subprocessPath], {
        detached: true,
        env,
        stdio: (verbose ? "inherit" : "ignore") as any,
      });

      subprocess.unref();

      return {
        status: Status.Success,
      };
    }
  }

  return SubprocessTransport;
}
