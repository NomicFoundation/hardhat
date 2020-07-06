import { Event, Response } from "@sentry/node";
import { spawn } from "child_process";
import * as path from "path";

// This class is wrapped in a function to avoid having to
// import @sentry/node just for the BaseTransport base class
export function getSubprocessTransport(
  verbose: boolean,
  configPath: string | undefined
): any {
  const { Status, Transports } = require("@sentry/node");

  class SubprocessTransport extends Transports.BaseTransport {
    public async sendEvent(event: Event): Promise<Response> {
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

      return Promise.resolve({
        status: Status.Success,
      });
    }
  }

  return SubprocessTransport;
}
