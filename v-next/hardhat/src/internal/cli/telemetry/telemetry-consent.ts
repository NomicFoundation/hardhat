import path from "node:path";

import { isCi } from "@ignored/hardhat-vnext-utils/ci";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

import { confirmationPromptWithTimeout } from "../prompt/prompt.js";

interface TelemetryConsent {
  consent: boolean;
}

/**
 * Get the user's telemetry consent. If already provided, returns the answer.
 * If not, prompts the user.
 * Consent is only asked in interactive environments.
 * @param isHelpCommand Whether the command typed by the user is the help command or not.
 * @returns True if the user consents to telemetry, false otherwise.
 */
export async function getTelemetryConsent(
  isHelpCommand: boolean,
): Promise<boolean> {
  if (canTelemetryBeEnabled(isHelpCommand) === false) {
    return false;
  }

  const telemetryConsentFilePath = await getTelemetryConsentFilePath();

  if (await exists(telemetryConsentFilePath)) {
    // Telemetry consent was already provided, hence return the answer
    return (await readJsonFile<TelemetryConsent>(telemetryConsentFilePath))
      .consent;
  }

  // Telemetry consent not provided yet, ask for it
  return requestTelemetryConsent();
}

function canTelemetryBeEnabled(isHelpCommand: boolean): boolean {
  return (
    !isHelpCommand &&
    !isCi() &&
    process.stdout.isTTY === true &&
    process.env.HARDHAT_DISABLE_TELEMETRY_PROMPT !== "true"
  );
}

async function getTelemetryConsentFilePath() {
  const configDir = await getConfigDir();
  return path.join(configDir, "telemetry-consent.json");
}

async function requestTelemetryConsent(): Promise<boolean> {
  const consent = await confirmTelemetryConsent();

  if (consent === undefined) {
    return false;
  }

  // Store user's consent choice
  await writeJsonFile(await getTelemetryConsentFilePath(), { consent });

  // TODO: this will be enabled in a following PR as soon as the function to send telemetry is implemented
  // const subprocessFilePath = path.join(
  //   path.dirname(fileURLToPath(import.meta.url)),
  //   "report-telemetry-consent.js",
  // );
  // await spawnDetachedSubProcess(subprocessFilePath, [consent ? "yes" : "no"]);

  return consent;
}

async function confirmTelemetryConsent(): Promise<boolean | undefined> {
  return confirmationPromptWithTimeout(
    "telemetryConsent",
    "Help us improve Hardhat with anonymous crash reports & basic usage data?",
  );
}
