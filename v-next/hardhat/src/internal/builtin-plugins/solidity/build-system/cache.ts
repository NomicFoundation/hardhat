import path from "node:path";

import {
  move,
  readJsonFile,
  writeJsonFileAsStream,
} from "@nomicfoundation/hardhat-utils/fs";

/**
 * This object is used to store what source files produced which output files
 * and what was the last compiled jobHash (buildId) for the individual root file
 * The keys are the root file paths, as passed to the compile task. For project
 * files this would be the user source names.
 */
export type CompileCache = Record<string, CompileCacheEntry>;

export interface CompileCacheEntry {
  jobHash: string;
  buildInfoPath: string;
  buildInfoOutputPath: string;
  artifactPaths: string[];
  typeFilePath: string;
}

const CACHE_FILE_NAME = `compile-cache.json`;

export async function loadCache(cacheDirectory: string): Promise<CompileCache> {
  let cache: CompileCache;

  try {
    cache = await readJsonFile(path.join(cacheDirectory, CACHE_FILE_NAME));
  } catch (_error) {
    cache = {};
  }

  return cache;
}

export async function saveCache(
  cacheDirectory: string,
  cache: CompileCache,
): Promise<void> {
  const filePath = path.join(cacheDirectory, CACHE_FILE_NAME);
  const tmpPath = `${filePath}.tmp`;
  // NOTE: We are writing to a temporary file first because the value might
  // be large and we don't want to end up with corrupted files in the cache.
  await writeJsonFileAsStream(tmpPath, cache);
  await move(tmpPath, filePath);
}
