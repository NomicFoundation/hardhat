import { AutomaticGasPriceProvider } from "hardhat/internal/core/providers/gas-providers";
import {
  EIP1193Provider,
  HardhatNetworkConfig,
  NetworkConfig,
} from "hardhat/types";

import { LedgerProvider } from "../provider";
import { withSpinners } from "./with-spinners";

export function createLedgerProvider(
  provider: EIP1193Provider,
  networkConfig: NetworkConfig
): LedgerProvider {
  let accounts: string[] = [];

  if (isHardhatNetworkConfig(networkConfig)) {
    accounts =
      networkConfig.ledgerAccounts === undefined
        ? []
        : networkConfig.ledgerAccounts;
  }

  let ledgerProvider = new LedgerProvider({ accounts }, provider);

  if (isHardhatNetworkConfig(networkConfig)) {
    // Hardhat doesn't apply the AutomaticGasPriceProvider wrapper when
    // the in-process network is being used, so we add it here,
    // otherwise users have to specify a gas price when using a
    // ledger account with the hardhat network
    ledgerProvider = new AutomaticGasPriceProvider(ledgerProvider) as any;
  }

  return withSpinners(ledgerProvider);
}

function isHardhatNetworkConfig(
  config: NetworkConfig
): config is HardhatNetworkConfig {
  return !("url" in config);
}
