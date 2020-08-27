/* tslint:disable:no-string-literal */
import { ForkBlockchain } from "../../../../src/internal/buidler-evm/provider/fork/ForkBlockchain";
import { BuidlerEVMProvider } from "../../../../src/internal/buidler-evm/provider/provider";
import { EthereumProvider } from "../../../../src/types";

export async function retrieveForkBlockNumber(provider: EthereumProvider) {
  if (!(provider instanceof BuidlerEVMProvider)) {
    throw new Error("Provider is not an instance of BuidlerEVMProvider");
  }
  if (provider["_node"] === undefined) {
    await provider["_init"]();
  }
  const forkBlockchain = provider["_node"]?.["_blockchain"];
  if (!(forkBlockchain instanceof ForkBlockchain)) {
    throw new Error("Provider has not been initialised with forkConfig");
  }
  return forkBlockchain["_forkBlockNumber"].toNumber();
}
