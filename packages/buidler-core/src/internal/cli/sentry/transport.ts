import { Event, Response } from "@sentry/node";
import { fork } from "child_process";

// This class is wrapped in a function to avoid having to
// import @sentry/node just for the BaseTransport base class
export function getSubprocessTransport(verbose: boolean): any {
  const { Status, Transports } = require("@sentry/node");

  class SubprocessTransport extends Transports.BaseTransport {
    public async sendEvent(event: Event): Promise<Response> {
      const serializedEvent = JSON.stringify(event);

      fork(`${__dirname}/subprocess`, [], {
        env: {
          BUIDLER_SENTRY_EVENT: serializedEvent,
          BUIDLER_SENTRY_VERBOSE: verbose,
        },
        stdio: (verbose ? "inherit" : "ignore") as any,
      });

      return Promise.resolve({
        status: Status.Success,
      });
    }
  }

  return SubprocessTransport;
}
