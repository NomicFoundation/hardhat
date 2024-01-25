import { extendConfig, extendProvider } from "hardhat/config";

import "./type-extensions";

export * from "./errors";

extendConfig((config, userConfig) => {
  // set ledgerAccounts to the user configured value, or to [] if there isn't any
  for (const networkName of Object.keys(config.networks)) {
    config.networks[networkName].ledgerOptions = userConfig.networks?.[
      networkName
    ]?.ledgerOptions ?? { accounts: [] };
  }
});

extendProvider(async (provider, config, network) => {
  const { createLedgerProvider } = await import(
    "./internal/create-ledger-provider"
  );

  const networkConfig = config.networks[network];
  return createLedgerProvider(provider, networkConfig);
});
