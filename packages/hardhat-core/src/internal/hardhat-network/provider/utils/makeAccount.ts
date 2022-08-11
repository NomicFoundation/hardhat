import {
  Account,
  Address,
  bufferToBigInt,
  privateToAddress,
  toBuffer,
} from "@ethereumjs/util";

import { GenesisAccount } from "../node-types";

import { isHexPrefixed } from "./isHexPrefixed";

export function makeAccount(ga: GenesisAccount) {
  let balance: bigint;

  if (typeof ga.balance === "string" && isHexPrefixed(ga.balance)) {
    balance = bufferToBigInt(toBuffer(ga.balance));
  } else {
    balance = BigInt(ga.balance);
  }

  const account = Account.fromAccountData({ balance });
  const pk = toBuffer(ga.privateKey);
  const address = new Address(privateToAddress(pk));
  return { account, address };
}
