import { extendProvider } from "hardhat/config";
import { createLedgerProvider } from "./internal/create-ledger-provider";

import "./type-extensions";

export * from "./errors";

extendProvider(async (provider, config, network) => {
  const networkConfig = config.networks[network];
  return createLedgerProvider(provider, networkConfig);
});
