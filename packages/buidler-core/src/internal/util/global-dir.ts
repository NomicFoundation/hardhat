import debug from "debug";
import fs from "fs-extra";
import os from "os";
import path from "path";

const log = debug("buidler:core:global-dir");

async function generatePaths() {
  const { default: envPaths } = await import("env-paths");
  return envPaths("buidler");
}

async function getConfigDir(): Promise<string> {
  const { config } = await generatePaths();
  await fs.ensureDir(config);
  return config;
}

async function getDataDir(): Promise<string> {
  const { data } = await generatePaths();
  await fs.ensureDir(data);
  return data;
}

async function getCacheDir(): Promise<string> {
  const { cache } = await generatePaths();
  await fs.ensureDir(cache);
  return cache;
}

export async function readAnalyticsId() {
  const globalDataDir = await getDataDir();
  const idFile = path.join(globalDataDir, "analytics.json");
  return readId(idFile);
}

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
