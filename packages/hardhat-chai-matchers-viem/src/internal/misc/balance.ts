import type { WalletClient } from "viem";

import { getAddressOf } from "./account";

export interface BalanceChangeOptions {
  includeFee?: boolean;
}

export function getAddresses(
  accounts: Array<WalletClient | { address: `0x${string}` } | `0x${string}`>
) {
  return Promise.all(accounts.map((account) => getAddressOf(account)));
}

export async function getBalances(
  accounts: Array<WalletClient | { address: `0x${string}` } | `0x${string}`>,
  blockNumber?: bigint
): Promise<bigint[]> {
  const { network } = await import("hardhat");
  const { hexToBigInt } = await import("viem");
  const provider = network.provider;

  return Promise.all(
    accounts.map(async (account) => {
      const address = await getAddressOf(account);
      const result = await provider.send("eth_getBalance", [
        address,
        `0x${blockNumber?.toString(16) ?? 0}`,
      ]);
      return hexToBigInt(result);
    })
  );
}
