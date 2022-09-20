import { Trie } from "@nomicfoundation/ethereumjs-trie";
import {
  Account,
  intToBuffer,
  setLengthLeft,
} from "@nomicfoundation/ethereumjs-util";

import { GenesisAccount } from "../node-types";

import { makeAccount } from "./makeAccount";

export async function makeStateTrie(genesisAccounts: GenesisAccount[]) {
  const stateTrie = new Trie({ useKeyHashing: true });

  for (const acc of genesisAccounts) {
    const { address, account } = makeAccount(acc);
    await stateTrie.put(address.toBuffer(), account.serialize());
  }

  // Mimic precompiles activation
  for (let i = 1; i <= 8; i++) {
    await stateTrie.put(
      setLengthLeft(intToBuffer(i), 20),
      new Account().serialize()
    );
  }

  return stateTrie;
}
