import { extendProvider } from "hardhat/config";
import { HardhatNetworkUserConfig } from "hardhat/types";
import { LedgerProvider } from "./provider";

extendProvider((provider, config, network) => {
  const networkConfig = config.networks[network] as HardhatNetworkUserConfig;
  const ledgerAccounts = networkConfig.ledgerAccounts || [];

  return new LedgerProvider({ accounts: ledgerAccounts }, provider);
});
