import Account from "ethereumjs-account";
import { BN, privateToAddress, toBuffer } from "ethereumjs-util";
import Trie from "merkle-patricia-tree/secure";
import { promisify } from "util";

import { GenesisAccount } from "./GenesisAccount";

export async function makeStateTrie(genesisAccounts: GenesisAccount[]) {
  const stateTrie = new Trie();
  const putIntoStateTrie = promisify(stateTrie.put.bind(stateTrie));
  for (const acc of genesisAccounts) {
    let balance: BN;

    if (
      typeof acc.balance === "string" &&
      acc.balance.toLowerCase().startsWith("0x")
    ) {
      balance = new BN(toBuffer(acc.balance));
    } else {
      balance = new BN(acc.balance);
    }

    const account = new Account({ balance });
    const pk = toBuffer(acc.privateKey);
    const address = privateToAddress(pk);

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
