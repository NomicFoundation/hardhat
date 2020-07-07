import { isLocalDev } from "../../core/execution-mode";
import { isRunningOnCiServer } from "../../util/ci-detection";

import { getSubprocessTransport } from "./transport";

export const SENTRY_DSN =
  "https://38ba58bb85fa409e9bb7f50d2c419bc2@o385026.ingest.sentry.io/5224869";

export class Reporter {
  public static getInstance(): Reporter {
    if (this._instance === undefined) {
      this._instance = new Reporter();
    }

    return this._instance;
  }

  private static _instance: Reporter;
  private _enabled: boolean;
  private _initialized = false;

  private constructor() {
    this._enabled = true;
    if (isRunningOnCiServer()) {
      this._enabled = false;
    }

    // set BUIDLER_ENABLE_SENTRY=true to enable sentry during development (for local testing)
    if (isLocalDev() && process.env.BUIDLER_ENABLE_SENTRY === undefined) {
      this._enabled = false;
    }
  }

  public async reportError(error: Error, verbose = false, configPath?: string) {
    if (!this._enabled) {
      return;
    }

    await this._init();

    const Sentry = await import("@sentry/node");
    Sentry.setExtra("verbose", verbose);
    Sentry.setExtra("configPath", configPath);
    Sentry.captureException(error);

    return true;
  }

  public async close(timeout: number): Promise<boolean> {
    if (!this._enabled || !this._initialized) {
      return true;
    }

    const Sentry = await import("@sentry/node");
    return Sentry.close(timeout);
  }

  private async _init() {
    if (this._initialized) {
      return;
    }

    const Sentry = await import("@sentry/node");

    const linkedErrorsIntegration = new Sentry.Integrations.LinkedErrors({
      key: "parent",
    });

    Sentry.init({
      dsn: SENTRY_DSN,
      transport: getSubprocessTransport(),
      integrations: () => [linkedErrorsIntegration],
    });

    this._initialized = true;
  }
}
