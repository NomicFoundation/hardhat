import type { ProjectPathsConfig } from "../types/config.js";

import * as path from "node:path";

export const SOLIDITY_FILES_CACHE_FILENAME = "solidity-files-cache.json";

export function getSolidityFilesCachePath(paths: ProjectPathsConfig): string {
  return path.join(paths.cache, SOLIDITY_FILES_CACHE_FILENAME);
}
