import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatEthersNetworkConfig,
  HardhatUserConfig,
  NetworkConfig,
  NetworkUserConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig,
});

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  const errors: HardhatUserConfigValidationError[] = [];

  for (const [networkName, networkConfig] of Object.entries(
    userConfig.networks ?? {},
  )) {
    if (networkConfig.ethers === undefined) {
      continue;
    }

    const path = ["networks", networkName, "ethers"];

    if (!isObject(networkConfig.ethers)) {
      errors.push({
        path,
        message: "ethers must be an object",
      });
      continue;
    }

    if (
      networkConfig.ethers.waitForTransactionReceipts !== undefined &&
      typeof networkConfig.ethers.waitForTransactionReceipts !== "boolean"
    ) {
      errors.push({
        path: [...path, "waitForTransactionReceipts"],
        message: "waitForTransactionReceipts must be a boolean",
      });
    }
  }

  return errors;
}

export async function resolveUserConfig(
  userConfig: HardhatUserConfig,
  resolveConfigurationVariable: ConfigurationVariableResolver,
  next: (
    nextUserConfig: HardhatUserConfig,
    nextResolveConfigurationVariable: ConfigurationVariableResolver,
  ) => Promise<HardhatConfig>,
): Promise<HardhatConfig> {
  const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

  const networks: Record<string, NetworkConfig> = {};

  for (const [networkName, networkConfig] of Object.entries(
    resolvedConfig.networks,
  )) {
    networks[networkName] = {
      ...networkConfig,
      ethers: resolveHardhatEthersNetworkConfig(
        userConfig.networks?.[networkName]?.ethers,
      ),
    };
  }

  return {
    ...resolvedConfig,
    networks,
  };
}

function resolveHardhatEthersNetworkConfig(
  userConfig: NetworkUserConfig["ethers"] = {},
): HardhatEthersNetworkConfig {
  return {
    waitForTransactionReceipts: userConfig.waitForTransactionReceipts ?? false,
  };
}
