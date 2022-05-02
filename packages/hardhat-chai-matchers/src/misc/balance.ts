import { ensure } from "../calledOnContract/utils";
import { Account, getAddressOf } from "./account";

export interface BalanceChangeOptions {
  includeFee?: boolean;
}

export function getAddresses(accounts: Account[]) {
  return Promise.all(accounts.map((account) => getAddressOf(account)));
}

export async function getBalances(accounts: Account[], blockNumber?: number) {
  return Promise.all(
    accounts.map((account) => {
      ensure(account.provider !== undefined, TypeError, "Provider not found");
      if (blockNumber !== undefined) {
        return account.provider.getBalance(getAddressOf(account), blockNumber);
      } else {
        return account.provider.getBalance(getAddressOf(account));
      }
    })
  );
}
