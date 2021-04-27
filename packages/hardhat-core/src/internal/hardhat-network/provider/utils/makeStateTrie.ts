import { Account, BN } from "ethereumjs-util";
import { SecureTrie as Trie } from "merkle-patricia-tree";

import { GenesisAccount } from "../node-types";

import { makeAccount } from "./makeAccount";

export async function makeStateTrie(genesisAccounts: GenesisAccount[]) {
  const stateTrie = new Trie();

  for (const acc of genesisAccounts) {
    const { address, account } = makeAccount(acc);
    await stateTrie.put(address.toBuffer(), account.serialize());
  }

  // Mimic precompiles activation
  for (let i = 1; i <= 8; i++) {
    await stateTrie.put(
      new BN(i).toArrayLike(Buffer, "be", 20),
      new Account().serialize()
    );
  }

  return stateTrie;
}
