import { assert } from "chai";
import { BN, bufferToHex } from "ethereumjs-util";
import * as path from "path";

import { numberToRpcQuantity } from "../../../../src/internal/core/providers/provider-utils";
import { rpcToBlockData } from "../../../../src/internal/hardhat-network/provider/fork/rpcToBlockData";
import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import { ForkedNodeConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import { Block } from "../../../../src/internal/hardhat-network/provider/types/Block";
import { makeForkClient } from "../../../../src/internal/hardhat-network/provider/utils/makeForkClient";
import { ALCHEMY_URL } from "../../../setup";

// tslint:disable no-string-literal

interface ForkPoint {
  networkName: string;
  url?: string;
  /**
   * Fork block number.
   * This is the last observable block from the remote blockchain.
   * Later blocks are all constructed by Hardhat Network.
   */
  blockNumber: number;
  chainId: number;
  hardfork: "istanbul" | "muirGlacier";
}

describe("HardhatNode", function () {
  // Note that here `blockNumber` is the number of the forked block, not the number of the "simulated" block.
  // Tests are written to fork this block and execute all transactions of the block following the forked block.
  // This means that if the forked block number is 9300076, what the test will do is:
  //   - setup a forked blockchain based on block 9300076
  //   - fetch all transactions from 9300077
  //   - create a new block with them
  //   - execute the whole block and save it with the rest of the blockchain
  const forkPoints: ForkPoint[] = [
    {
      networkName: "mainnet",
      url: ALCHEMY_URL,
      blockNumber: 9300076,
      chainId: 1,
      hardfork: "muirGlacier",
    },
    {
      networkName: "kovan",
      url: (ALCHEMY_URL ?? "").replace("mainnet", "kovan"),
      blockNumber: 23115226,
      chainId: 42,
      hardfork: "istanbul",
    },
    {
      networkName: "rinkeby",
      url: (ALCHEMY_URL ?? "").replace("mainnet", "rinkeby"),
      blockNumber: 8004364,
      chainId: 4,
      hardfork: "istanbul",
    },
  ];

  this.timeout(120000);

  for (const {
    url,
    blockNumber,
    networkName,
    chainId,
    hardfork,
  } of forkPoints) {
    it(`should run a ${networkName} block and produce the same results`, async function () {
      if (url === undefined || url === "") {
        this.skip();
      }

      const forkConfig = {
        jsonRpcUrl: url,
        blockNumber,
      };

      const { forkClient } = await makeForkClient(forkConfig);

      const rpcBlock = await forkClient.getBlockByNumber(
        new BN(blockNumber + 1),
        true
      );

      if (rpcBlock === null) {
        assert.fail();
      }

      const forkCachePath = path.join(__dirname, ".hardhat_node_test_cache");
      const forkedNodeConfig: ForkedNodeConfig = {
        networkName,
        chainId,
        networkId: chainId,
        hardfork,
        forkConfig,
        forkCachePath,
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

      const newBlock = await forkedNode.getBlockByNumber(
        new BN(blockNumber + 1)
      );

      if (newBlock === undefined) {
        assert.fail();
      }

      const localReceiptRoot = newBlock.header.receiptTrie.toString("hex");
      const remoteReceiptRoot = rpcBlock.receiptsRoot.toString("hex");

      // We do some manual comparisons here to understand why the root of the receipt tries differ.
      if (localReceiptRoot !== remoteReceiptRoot) {
        for (let i = 0; i < block.transactions.length; i++) {
          const tx = block.transactions[i];
          const txHash = bufferToHex(tx.hash(true));

          const remoteReceipt = (await forkClient["_httpProvider"].request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          })) as any;

          const localReceipt = result.receipts[i];
          const evmResult = result.results[i];

          assert.equal(
            bufferToHex(localReceipt.bitvector),
            remoteReceipt.logsBloom,
            `Logs bloom of tx index ${i} (${txHash}) should match`
          );

          assert.equal(
            numberToRpcQuantity(evmResult.gasUsed.toNumber()),
            remoteReceipt.gasUsed,
            `Gas used of tx index ${i} (${txHash}) should match`
          );

          assert.equal(
            localReceipt.status,
            remoteReceipt.status,
            `Status of tx index ${i} (${txHash}) should be the same`
          );

          assert.equal(
            evmResult.createdAddress === undefined
              ? undefined
              : `0x${evmResult.createdAddress.toString("hex")}`,
            remoteReceipt.contractAddress,
            `Contract address created by tx index ${i} (${txHash}) should be the same`
          );
        }
      }

      assert.equal(
        localReceiptRoot,
        remoteReceiptRoot,
        "The root of the receipts trie is different than expected"
      );
    });
  }
});
