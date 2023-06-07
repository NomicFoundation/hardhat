import { extendProvider } from "hardhat/config";
import { HardhatNetworkUserConfig } from "hardhat/types";
import { LedgerProvider } from "./provider";
import { withSpinners } from "./internal/with-spinners";

extendProvider((provider, config, network) => {
  const networkConfig = config.networks[network] as HardhatNetworkUserConfig;
  const ledgerAccounts = networkConfig.ledgerAccounts || [];

  const ledgerProvider = new LedgerProvider(
    { accounts: ledgerAccounts },
    provider
  );

  withSpinners(ledgerProvider);

  return ledgerProvider;
});
