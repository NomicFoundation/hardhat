import path from "node:path";

import {
  move,
  readJsonFile,
  writeJsonFileAsStream,
} from "@nomicfoundation/hardhat-utils/fs";

export type CompileCache = Record<string, CompileCacheEntry>;

export interface CompileCacheEntry {
  jobHash: string;
  buildInfoPath: string;
  buildInfoOutputPath: string;
  artifactPaths: string[];
  typeFilePath: string;
}

const CACHE_FILE_NAME = `compile-cache.json`;

export function getCacheFilepath(
  basePath: string,
  namespace: string,
  version: string,
): string {
  return path.join(basePath, namespace, version, CACHE_FILE_NAME);
}

export async function loadCache(filePath: string): Promise<CompileCache> {
  let cache: CompileCache;

  try {
    cache = await readJsonFile(filePath);
  } catch (_error) {
    cache = {};
  }

  return cache;
}

export async function saveCache(
  filePath: string,
  cache: CompileCache,
): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  // NOTE: We are writing to a temporary file first because the value might
  // be large and we don't want to end up with corrupted files in the cache.
  await writeJsonFileAsStream(tmpPath, cache);
  await move(tmpPath, filePath);
}
