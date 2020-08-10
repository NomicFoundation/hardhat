import { BN } from "ethereumjs-util";

import { ForkConfig } from "../../../../types";
import { JsonRpcClient } from "../../jsonrpc/client";

export async function makeForkClient(forkConfig: ForkConfig) {
  const forkClient = JsonRpcClient.forUrl(forkConfig.jsonRpcUrl);
  const forkBlockNumber =
    forkConfig.blockNumber !== undefined
      ? new BN(forkConfig.blockNumber)
      : await forkClient.getLatestBlockNumber();
  return { forkClient, forkBlockNumber };
}
