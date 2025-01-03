import type { BuildInfo } from "../../../../../types/artifacts.js";

export interface TracingConfig {
  buildInfos?: BuildInfo[];
  ignoreContracts?: boolean;
}
