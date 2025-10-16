import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  EtherscanConfig,
  EtherscanUserConfig,
  BlockscoutUserConfig,
  BlockscoutConfig,
  SourcifyUserConfig,
  SourcifyConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import {
  conditionalUnionType,
  sensitiveStringSchema,
  validateUserConfigZodType,
} from "@nomicfoundation/hardhat-zod-utils";
import { z } from "zod";

export default async (): Promise<Partial<ConfigHooks>> => ({
  validateUserConfig,
  resolveUserConfig,
});

const userConfigType = z.object({
  verify: z
    .object({
      blockscout: z
        .object({
          enabled: z.boolean().optional(),
        })
        .optional(),
      etherscan: conditionalUnionType(
        [
          [
            (data) => isObject(data) && data.enabled === false,
            z.object({
              apiKey: sensitiveStringSchema.optional(),
              enabled: z.literal(false),
            }),
          ],
          [
            (data) =>
              isObject(data) &&
              (data.enabled === undefined || data.enabled === true),
            z.object({
              apiKey: sensitiveStringSchema,
              enabled: z.literal(true).optional(),
            }),
          ],
        ],
        "Expected an object with an 'apiKey' property and an optional 'enabled' boolean property",
      ).optional(),
      sourcify: z
        .object({
          repoUrl: z.string().optional(),
          apiUrl: z.string().optional(),
          enabled: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function validateUserConfig(
  userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return validateUserConfigZodType(userConfig, userConfigType);
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

  return {
    ...resolvedConfig,
    verify: {
      ...resolvedConfig.verify,
      blockscout: resolveBlockscoutConfig(userConfig.verify?.blockscout),
      etherscan: resolveEtherscanConfig(
        userConfig.verify?.etherscan,
        resolveConfigurationVariable,
      ),
      sourcify: resolveSourcifyConfig(userConfig.verify?.sourcify),
    },
  };
}

function resolveBlockscoutConfig(
  blockscoutConfig: BlockscoutUserConfig | undefined = {
    enabled: true,
  },
): BlockscoutConfig {
  return {
    enabled: blockscoutConfig.enabled ?? true,
  };
}

function resolveEtherscanConfig(
  etherscanConfig: EtherscanUserConfig | undefined = {
    apiKey: "",
    enabled: true,
  },
  resolveConfigurationVariable: ConfigurationVariableResolver,
): EtherscanConfig {
  return {
    apiKey: resolveConfigurationVariable(etherscanConfig.apiKey ?? ""),
    enabled: etherscanConfig.enabled ?? true,
  };
}

function resolveSourcifyConfig(
  sourcifyConfig: SourcifyUserConfig | undefined = {
    enabled: true,
  },
): SourcifyConfig {
  return {
    repoUrl: sourcifyConfig.repoUrl,
    apiUrl: sourcifyConfig.apiUrl,
    enabled: sourcifyConfig.enabled ?? true,
  };
}
