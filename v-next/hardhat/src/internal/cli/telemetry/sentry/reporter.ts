import {
  HardhatError,
  HardhatPluginError,
} from "@ignored/hardhat-vnext-errors";

import { getHardhatVersion } from "../../../utils/package.js";
import { isTelemetryAllowed } from "../telemetry-permissions.js";

import { getSubprocessTransport } from "./transport.js";

// TODO: replace with PROD version
// export const SENTRY_DSN =
//   "https://38ba58bb85fa409e9bb7f50d2c419bc2@o385026.ingest.sentry.io/522486955555555555";
export const SENTRY_DSN =
  "https://d578a176729662a28e7a8da268d36912@o385026.ingest.us.sentry.io/4507685793103872"; // DEV

export async function sendErrorTelemetry(error: Error): Promise<boolean> {
  const instance = await Reporter.getInstance();
  return instance.reportError(error);
}

// ATTENTION: this function is exported for testing, do not directly use it in production
export function _testResetReporter(): void {
  Reporter.deleteInstance();
}

class Reporter {
  // GENERAL EXPLANATION:
  // 1) The 'reportError' function collects the error and passes it to our custom Sentry transporter.
  // 2) The custom transporter receives the JavaScript error serialized by Sentry.
  // 3) This serialized error is then passed to a detached subprocess, which anonymizes all the information before sending it to Sentry.

  static #instance: Reporter | undefined;
  readonly #telemetryEnabled: boolean;

  private constructor(telemetryAllowed: boolean) {
    this.#telemetryEnabled = telemetryAllowed;
  }

  public static async getInstance(): Promise<Reporter> {
    if (this.#instance !== undefined) {
      return this.#instance;
    }

    const telemetryAllowed = await isTelemetryAllowed();
    this.#instance = new Reporter(telemetryAllowed);

    if (!telemetryAllowed) {
      // No need to initialize Sentry because telemetry is disabled
      return this.#instance;
    }

    const { Integrations, init, setExtra } = await import("@sentry/node");

    const linkedErrorsIntegration = new Integrations.LinkedErrors({
      key: "cause",
    });

    const transport = await getSubprocessTransport();

    init({
      dsn: SENTRY_DSN,
      transport,
      integrations: () => [linkedErrorsIntegration],
    });

    setExtra("nodeVersion", process.version);
    setExtra("hardhatVersion", await getHardhatVersion());

    return this.#instance;
  }

  public static deleteInstance(): void {
    // ATTENTION: only for testing
    this.#instance = undefined;
  }

  public async reportError(
    error: Error,
    verbose: boolean = false,
    configPath: string = "",
  ): Promise<boolean> {
    if (!(await this.canSendTelemetry(error))) {
      return false;
    }

    const { captureException, setExtra } = await import("@sentry/node");

    setExtra("verbose", verbose);
    setExtra("configPath", configPath);

    captureException(error);

    // TODO: where to run it?
    // await this.#sentry.flush(1000);

    return true;
  }

  private async canSendTelemetry(error: Error): Promise<boolean> {
    if (!this.#telemetryEnabled) {
      return false;
    }

    if (
      HardhatError.isHardhatError(error) &&
      !error.descriptor.shouldBeReported
    ) {
      return false;
    }

    if (HardhatPluginError.isHardhatPluginError(error)) {
      // Don't log errors from third-party plugins
      return false;
    }

    // TODO: enable when ready
    // We don't report network related errors
    // if (error instanceof ProviderError) {
    //   return false;
    // }

    return true;
  }
}
