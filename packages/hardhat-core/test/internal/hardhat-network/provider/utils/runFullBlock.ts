import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import {
  AfterBlockEvent,
  RunBlockOpts,
  VM,
} from "@nomicfoundation/ethereumjs-vm";
import { assert } from "chai";

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
  blockToRun: bigint,
  chainId: number,
  remoteCommon: Common
) {
  const forkConfig = {
    jsonRpcUrl: url,
    blockNumber: Number(blockToRun) - 1,
  };

  const { forkClient } = await makeForkClient(forkConfig);

  const rpcBlock = await forkClient.getBlockByNumber(blockToRun, true);

  const hardfork = remoteCommon.getHardforkByBlockNumber(
    blockToRun,
    undefined,
    rpcBlock?.timestamp
  );

  if (rpcBlock === null) {
    assert.fail();
  }

  const forkedNodeConfig: ForkedNodeConfig = {
    automine: true,
    chainId,
    networkId: 1,
    hardfork,
    forkConfig,
    forkCachePath: FORK_TESTS_CACHE_PATH,
    blockGasLimit: Number(rpcBlock.gasLimit),
    minGasPrice: 0n,
    genesisAccounts: [],
    mempoolOrder: "priority",
    coinbase: "0x0000000000000000000000000000000000000000",
    chains: defaultHardhatNetworkParams.chains,
    allowBlocksWithSameTimestamp: false,
    enableTransientStorage: false,
  };

  const [common, forkedNode] = await HardhatNode.create(forkedNodeConfig);

  const block = Block.fromBlockData(
    rpcToBlockData({
      ...rpcBlock,
      // We wipe the receipt root to make sure we get a new one
      receiptsRoot: Buffer.alloc(32, 0),

      // remove the extra data to prevent ethereumjs from validating it
      extraData: Buffer.from([]),
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

  const newBlock = await forkedNode.getBlockByNumber(blockToRun);

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
    vm.events.once("afterBlock", handler);
    await vm.runBlock(runBlockOpts);
  } finally {
    // We need this in case `runBlock` throws before emitting the event.
    // Otherwise we'd be leaking the listener until the next call to runBlock.

    vm.events.removeListener("afterBlock", handler);
  }

  return results!;
}
