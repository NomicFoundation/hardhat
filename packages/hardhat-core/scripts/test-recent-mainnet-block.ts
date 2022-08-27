import { Common } from "@ethereumjs/common";

import { makeForkClient } from "../src/internal/hardhat-network/provider/utils/makeForkClient";
import { runFullBlock } from "../test/internal/hardhat-network/provider/utils/runFullBlock";

async function main() {
  const rpcUrl = process.env.ALCHEMY_URL;

  if (rpcUrl === undefined || rpcUrl === "") {
    throw new Error("Missing ALCHEMY_URL environment variable");
  }

  const forkConfig = {
    jsonRpcUrl: rpcUrl,
  };

  const { forkClient } = await makeForkClient(forkConfig);

  const latestBlockNumber = await forkClient.getLatestBlockNumber();
  const blockNumber = latestBlockNumber - 20n;

  console.log("Testing block", blockNumber.toString());

  const remoteCommon = new Common({ chain: 1 });
  const hardfork = remoteCommon.getHardforkByBlockNumber(blockNumber);

  await runFullBlock(rpcUrl, blockNumber, 1, hardfork);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
