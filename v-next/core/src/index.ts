import { HardhatRuntimeEnvironmentImplementation } from "./internal/hre.js";
import { HardhatUserConfig } from "./types/config.js";
import { HardhatRuntimeEnvironment } from "./types/hre.js";

/**
 * Creates an instances of the Hardhat Runtime Environment.
 */
export async function createHardhatRuntimeEnvironment(
  config: HardhatUserConfig,
): Promise<HardhatRuntimeEnvironment> {
  return HardhatRuntimeEnvironmentImplementation.create(config);
}
