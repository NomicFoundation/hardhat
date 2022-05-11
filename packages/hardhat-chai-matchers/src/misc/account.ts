import assert from "assert";
import { Contract, Signer, Wallet } from "ethers";

export type Account = Signer | Contract;

export function isAccount(account: Account): account is Contract | Wallet {
  return account instanceof Contract || account instanceof Wallet;
}

export async function getAddressOf(account: Account | string) {
  if (typeof account === "string") {
    assert(/^0x[0-9-a-fA-F]{40}$/.test(account), `Invalid address ${account}`);
    return account;
  } else if (isAccount(account)) {
    return account.address;
  } else {
    return account.getAddress();
  }
}
