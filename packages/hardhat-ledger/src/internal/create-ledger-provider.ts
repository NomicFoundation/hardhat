import { EIP1193Provider, NetworkConfig } from "hardhat/types";

import { LedgerProvider } from "../provider";
import { withSpinners } from "./with-spinners";

export function createLedgerProvider(
  provider: EIP1193Provider,
  networkConfig: NetworkConfig
): LedgerProvider {
  const accounts = networkConfig.ledgerAccounts;
  const derivationFunction = networkConfig.ledgerOptions?.derivationFunction;

  const ledgerProvider = new LedgerProvider(
    { accounts, derivationFunction },
    provider
  );

  return withSpinners(ledgerProvider);
}
