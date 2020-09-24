import { ForkStateManager } from "../fork/ForkStateManager";
import { GenesisAccount } from "../node-types";

import { makeAccount } from "./makeAccount";

export async function putGenesisAccounts(
  stateManager: ForkStateManager,
  genesisAccounts: GenesisAccount[]
) {
  for (const ga of genesisAccounts) {
    const { address, account } = makeAccount(ga);
    await stateManager.putAccount(address, account);
  }
}
