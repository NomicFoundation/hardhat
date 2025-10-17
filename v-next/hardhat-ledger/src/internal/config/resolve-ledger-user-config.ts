import type { HardhatUserConfig } from "hardhat/config";
import type { HardhatConfig } from "hardhat/types/config";

export function resolveLedgerUserConfig(
  userConfig: HardhatUserConfig,
  resolvedConfig: HardhatConfig,
): HardhatConfig {
  if (userConfig.networks === undefined) {
    return resolvedConfig;
  }

  const resolvedConfigCopy = { ...resolvedConfig };

  for (const [networkName, network] of Object.entries(
    resolvedConfigCopy.networks,
  )) {
    network.ledgerAccounts =
      userConfig.networks[networkName].ledgerAccounts ?? [];
    network.ledgerOptions = userConfig.networks[networkName].ledgerOptions;
  }

  return resolvedConfigCopy;
}
