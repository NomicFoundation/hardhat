import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
} from "hardhat/types/config";
import type { ConfigHooks } from "hardhat/types/hooks";

export default async (): Promise<Partial<ConfigHooks>> => ({
  resolveUserConfig,
});

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
