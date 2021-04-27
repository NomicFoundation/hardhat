import {
  Account,
  Address,
  BN,
  privateToAddress,
  toBuffer,
} from "ethereumjs-util";

import { GenesisAccount } from "../node-types";

import { isHexPrefixed } from "./isHexPrefixed";

export function makeAccount(ga: GenesisAccount) {
  let balance: BN;

  if (typeof ga.balance === "string" && isHexPrefixed(ga.balance)) {
    balance = new BN(toBuffer(ga.balance));
  } else {
    balance = new BN(ga.balance);
  }

  const account = Account.fromAccountData({ balance });
  const pk = toBuffer(ga.privateKey);
  const address = new Address(privateToAddress(pk));
  return { account, address };
}
