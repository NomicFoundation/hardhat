import {
  HardhatError,
  HardhatPluginError,
} from "@nomicfoundation/hardhat-errors";
import debug from "debug";

import {
  ProviderError,
  UnknownError,
} from "../../../builtin-plugins/network-manager/provider-errors.js";
import { getHardhatVersion } from "../../../utils/package.js";
import { isTelemetryAllowed } from "../telemetry-permissions.js";

const log = debug("hardhat:cli:telemetry:sentry:reporter");

// export const SENTRY_DSN =
//   "https://d578a176729662a28e7a8da268d36912@o385026.ingest.us.sentry.io/4507685793103872"; // DEV
export const SENTRY_DSN =
  "https://572b03708e298427cc72fc26dac1e8b2@o385026.ingest.us.sentry.io/4508780138856448"; // PROD

// TODO: This could be done in a more elegant way, but for now, we just
// initialize the entire reporter so that it sets the global error handlers.
export async function setupErrorTelemetryIfEnabled(): Promise<void> {
  await Reporter.getInstance(true);
}

export async function sendErrorTelemetry(error: Error): Promise<boolean> {
  const instance = await Reporter.getInstance();
  return instance.reportErrorViaSubprocess(error);
}

export function setCliHardhatConfigPath(configPath: string): void {
  Reporter.setHardhatConfigPath(configPath);
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

  static #hardhatConfigPath?: string;
  static #instance: Reporter | undefined;
  readonly #telemetryEnabled: boolean;

  private constructor(telemetryAllowed: boolean) {
    this.#telemetryEnabled = telemetryAllowed;
  }

  public static setHardhatConfigPath(configPath: string): void {
    this.#hardhatConfigPath = configPath;
  }

  public static async getInstance(
    shouldSetupErrorHandlers = false,
  ): Promise<Reporter> {
    if (this.#instance !== undefined) {
      return this.#instance;
    }

    const telemetryAllowed = await isTelemetryAllowed();
    this.#instance = new Reporter(telemetryAllowed);

    if (!telemetryAllowed) {
      // No need to initialize Sentry because telemetry is disabled
      log("Reporter not initialized because telemetry is not allowed");
      return this.#instance;
    }

    log("Initializing Reporter instance");

    const { setExtra } = await import("@sentry/core");

    const hardhatVersion = await getHardhatVersion();
    const { init } = await import("./init.js");
    const { createDetachedProcessTransport } = await import("./transport.js");

    const release = `hardhat@${hardhatVersion}`;
    const environment = "production";

    init({
      dsn: SENTRY_DSN,
      transport: createDetachedProcessTransport(
        SENTRY_DSN,
        release,
        environment,
        this.#hardhatConfigPath,
      ),
      release,
      environment,
      installGlobalHandlers: shouldSetupErrorHandlers,
    });

    setExtra("nodeVersion", process.version);
    setExtra("hardhatVersion", hardhatVersion);

    return this.#instance;
  }

  public static deleteInstance(): void {
    // ATTENTION: only for testing
    this.#instance = undefined;
  }

  public async reportErrorViaSubprocess(error: Error): Promise<boolean> {
    if (!(await this.#shouldBeReported(error))) {
      log("Error not send: this type of error should not be reported");
      return false;
    }

    const { captureException } = await import("@sentry/core");

    log("Capturing exception");

    captureException(error);

    return true;
  }

  async #shouldBeReported(error: Error): Promise<boolean> {
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

    if (
      ProviderError.isProviderError(error) &&
      error.code !== UnknownError.CODE
    ) {
      // We don't report known network related errors
      return false;
    }

    return true;
  }
}
