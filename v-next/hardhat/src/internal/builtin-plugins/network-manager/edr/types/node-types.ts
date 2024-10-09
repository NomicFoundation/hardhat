import type { BuildInfo } from "../../../../../types/artifacts.js";
import type { HARDHAT_MEMPOOL_SUPPORTED_ORDERS } from "../../../../constants.js";

export interface TracingConfig {
  buildInfos?: BuildInfo[];
  ignoreContracts?: boolean;
}

export type MempoolOrder = (typeof HARDHAT_MEMPOOL_SUPPORTED_ORDERS)[number];
