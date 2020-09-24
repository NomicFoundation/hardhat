import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../jsonrpc/client";
import { ForkConfig } from "../node-types";

export async function makeForkClient(forkConfig: ForkConfig) {
  const forkClient = JsonRpcClient.forUrl(forkConfig.jsonRpcUrl);
  let forkBlockNumber;
  if (forkConfig.blockNumber !== undefined) {
    forkBlockNumber = new BN(forkConfig.blockNumber);
  } else {
    forkBlockNumber = await forkClient.getLatestBlockNumber();
    if (forkConfig.jsonRpcUrl.includes("infura")) {
      // Probably because of load balancing infura nodes can differ in their
      // view of the blockchain. This makes it possible to query for a block
      // with the latest returned block number and get null.
      // To prevent this we use a past block number.
      forkBlockNumber = forkBlockNumber.subn(2);
    }
  }
  return { forkClient, forkBlockNumber };
}
