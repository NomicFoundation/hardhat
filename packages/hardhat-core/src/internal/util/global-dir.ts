import debug from "debug";
import type envPathsT from "env-paths";
import fs from "fs-extra";
import os from "os";
import path from "path";

const log = debug("hardhat:core:global-dir");

async function generatePaths() {
  const { default: envPaths } = await import("env-paths");
  return envPaths("hardhat");
}

function generatePathsSync() {
  const envPaths: typeof envPathsT = require("env-paths");
  return envPaths("hardhat");
}

async function getConfigDir(): Promise<string> {
  const { config } = await generatePaths();
  await fs.ensureDir(config);
  return config;
}

function getConfigDirSync(): string {
  const { config } = generatePathsSync();
  fs.ensureDirSync(config);
  return config;
}

async function getDataDir(): Promise<string> {
  const { data } = await generatePaths();
  await fs.ensureDir(data);
  return data;
}

export async function getCacheDir(): Promise<string> {
  const { cache } = await generatePaths();
  await fs.ensureDir(cache);
  return cache;
}

export async function readAnalyticsId() {
  const globalDataDir = await getDataDir();
  const idFile = path.join(globalDataDir, "analytics.json");
  return readId(idFile);
}

// TODO-HH: we have two "legacies" now
export function readLegacyAnalyticsId() {
  const oldIdFile = path.join(os.homedir(), ".buidler", "config.json");
  return readId(oldIdFile);
}

async function readId(idFile: string) {
  log(`Looking up Client Id at ${idFile}`);
  let clientId: string;
  try {
    const data = await fs.readJSON(idFile, { encoding: "utf8" });
    clientId = data.analytics.clientId;
  } catch (error) {
    return null;
  }

  log(`Client Id found: ${clientId}`);
  return clientId;
}

export async function writeAnalyticsId(clientId: string) {
  const globalDataDir = await getDataDir();
  const idFile = path.join(globalDataDir, "analytics.json");
  await fs.writeJSON(
    idFile,
    {
      analytics: {
        clientId,
      },
    },
    { encoding: "utf-8" }
  );
  log(`Stored clientId ${clientId}`);
}

export async function getCompilersDir() {
  const cache = await getCacheDir();
  const compilersCache = path.join(cache, "compilers");
  await fs.ensureDir(compilersCache);
  return compilersCache;
}

/**
 * Checks if the user has given (or refused) consent for telemetry.
 *
 * Returns undefined if it can't be determined.
 */
export function hasConsentedTelemetry(): boolean | undefined {
  const configDir = getConfigDirSync();
  const telemetryConsentPath = path.join(configDir, "telemetry-consent.json");

  const fileExists = fs.pathExistsSync(telemetryConsentPath);

  if (!fileExists) {
    return undefined;
  }

  const { consent } = fs.readJSONSync(telemetryConsentPath);
  return consent;
}

export function writeTelemetryConsent(consent: boolean) {
  const configDir = getConfigDirSync();
  const telemetryConsentPath = path.join(configDir, "telemetry-consent.json");

  fs.writeJSONSync(telemetryConsentPath, { consent });
}
