import { SecureTrie as Trie } from "@ethereumjs/trie";
import { intToBuffer, setLengthLeft } from "@ethereumjs/util";
import { Account } from "ethereumjs-util";

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
      // ETHJSTODO not sure at all about this
      // ETHJSTODO also: move to BigIntUtils
      // BigInt(i).toArrayLike(Buffer, "be", 20),
      setLengthLeft(intToBuffer(i), 10),
      new Account().serialize()
    );
  }

  return stateTrie;
}
