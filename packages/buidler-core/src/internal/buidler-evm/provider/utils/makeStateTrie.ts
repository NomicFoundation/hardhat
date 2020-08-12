import Account from "ethereumjs-account";
import { BN } from "ethereumjs-util";
import Trie from "merkle-patricia-tree/secure";
import { promisify } from "util";

import { GenesisAccount } from "../node-types";

import { makeAccount } from "./makeAccount";

export async function makeStateTrie(genesisAccounts: GenesisAccount[]) {
  const stateTrie = new Trie();
  const putIntoStateTrie = promisify(stateTrie.put.bind(stateTrie));

  for (const acc of genesisAccounts) {
    const { address, account } = makeAccount(acc);
    await putIntoStateTrie(address, account.serialize());
  }

  // Mimic precompiles activation
  for (let i = 1; i <= 8; i++) {
    await putIntoStateTrie(
      new BN(i).toArrayLike(Buffer, "be", 20),
      new Account().serialize()
    );
  }

  return stateTrie;
}
