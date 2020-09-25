/* tslint:disable:no-string-literal */
import { ForkBlockchain } from "../../../../src/internal/hardhat-network/provider/fork/ForkBlockchain";
import { HardhatNetworkProvider } from "../../../../src/internal/hardhat-network/provider/provider";

export async function retrieveForkBlockNumber(
  provider: HardhatNetworkProvider
) {
  if (provider["_node"] === undefined) {
    await provider["_init"]();
  }
  const forkBlockchain = provider["_node"]?.["_blockchain"];
  if (!(forkBlockchain instanceof ForkBlockchain)) {
    throw new Error("Provider has not been initialised with forkConfig");
  }
  return forkBlockchain["_forkBlockNumber"].toNumber();
}
