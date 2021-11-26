import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { rpcToBlockData } from "../src/internal/hardhat-network/provider/fork/rpcToBlockData";
import { HardhatNode } from "../src/internal/hardhat-network/provider/node";
import {
  ForkConfig,
  ForkedNodeConfig,
} from "../src/internal/hardhat-network/provider/node-types";
import { Block } from "../src/internal/hardhat-network/provider/types/Block";
import { makeForkClient } from "../src/internal/hardhat-network/provider/utils/makeForkClient";
import { FORK_TESTS_CACHE_PATH } from "../test/internal/hardhat-network/helpers/constants";
import { DEFAULT_HARDFORK } from "../test/internal/hardhat-network/helpers/providers";
import { assertEqualBlocks } from "../test/internal/hardhat-network/provider/utils/assertEqualBlocks";

async function main(rpcUrl: string, blockNumber: number) {
  const forkConfig: ForkConfig = {
    jsonRpcUrl: rpcUrl,
    blockNumber: blockNumber - 1,
  };

  const { forkClient } = await makeForkClient(forkConfig);

  const rpcBlock = await forkClient.getBlockByNumber(new BN(blockNumber), true);

  if (rpcBlock === null) {
    assert.fail();
  }
  const forkedNodeConfig: ForkedNodeConfig = {
    automine: true,
    networkName: "mainnet",
    chainId: 1,
    networkId: 1,
    hardfork: DEFAULT_HARDFORK,
    forkConfig,
    forkCachePath: FORK_TESTS_CACHE_PATH,
    blockGasLimit: rpcBlock.gasLimit.toNumber(),
    genesisAccounts: [],
  };

  const [common, forkedNode] = await HardhatNode.create(forkedNodeConfig);

  const block = new Block(rpcToBlockData(rpcBlock), { common });

  forkedNode["_vmTracer"].disableTracing();
  block.header.receiptTrie = Buffer.alloc(32, 0);
  const result = await forkedNode["_vm"].runBlock({
    block,
    generate: true,
    skipBlockValidation: true,
  });

  await forkedNode["_saveBlockAsSuccessfullyRun"](block, result);

  const newBlock = await forkedNode.getBlockByNumber(new BN(blockNumber));

  if (newBlock === undefined) {
    assert.fail("Block wasn't added");
  }

  await assertEqualBlocks(newBlock, result, rpcBlock, forkClient);
}

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

main(rpcUrlArg, +blockNumberArg)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

function usage() {
  console.warn("ts-node test-run-forked-block.ts <rpcUrl> <blockNumber>");
  process.exit(1);
}
