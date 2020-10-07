import path from "path";

import { ProjectPaths } from "../../../../types";

export function getForkCacheDirPath(paths: ProjectPaths): string {
  return path.join(paths.cache, "hardhat-network-fork");
}
