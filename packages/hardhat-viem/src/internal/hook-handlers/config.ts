import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
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
  if (!isObject(userConfig.chainDescriptors)) {
    return [];
  }

  const errors: HardhatUserConfigValidationError[] = [];

  for (const [chainId, descriptor] of Object.entries(
    userConfig.chainDescriptors,
  )) {
    if (!isObject(descriptor) || descriptor.viemChain === undefined) {
      continue;
    }

    const { viemChain } = descriptor;

    if (!isObject(viemChain)) {
      errors.push({
        path: ["chainDescriptors", chainId, "viemChain"],
        message: "Expected a viem Chain object",
      });
      continue;
    }

    // A bigint or string id would print the same as the expected number in the
    // mismatch message below, so we report its type instead
    if (typeof viemChain.id !== "number") {
      errors.push({
        path: ["chainDescriptors", chainId, "viemChain", "id"],
        message: `Expected number, received ${typeof viemChain.id}`,
      });
      continue;
    }

    // Number() accepts both decimal and hex chain ids, and never throws
    const expectedChainId = Number(chainId);
    if (viemChain.id !== expectedChainId) {
      errors.push({
        path: ["chainDescriptors", chainId, "viemChain", "id"],
        message: `Expected ${expectedChainId}, the chain descriptor's chain id, but got ${viemChain.id}`,
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

  for (const [chainId, userDescriptor] of Object.entries(
    userConfig.chainDescriptors ?? {},
  )) {
    if (userDescriptor.viemChain !== undefined) {
      const descriptor = resolvedConfig.chainDescriptors.get(BigInt(chainId));
      if (descriptor !== undefined) {
        descriptor.viemChain = userDescriptor.viemChain;
      }
    }
  }

  return resolvedConfig;
}
