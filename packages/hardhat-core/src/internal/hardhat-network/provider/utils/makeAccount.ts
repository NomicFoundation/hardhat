import Account from "ethereumjs-account";
import { BN, privateToAddress, toBuffer } from "ethereumjs-util";

import { GenesisAccount } from "../node-types";

import { isHexPrefixed } from "./isHexPrefixed";

export function makeAccount(ga: GenesisAccount) {
  let balance: BN;

  if (typeof ga.balance === "string" && isHexPrefixed(ga.balance)) {
    balance = new BN(toBuffer(ga.balance));
  } else {
    balance = new BN(ga.balance);
  }

  const account = new Account({ balance });
  const pk = toBuffer(ga.privateKey);
  const address = privateToAddress(pk);
  return { account, address };
}
