import { Contract, Signer, Wallet } from "ethers";

export type Account = Signer | Contract;

export function isAccount(account: Account): account is Contract | Wallet {
  return account instanceof Contract || account instanceof Wallet;
}

export async function getAddressOf(account: Account) {
  if (isAccount(account)) {
    return account.address;
  } else {
    return account.getAddress();
  }
}
