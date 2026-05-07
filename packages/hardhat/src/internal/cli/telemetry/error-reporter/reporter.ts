import type * as ClassifierT from "../error-classification/classifier.js";
import type * as FilterT from "../error-classification/filter.js";
import type * as SentryReporterT from "../sentry/reporter.js";

// Sentry's reporter loads a large number of modules, so we only load it if
// needed.
let sentryReporterModule: typeof SentryReporterT | undefined;

// The classifier and filter modules are small, but they may import many
// unrelated things top-level to do their job, so we also load them lazily.
let classifierModule: typeof ClassifierT | undefined;
let filterModule: typeof FilterT | undefined;

// We cache the `setCliHardhatConfigPath` to avoid loading the reporter just
// for this setting. We load it and set the config path if needed.
let cliHardhatConfigPath: string | undefined;

/**
 * Reports an error if telemetry is authorized by the user.
 *
 * While this function is async, it's expected to always complete quickly,
 * delegating the actual reporting to a subprocess.
 *
 * @param error - The error to report.
 * @param hint - Optional metadata describing how the error was captured, used
 *   to tag the event in Sentry so unhandled crashes can be distinguished from
 *   errors caught and reported by the CLI.
 * @param hint.unhandled - Whether the error reached a global handler without
 *   being caught (e.g. an uncaught exception or unhandled promise rejection).
 *   Defaults to `false` (i.e. the error was handled).
 * @param hint.mechanismType - The Sentry mechanism type, used as a tag on the
 *   event. Common values are `"onuncaughtexception"`, `"onunhandledrejection"`,
 *   `"instrument"`, and `"generic"`. Defaults to `"generic"`.
 */
export async function sendErrorTelemetry(
  error: Error,
  hint?: { unhandled?: boolean; mechanismType?: string },
): Promise<void> {
  if (classifierModule === undefined) {
    classifierModule = await import("../error-classification/classifier.js");
  }

  if (filterModule === undefined) {
    filterModule = await import("../error-classification/filter.js");
  }

  const category = classifierModule.classifyError(error);

  if (!filterModule.shouldBeReported(error, category)) {
    return;
  }

  if (sentryReporterModule === undefined) {
    sentryReporterModule = await import("../sentry/reporter.js");
  }

  if (cliHardhatConfigPath !== undefined) {
    sentryReporterModule.setCliHardhatConfigPath(cliHardhatConfigPath);
  }

  await sentryReporterModule.sendErrorTelemetry(error, hint);
}

/**
 * Sets the config path used in the Hardhat CLI. This is used for better
 * anonymization of errors.
 */
export function setCliHardhatConfigPath(configPath: string): void {
  cliHardhatConfigPath = configPath;
}
