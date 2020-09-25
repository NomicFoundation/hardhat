import Common from "ethereumjs-common";
import { BN } from "ethereumjs-util";

import { JsonRpcClient } from "../../jsonrpc/client";

export async function makeForkCommon(
  forkClient: JsonRpcClient,
  forkBlockNumber: BN
) {
  const networkId = await forkClient.getNetworkId();
  const common = new Common(parseInt(networkId, 10));
  common.setHardfork(common.activeHardfork(forkBlockNumber.toNumber()));
  return common;
}
