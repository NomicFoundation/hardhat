import { Block } from "@nomicfoundation/ethereumjs-block";
import { assert } from "chai";

import { defaultHardhatNetworkParams } from "../../../../../src/internal/core/config/default-config";
import { rpcToBlockData } from "../../../../../src/internal/hardhat-network/provider/fork/rpcToBlockData";
import { makeForkClient } from "../../../../../src/internal/hardhat-network/provider/utils/makeForkClient";
import { RunTxResult } from "../../../../../src/internal/hardhat-network/provider/vm/vm-adapter";
import { HardhatNode } from "../../../../../src/internal/hardhat-network/provider/node";
import { ForkedNodeConfig } from "../../../../../src/internal/hardhat-network/provider/node-types";
import { FORK_TESTS_CACHE_PATH } from "../../helpers/constants";

import { assertEqualBlocks } from "./assertEqualBlocks";

/* eslint-disable @typescript-eslint/dot-notation */

export async function runFullBlock(
  url: string,
  blockToRun: bigint,
  chainId: number,
  hardfork: string
) {
  const forkConfig = {
    jsonRpcUrl: url,
    blockNumber: Number(blockToRun) - 1,
  };

  const { forkClient } = await makeForkClient(forkConfig);

  const rpcBlock = await forkClient.getBlockByNumber(blockToRun, true);

  if (rpcBlock === null) {
    assert.fail(`Block ${blockToRun} doesn't exist`);
  }

  const forkedNodeConfig: ForkedNodeConfig = {
    automine: true,
    networkName: "mainnet",
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
  };

  const [common, forkedNode] = await HardhatNode.create(forkedNodeConfig);

  const parentBlock = await forkedNode.getLatestBlock();

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

  const vm = forkedNode["_vm"];

  const blockBuilder = await vm.createBlockBuilder(common, {
    parentBlock,
    headerData: block.header,
  });

  const transactionResults: RunTxResult[] = [];
  for (const tx of block.transactions.values()) {
    transactionResults.push(await blockBuilder.addTransaction(tx));
  }

  const newBlock = await blockBuilder.finalize([]);

  await assertEqualBlocks(newBlock, transactionResults, rpcBlock, forkClient);
}
