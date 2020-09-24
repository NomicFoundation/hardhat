import { DeepReadonly } from "ts-essentials";

import { HardhatConfig, ResolvedHardhatConfig } from "./config";
import { HardhatRuntimeEnvironment } from "./runtime";

/**
 * A function that receives a HardhatRuntimeEnvironment and
 * modify its properties or add new ones.
 */
export type EnvironmentExtender = (env: HardhatRuntimeEnvironment) => void;

export type ConfigExtender = (
  config: ResolvedHardhatConfig,
  userConfig: DeepReadonly<HardhatConfig>
) => void;
