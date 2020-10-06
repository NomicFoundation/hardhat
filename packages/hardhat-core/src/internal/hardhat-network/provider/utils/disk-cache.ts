import path from "path";

import { ResolvedProjectPaths } from "../../../../types";

export function getForkCacheDirPath(paths: ResolvedProjectPaths): string {
  return path.join(paths.cache, "hardhat-network-fork");
}
