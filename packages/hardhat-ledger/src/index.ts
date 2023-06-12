import { extendProvider } from "hardhat/config";
import { HardhatNetworkUserConfig } from "hardhat/types";
import { createLedgerProvider } from "./internal/create-ledger-provider";

import "./type-extensions";

export * from "./errors";

extendProvider(async (provider, config, network) => {
  const networkConfig = config.networks[network] as HardhatNetworkUserConfig;
  return createLedgerProvider(provider, networkConfig);
});
