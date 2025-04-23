import type {
  ConfigurationVariableResolver,
  HardhatConfig,
  HardhatUserConfig,
  IgnitionUserConfig,
} from "hardhat/types/config";
import type { ConfigHooks } from "hardhat/types/hooks";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

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

  const updatedNetworks = Object.fromEntries(
    Object.entries(resolvedConfig.networks).map(
      ([networkName, networkConfig]) => {
        assertHardhatInvariant(
          userConfig.networks !== undefined,
          "Networks are undefined",
        );

        const givenIgnition = userConfig.networks[networkName].ignition ?? {};

        return [
          networkName,
          {
            ...networkConfig,
            ignition: {
              maxFeePerGasLimit: givenIgnition.maxFeePerGasLimit,
              maxPriorityFeePerGas: givenIgnition.maxPriorityFeePerGas,
              gasPrice: givenIgnition.gasPrice,
              disableFeeBumping: givenIgnition.disableFeeBumping,
              explorerUrl: givenIgnition.explorerUrl,
            },
          },
        ];
      },
    ),
  );

  const paths = resolvedConfig.paths ?? {};
  const ignition: IgnitionUserConfig = userConfig.ignition ?? {};

  return {
    ...resolvedConfig,
    networks: updatedNetworks,
    paths: {
      ...paths,
      ignition: resolveFromRoot(
        resolvedConfig.paths.root,
        userConfig.paths?.ignition ?? "ignition",
      ),
    },
    ignition: {
      ...ignition,
    },
  };
}
