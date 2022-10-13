import type { Contract, Signer, Wallet } from "ethers";

import assert from "assert";

export type Account = Signer | Contract;

export function isAccount(account: Account): account is Contract | Wallet {
  const ethers = require("ethers");
  return account instanceof ethers.Contract || account instanceof ethers.Wallet;
}

export async function getAddressOf(account: Account | string) {
  if (typeof account === "string") {
    assert(/^0x[0-9a-fA-F]{40}$/.test(account), `Invalid address ${account}`);
    return account;
  } else if (isAccount(account)) {
    return account.address;
  } else {
    return account.getAddress();
  }
}
