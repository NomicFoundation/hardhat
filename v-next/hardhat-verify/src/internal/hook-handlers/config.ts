import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
} from "hardhat/types/config";
import type {
  ConfigHooks,
  HardhatUserConfigValidationError,
} from "hardhat/types/hooks";

export default async (): Promise<Partial<ConfigHooks>> => ({
  extendUserConfig,
  validateUserConfig,
  resolveUserConfig,
});

export async function extendUserConfig(
  config: HardhatUserConfig,
  next: (nextConfig: HardhatUserConfig) => Promise<HardhatUserConfig>,
): Promise<HardhatUserConfig> {
  const extendedConfig = await next(config);

  return {
    ...extendedConfig,
  };
}

export async function validateUserConfig(
  _userConfig: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  return [];
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
  };
}
