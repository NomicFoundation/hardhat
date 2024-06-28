import path from "node:path";

import { ensureDir } from "@ignored/hardhat-vnext-utils/fs";

export async function getCompilersDir(): Promise<string> {
  const cache = await getCacheDir();
  // Note: we introduce `-v2` to invalidate all the previous compilers at once
  const compilersCache = path.join(cache, "compilers-v2");
  await ensureDir(compilersCache);
  return compilersCache;
}

export async function getCacheDir(): Promise<string> {
  const { cache } = await generatePaths();
  await ensureDir(cache);
  return cache;
}

async function generatePaths(packageName = "hardhat") {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}
