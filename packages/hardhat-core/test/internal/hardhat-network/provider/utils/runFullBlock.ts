import { Block } from "@ethereumjs/block";
import VM from "@ethereumjs/vm";
import { AfterBlockEvent, RunBlockOpts } from "@ethereumjs/vm/dist/runBlock";
import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { defaultHardhatNetworkParams } from "../../../../../src/internal/core/config/default-config";
import { rpcToBlockData } from "../../../../../src/internal/hardhat-network/provider/fork/rpcToBlockData";
import { makeForkClient } from "../../../../../src/internal/hardhat-network/provider/utils/makeForkClient";
import { HardhatNode } from "../../../../../src/internal/hardhat-network/provider/node";
import { ForkedNodeConfig } from "../../../../../src/internal/hardhat-network/provider/node-types";
import { FORK_TESTS_CACHE_PATH } from "../../helpers/constants";

import { assertEqualBlocks } from "./assertEqualBlocks";

/* eslint-disable @typescript-eslint/dot-notation */

export async function runFullBlock(
  url: string,
  blockToRun: number,
  chainId: number,
  hardfork: string
) {
  const forkConfig = {
    jsonRpcUrl: url,
    blockNumber: blockToRun - 1,
  };

  const { forkClient } = await makeForkClient(forkConfig);

  const rpcBlock = await forkClient.getBlockByNumber(new BN(blockToRun), true);

  if (rpcBlock === null) {
    assert.fail();
  }

  const forkedNodeConfig: ForkedNodeConfig = {
    automine: true,
    networkName: "mainnet",
    chainId,
    networkId: 1,
    hardfork,
    forkConfig,
    forkCachePath: FORK_TESTS_CACHE_PATH,
    blockGasLimit: rpcBlock.gasLimit.toNumber(),
    minGasPrice: new BN(0),
    genesisAccounts: [],
    mempoolOrder: "priority",
    coinbase: "0x0000000000000000000000000000000000000000",
    chains: defaultHardhatNetworkParams.chains,
  };

  const [common, forkedNode] = await HardhatNode.create(forkedNodeConfig);

  const block = Block.fromBlockData(
    rpcToBlockData({
      ...rpcBlock,
      // We wipe the receipt root to make sure we get a new one
      receiptsRoot: Buffer.alloc(32, 0),
    }),
    {
      common,
      freeze: false,
    }
  );

  forkedNode["_vmTracer"].disableTracing();

  const afterBlockEvent = await runBlockAndGetAfterBlockEvent(
    forkedNode["_vm"],
    {
      block,
      generate: true,
      skipBlockValidation: true,
    }
  );

  const modifiedBlock = afterBlockEvent.block;

  await forkedNode["_vm"].blockchain.putBlock(modifiedBlock);
  await forkedNode["_saveBlockAsSuccessfullyRun"](
    modifiedBlock,
    afterBlockEvent
  );

  const newBlock = await forkedNode.getBlockByNumber(new BN(blockToRun));

  if (newBlock === undefined) {
    assert.fail();
  }

  await assertEqualBlocks(newBlock, afterBlockEvent, rpcBlock, forkClient);
}

async function runBlockAndGetAfterBlockEvent(
  vm: VM,
  runBlockOpts: RunBlockOpts
): Promise<AfterBlockEvent> {
  let results: AfterBlockEvent;

  function handler(event: AfterBlockEvent) {
    results = event;
  }

  try {
    vm.once("afterBlock", handler);
    await vm.runBlock(runBlockOpts);
  } finally {
    // We need this in case `runBlock` throws before emitting the event.
    // Otherwise we'd be leaking the listener until the next call to runBlock.
    vm.removeListener("afterBlock", handler);
  }

  return results!;
}
