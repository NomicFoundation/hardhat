import { ExecutionMode, getExecutionMode } from "../../core/execution-mode";
import { isRunningOnCiServer } from "../../util/ci-detection";

import { getSubprocessTransport } from "./transport";

export const SENTRY_DSN =
  "https://38ba58bb85fa409e9bb7f50d2c419bc2@o385026.ingest.sentry.io/5224869";

export class Reporter {
  private _enabled: boolean;

  constructor(private _verbose: boolean) {
    this._enabled = true;
    if (isRunningOnCiServer()) {
      this._enabled = false;
    }

    // set BUIDLER_ENABLE_SENTRY=true to enable sentry during development (for local testing)
    if (isLocalDev() && process.env.BUIDLER_ENABLE_SENTRY === undefined) {
      this._enabled = false;
    }
  }

  public reportError(error: Error) {
    if (!this._enabled) {
      return;
    }

    const Sentry = require("@sentry/node");

    Sentry.init({
      dsn: SENTRY_DSN,
      transport: getSubprocessTransport(this._verbose),
    });

    Sentry.captureException(error);

    return true;
  }

  public async close(timeout: number): Promise<void> {
    if (!this._enabled) {
      return;
    }

    const Sentry = require("@sentry/node");
    return Sentry.close(timeout);
  }
}

function isLocalDev(): boolean {
  const executionMode = getExecutionMode();

  return (
    executionMode === ExecutionMode.EXECUTION_MODE_LINKED ||
    executionMode === ExecutionMode.EXECUTION_MODE_TS_NODE_TESTS
  );
}
