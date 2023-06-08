import { EIP1193Provider, HardhatNetworkUserConfig } from "hardhat/src/types";

import { withSpinners } from "./with-spinners";
import { LedgerProvider } from "../provider";

export function createLedgerProvider(
  provider: EIP1193Provider,
  networkConfig: HardhatNetworkUserConfig
): LedgerProvider {
  const accounts = networkConfig.ledgerAccounts || [];
  const ledgerProvider = new LedgerProvider({ accounts }, provider);

  return withSpinners(ledgerProvider);
}
