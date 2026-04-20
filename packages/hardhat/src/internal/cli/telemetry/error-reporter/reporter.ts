import type * as SentryReporterT from "../sentry/reporter.js";

// Sentry's reporter loads a large number of modules, so we only load it if
// needed.
let sentryReporterModule: typeof SentryReporterT | undefined;

// We cache the `setCliHardhatConfigPath` to avoid loading the reporter just
// for this setting. We load it and set the config path if needed.
let cliHardhatConfigPath: string | undefined;

/**
 * Reports an error if telemetry is authorized by the user.
 *
 * While this function is async, it's expected to always complete quickly,
 * delegating the actual reporting to a subprocess.
 */
export async function sendErrorTelemetry(error: Error): Promise<void> {
  if (sentryReporterModule === undefined) {
    sentryReporterModule = await import("../sentry/reporter.js");
  }

  if (cliHardhatConfigPath !== undefined) {
    sentryReporterModule.setCliHardhatConfigPath(cliHardhatConfigPath);
  }

  await sentryReporterModule.sendErrorTelemetry(error);
}

/**
 * Sets the config path used in the Hardhat CLI. This is used for better
 * anonymization of errors.
 */
export function setCliHardhatConfigPath(configPath: string): void {
  cliHardhatConfigPath = configPath;
}
