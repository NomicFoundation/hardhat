import { extendConfig, extendProvider } from "hardhat/config";
import { createLedgerProvider } from "./internal/create-ledger-provider";

import "./type-extensions";

export * from "./errors";

extendConfig((config, userConfig) => {
  // set ledgerAccounts to the user configured value, or to [] if there isn't any
  for (const networkName of Object.keys(config.networks)) {
    config.networks[networkName].ledgerAccounts =
      userConfig.networks?.[networkName]?.ledgerAccounts ?? [];
  }
});

extendProvider(async (provider, config, network) => {
  const networkConfig = config.networks[network];
  return createLedgerProvider(provider, networkConfig);
});
