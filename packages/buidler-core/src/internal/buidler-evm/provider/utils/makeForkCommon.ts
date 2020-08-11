import Common from "ethereumjs-common";

import { JsonRpcClient } from "../../jsonrpc/client";

export async function makeForkCommon(forkClient: JsonRpcClient) {
  const networkId = await forkClient.getNetworkId();
  // TODO: set hardfork based on block number
  return new Common(parseInt(networkId, 10), "muirGlacier");
}
