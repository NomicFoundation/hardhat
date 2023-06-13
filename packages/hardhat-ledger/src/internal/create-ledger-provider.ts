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

  if (isNetworkConfig(networkConfig)) {
    accounts =
      networkConfig.ledgerAccounts === undefined
        ? []
        : networkConfig.ledgerAccounts;
  }

  const ledgerProvider = new LedgerProvider({ accounts }, provider);

  return withSpinners(ledgerProvider);
}

function isNetworkConfig(
  config: NetworkConfig
): config is HardhatNetworkConfig {
  return !("url" in config);
}
