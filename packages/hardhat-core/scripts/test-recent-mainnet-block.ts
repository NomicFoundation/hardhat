import { Common } from "@nomicfoundation/ethereumjs-common";

import { makeForkClient } from "../src/internal/hardhat-network/provider/utils/makeForkClient";
import { runFullBlock } from "../test/internal/hardhat-network/provider/utils/runFullBlock";

async function main() {
  const rpcUrl = process.env.ALCHEMY_URL;

  if (rpcUrl === undefined || rpcUrl === "") {
    console.error(
      "[test-recent-mainnet-block] Missing ALCHEMY_URL environment variable"
    );
    process.exit(1);
  }

  const forkConfig = {
    jsonRpcUrl: rpcUrl,
  };

  const { forkClient } = await makeForkClient(forkConfig);

  const latestBlockNumber = await forkClient.getLatestBlockNumber();
  const blockNumber = latestBlockNumber - 20n;

  console.log("Testing block", blockNumber.toString());

  const remoteCommon = new Common({ chain: 1 });

  await runFullBlock(rpcUrl, blockNumber, 1, remoteCommon);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
