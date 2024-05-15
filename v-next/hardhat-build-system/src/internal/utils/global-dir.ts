import path from "node:path";

import fs from "fs-extra";

export async function getCompilersDir() {
  const cache = await getCacheDir();
  // Note: we introduce `-v2` to invalidate all the previous compilers at once
  const compilersCache = path.join(cache, "compilers-v2");
  await fs.ensureDir(compilersCache);
  return compilersCache;
}

export async function getCacheDir(): Promise<string> {
  const { cache } = await generatePaths();
  await fs.ensureDir(cache);
  return cache;
}

async function generatePaths(packageName = "hardhat") {
  const { default: envPaths } = await import("env-paths");
  return envPaths(packageName);
}
