import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatEthersNetworkConfig,
  HardhatEthersNetworkUserConfig,
  HardhatUserConfig,
  NetworkConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { validateUserConfigZodType } from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

const ethersUserConfigSchema = z.object({
  ethers: z
    .object({
      waitForTransactionReceipt: z.boolean().optional(),
    })
    .optional(),
});

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig,
});

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  if (userConfig.networks === undefined) {
    return [];
  }

  const networksErrors: HardhatUserConfigValidationError[] = [];

  for (const [networkName, network] of Object.entries(userConfig.networks)) {
    if (!isObject(network)) {
      continue;
    }

    const errors = validateUserConfigZodType(
      { ethers: network.ethers },
      ethersUserConfigSchema,
    ).map((err) => {
      err.message = `network "${networkName}" - ${err.message}`;
      return err;
    });

    networksErrors.push(...errors);
  }

  return networksErrors;
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
  userConfig: HardhatEthersNetworkUserConfig = {},
): HardhatEthersNetworkConfig {
  return {
    waitForTransactionReceipt: userConfig.waitForTransactionReceipt ?? false,
  };
}
