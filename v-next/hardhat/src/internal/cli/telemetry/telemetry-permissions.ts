import path from "node:path";

import { isCi } from "@nomicfoundation/hardhat-utils/ci";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import { getTelemetryDir } from "@nomicfoundation/hardhat-utils/global-dir";
import debug from "debug";

import { sendTelemetryConfigAnalytics } from "./analytics/analytics.js";

const log = debug("hardhat:cli:telemetry:telemetry-permissions");

interface TelemetryConfig {
  enabled: boolean;
}

/**
 * Checks whether telemetry is supported in the current environment and whether the user did not explicitly disable it.
 *
 * @param telemetryConfigFilePath - The path to the telemetry config file, which should only be provided in tests.
 * @returns True if the user did not explicitly disable telemetry and if current environment supports it, false otherwise.
 */
export async function isTelemetryAllowed(
  telemetryConfigFilePath?: string,
): Promise<boolean> {
  if (!isTelemetryAllowedInEnvironment()) {
    return false;
  }

  // ATTENTION: only for testing
  if (process.env.HARDHAT_TEST_TELEMETRY_ENABLED !== undefined) {
    return process.env.HARDHAT_TEST_TELEMETRY_ENABLED === "true" ? true : false;
  }

  return isTelemetryEnabled(telemetryConfigFilePath);
}

/**
 * Determines if telemetry is allowed in the current environment.
 * This function checks various environmental factors to decide if telemetry data can be collected.
 * It verifies that the environment is not a CI environment, that the terminal is interactive,
 * and that telemetry has not been explicitly disabled through an environment variable.
 *
 * @returns True if telemetry is allowed in the environment, false otherwise.
 */
export function isTelemetryAllowedInEnvironment(): boolean {
  const allowed =
    (!isCi() &&
      process.stdout.isTTY === true &&
      process.env.HARDHAT_DISABLE_TELEMETRY !== "true") ||
    // ATTENTION: used in tests to force telemetry execution
    process.env.HARDHAT_TEST_INTERACTIVE_ENV === "true";

  log(`Telemetry is allowed in the current environment: ${allowed}`);

  return allowed;
}

/**
 * Retrieves the user's telemetry enabled status from the config file.
 *
 * @param telemetryConfigFilePath - The path to the telemetry config file, which should only be provided in tests.
 * @returns True if the user did not explicitly disable telemetry, false otherwise.
 */
async function isTelemetryEnabled(
  telemetryConfigFilePath?: string,
): Promise<boolean> {
  telemetryConfigFilePath ??= await getTelemetryConfigFilePath();

  log(`Looking for telemetry config file at ${telemetryConfigFilePath}`);

  if (await exists(telemetryConfigFilePath)) {
    // Telemetry enabled value was explicitly set, hence return the answer
    const { enabled } = await readJsonFile<TelemetryConfig>(
      telemetryConfigFilePath,
    );
    log(`Telemetry enabeld value: ${enabled}`);

    return enabled;
  }

  log("No telemetry config file found, assuming telemetry is enabled");

  return true;
}

async function getTelemetryConfigFilePath() {
  const configDir = await getTelemetryDir();
  return path.join(configDir, "telemetry-config.json");
}

export async function setTelemetryEnabled(value: boolean): Promise<boolean> {
  log(`Storing telemetry enabled value: ${value}`);

  await writeJsonFile(await getTelemetryConfigFilePath(), { enabled: value });

  await sendTelemetryConfigAnalytics(value);

  return value;
}
