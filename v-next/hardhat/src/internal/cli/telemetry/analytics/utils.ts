import type { AnalyticsFile } from "./types.js";

import os from "node:os";
import path from "node:path";

import { getTelemetryDir } from "@ignored/hardhat-vnext-core/global-dir";
import {
  exists,
  readJsonFile,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

const ANALYTICS_FILE_NAME = "analytics.json";

export async function getClientId(): Promise<string> {
  let clientId = await readAnalyticsId();

  if (clientId === undefined) {
    // If the clientId is not undefined and it is of type "firstLegacy" or "secondLegacy," store it in the new file format
    clientId =
      (await readSecondLegacyAnalyticsId()) ??
      (await readFirstLegacyAnalyticsId());

    if (clientId === undefined) {
      const { v4: uuid } = await import("uuid");
      // TODO:log log("Client Id not found, generating a new one");
      clientId = uuid();
    }

    await writeAnalyticsId(clientId);
  }

  return clientId;
}

async function readAnalyticsId(): Promise<string | undefined> {
  const globalTelemetryDir = await getTelemetryDir();
  const filePath = path.join(globalTelemetryDir, ANALYTICS_FILE_NAME);
  return readId(filePath);
}

/**
 * This is the first way that the analytics id was saved.
 */
function readFirstLegacyAnalyticsId(): Promise<string | undefined> {
  const oldIdFile = path.join(os.homedir(), ".buidler", "config.json");
  return readId(oldIdFile);
}

/**
 * This is the same way the analytics id is saved now, but using buidler as the
 * name of the project for env-paths
 */
async function readSecondLegacyAnalyticsId(): Promise<string | undefined> {
  const globalTelemetryDir = await getTelemetryDir("buidler");
  const filePath = path.join(globalTelemetryDir, ANALYTICS_FILE_NAME);
  return readId(filePath);
}

async function writeAnalyticsId(clientId: string): Promise<void> {
  const globalTelemetryDir = await getTelemetryDir();
  const filePath = path.join(globalTelemetryDir, ANALYTICS_FILE_NAME);
  await writeJsonFile(filePath, {
    analytics: {
      clientId,
    },
  });

  // TODO:log log(`Stored clientId ${clientId}`);
}

async function readId(filePath: string): Promise<string | undefined> {
  // TODO:log log(`Looking up Client Id at ${filePath}`);

  if ((await exists(filePath)) === false) {
    return undefined;
  }

  const data: AnalyticsFile = await readJsonFile(filePath);

  const clientId = data.analytics.clientId;

  // TODO:log log(`Client Id found: ${clientId}`);
  return clientId;
}
