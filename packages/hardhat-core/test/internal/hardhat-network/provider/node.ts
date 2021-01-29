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
  blockNumber: number;
  chainId: number;
  hardfork: "istanbul" | "muirGlacier";
}

describe("HardhatNode", function () {
  const mainnetForkPoint: ForkPoint = {
    networkName: "mainnet",
    url: ALCHEMY_URL,
    blockNumber: 9300077,
    chainId: 1,
    hardfork: "muirGlacier",
  };
  const kovanForkPoint: ForkPoint = {
    networkName: "kovan",
    url: (ALCHEMY_URL ?? "").replace(
      "mainnet",
      "kovan"
    ),
    blockNumber: 23115226,
    chainId: 42,
    hardfork: "istanbul",
  };

  this.timeout(0);

  it(`should run a mainnet block and produce the same results`, async function () {
    const {
      url,
      blockNumber,
      networkName,
      chainId,
      hardfork,
    } = mainnetForkPoint;

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

    const newBlock = await forkedNode.getBlockByNumber(new BN(blockNumber + 1));

    if (newBlock === undefined) {
      assert.fail();
    }

    if (
      newBlock.header.receiptTrie.toString("hex") !==
      rpcBlock.receiptsRoot.toString("hex")
    ) {
      console.warn("Receipt tries of blocks are different");

      for (let i = 0; i < block.transactions.length; i++) {
        const tx = block.transactions[i];
        const txHash = bufferToHex(tx.hash(true));

        const remoteReceipt = (await forkClient["_httpProvider"].request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        })) as any;

        const localReceipt = result.receipts[i];

        assert.equal(
          bufferToHex(localReceipt.bitvector),
          remoteReceipt.logsBloom,
          `Logs bloom of tx ${i} (${txHash}) should match`
        );

        assert.equal(
          numberToRpcQuantity(new BN(localReceipt.gasUsed).toNumber()),
          remoteReceipt.gasUsed,
          `Gas used of tx ${i} (${txHash}) should match`
        );

        assert.equal(
          localReceipt.status,
          remoteReceipt.status,
          `Status of tx ${i} should be the same`
        );

        const evmResult = result.results[i];
        assert.equal(
          evmResult.createdAddress === undefined
            ? undefined
            : `0x${evmResult.createdAddress.toString("hex")}`,
          remoteReceipt.contractAddress,
          `Contract address created by tx ${i} should be the same`
        );
      }
    }
  });

  it(`should run a kovan block and produce the same results`, async function () {
    const { url, blockNumber, networkName, chainId, hardfork } = kovanForkPoint;

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

    const newBlock = await forkedNode.getBlockByNumber(new BN(blockNumber + 1));

    if (newBlock === undefined) {
      assert.fail();
    }

    if (
      newBlock.header.receiptTrie.toString("hex") !==
      rpcBlock.receiptsRoot.toString("hex")
    ) {
      console.warn("Receipt tries of blocks are different");

      for (let i = 0; i < block.transactions.length; i++) {
        const tx = block.transactions[i];
        const txHash = bufferToHex(tx.hash(true));

        const remoteReceipt = (await forkClient["_httpProvider"].request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        })) as any;

        const localReceipt = result.receipts[i];

        assert.equal(
          bufferToHex(localReceipt.bitvector),
          remoteReceipt.logsBloom,
          `Logs bloom of tx ${i} (${txHash}) should match`
        );

        // TODO: see why gas differs
        // assert.equal(
        //   numberToRpcQuantity(new BN(localReceipt.gasUsed).toNumber()),
        //   remoteReceipt.gasUsed,
        //   `Gas used of tx ${i} (${txHash}) should match`
        // );

        assert.equal(
          localReceipt.status,
          remoteReceipt.status,
          `Status of tx ${i} should be the same`
        );

        const evmResult = result.results[i];
        assert.equal(
          evmResult.createdAddress === undefined
            ? undefined
            : `0x${evmResult.createdAddress.toString("hex")}`,
          remoteReceipt.contractAddress,
          `Contract address created by tx ${i} should be the same`
        );
      }
    }
  });
});
