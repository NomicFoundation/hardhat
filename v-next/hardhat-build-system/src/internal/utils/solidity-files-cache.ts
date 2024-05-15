import * as path from "node:path";

import { ProjectPathsConfig } from "../types/config.js";

export const SOLIDITY_FILES_CACHE_FILENAME = "solidity-files-cache.json";

export function getSolidityFilesCachePath(paths: ProjectPathsConfig): string {
  return path.join(paths.cache, SOLIDITY_FILES_CACHE_FILENAME);
}
