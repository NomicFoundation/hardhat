import type { WalletClient } from "viem";
import assert from "assert";

import { HardhatChaiMatchersAssertionError } from "../errors";

export async function getAddressOf(
  account: WalletClient | { address: `0x${string}` } | `0x${string}`
): Promise<`0x${string}`> {
  if (typeof account === "string") {
    assert(/^0x[0-9a-fA-F]{40}$/.test(account), `Invalid address ${account}`);
    return account;
  }

  if ("account" in account && typeof account.account?.address !== "undefined") {
    assert(
      /^0x[0-9a-fA-F]{40}$/.test(account.account.address),
      `Invalid address ${account.account.address}`
    );
    return account.account.address;
  }

  if ("address" in account && typeof account.address !== "undefined") {
    assert(
      /^0x[0-9a-fA-F]{40}$/.test(account.address),
      `Invalid address ${account.address}`
    );
    return account.address;
  }

  if ("getAddresses" in account && typeof account.getAddresses === "function") {
    const [address] = await account.getAddresses();
    assert(/^0x[0-9a-fA-F]{40}$/.test(address), `Invalid address ${address}`);
    return address;
  }

  throw new HardhatChaiMatchersAssertionError(
    `Expected \`0x\${string}\`, WalletClient, or contract, got ${
      account as any
    }`
  );
}
