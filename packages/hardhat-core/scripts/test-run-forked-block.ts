import Common from "@ethereumjs/common";

import { runFullBlock } from "../test/internal/hardhat-network/provider/utils/runFullBlock";

const rpcUrlArg = process.argv[2];
const blockNumberArg = process.argv[3];

if (rpcUrlArg === undefined) {
  console.warn("No rpcUrl given");
  usage();
}

if (blockNumberArg === undefined) {
  console.warn("No blockNumber given");
  usage();
}

async function main(rpcUrl: string, blockNumber: number, chainId: number) {
  const remoteCommon = new Common({ chain: chainId });
  const hardfork = remoteCommon.getHardforkByBlockNumber(blockNumber);

  await runFullBlock(rpcUrlArg, blockNumber, chainId, hardfork)
}

main(rpcUrlArg, +blockNumberArg, 1)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function usage() {
  console.warn("ts-node test-run-forked-block.ts <rpcUrl> <blockNumber>");
  process.exit(1);
}
