import path from "node:path";

import { isCi } from "@ignored/hardhat-vnext-utils/ci";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import { getTelemetryDir } from "@ignored/hardhat-vnext-utils/global-dir";
import debug from "debug";

import { confirmationPromptWithTimeout } from "../prompt/prompt.js";

import { sendTelemetryConsentAnalytics } from "./analytics/analytics.js";

const log = debug("hardhat:cli:telemetry:telemetry-permissions");

interface TelemetryConsent {
  consent: boolean;
}

/**
 * Ensure that the user's telemetry consent is set. If the consent is already provided, returns the answer.
 * If not, prompts the user to provide it.
 * Consent is only asked in interactive environments.
 *
 * @param telemetryConsentFilePath - The path to the telemetry consent file,
 * which should only be provided in tests.
 * @returns True if the user consents to telemetry and if current environment supports telemetry, false otherwise.
 */
export async function ensureTelemetryConsent(
  telemetryConsentFilePath?: string,
): Promise<boolean> {
  log("Ensuring that user has provided telemetry consent");

  if (!isTelemetryAllowedInEnvironment()) {
    return false;
  }

  const consent = await getTelemetryConsent(telemetryConsentFilePath);
  if (consent !== undefined) {
    return consent;
  }

  // Telemetry consent not provided yet, ask for it
  return requestTelemetryConsent();
}

/**
 * Checks whether telemetry is supported in the current environment and whether the user has provided consent.
 *
 * @param telemetryConsentFilePath - The path to the telemetry consent file,
 * which should only be provided in tests.
 * @returns True if the user consents to telemetry and if current environment supports telemetry, false otherwise.
 */
export async function isTelemetryAllowed(
  telemetryConsentFilePath?: string,
): Promise<boolean> {
  if (!isTelemetryAllowedInEnvironment()) {
    return false;
  }

  // ATTENTION: only for testing
  if (process.env.HARDHAT_TEST_TELEMETRY_CONSENT_VALUE !== undefined) {
    return process.env.HARDHAT_TEST_TELEMETRY_CONSENT_VALUE === "true"
      ? true
      : false;
  }

  const consent = await getTelemetryConsent(telemetryConsentFilePath);
  log(`Telemetry consent value: ${consent}`);

  return consent !== undefined ? consent : false;
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
      process.env.HARDHAT_DISABLE_TELEMETRY_PROMPT !== "true") ||
    // ATTENTION: used in tests to force telemetry execution
    process.env.HARDHAT_TEST_INTERACTIVE_ENV === "true";

  log(`Telemetry is allowed in the current environment: ${allowed}`);

  return allowed;
}

/**
 * Retrieves the user's telemetry consent status from the consent file.
 *
 * @param telemetryConsentFilePath - The path to the telemetry consent file,
 * which should only be provided in tests.
 * @returns True if the user consents to telemetry, false if they do not consent,
 * and undefined if no consent has been provided.
 */
async function getTelemetryConsent(telemetryConsentFilePath?: string) {
  telemetryConsentFilePath ??= await getTelemetryConsentFilePath();

  log(`Looking for telemetry consent file at ${telemetryConsentFilePath}`);

  if (await exists(telemetryConsentFilePath)) {
    // Telemetry consent was already provided, hence return the answer
    const consent = (
      await readJsonFile<TelemetryConsent>(telemetryConsentFilePath)
    ).consent;

    log(`Telemetry consent value: ${consent}`);

    return consent;
  }

  log("No telemetry consent file found");

  return undefined;
}

async function getTelemetryConsentFilePath() {
  const configDir = await getTelemetryDir();
  return path.join(configDir, "telemetry-consent.json");
}

async function requestTelemetryConsent(): Promise<boolean> {
  const consent = await confirmTelemetryConsent();

  if (consent === undefined) {
    return false;
  }

  log(`Storing telemetry consent with value: ${consent}`);

  await writeJsonFile(await getTelemetryConsentFilePath(), { consent });

  await sendTelemetryConsentAnalytics(consent);

  return consent;
}

async function confirmTelemetryConsent(): Promise<boolean | undefined> {
  return confirmationPromptWithTimeout(
    "telemetryConsent",
    "Help us improve Hardhat with anonymous crash reports & basic usage data?",
  );
}
