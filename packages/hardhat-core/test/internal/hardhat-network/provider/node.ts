import { assert } from "chai";
import { BN, bufferToHex } from "ethereumjs-util";
import * as path from "path";

import { numberToRpcQuantity } from "../../../../src/internal/core/providers/provider-utils";
import { rpcToBlockData } from "../../../../src/internal/hardhat-network/provider/fork/rpcToBlockData";
import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import { ForkedNodeConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import { Block } from "../../../../src/internal/hardhat-network/provider/types/Block";
import { makeForkClient } from "../../../../src/internal/hardhat-network/provider/utils/makeForkClient";

// tslint:disable no-string-literal

describe("HardhatNode", function () {
  it("should run a mainnet block and produce the same results", async function () {
    this.timeout(0);

    const { ALCHEMY_URL } = process.env;

    if (ALCHEMY_URL === undefined || ALCHEMY_URL === "") {
      this.skip();
    }

    const blockNumber = 9300077;

    const forkConfig = {
      jsonRpcUrl: ALCHEMY_URL,
      blockNumber,
    };

    const { forkClient } = await makeForkClient(forkConfig);

    const rpcBlock = await forkClient.getBlockByNumber(
      new BN(blockNumber + 1),
      true
    );

    if (rpcBlock === null) {
      assert.fail();
      return;
    }

    const forkCachePath = path.join(__dirname, ".hardhat_node_test_cache");
    const forkedNodeConfig: ForkedNodeConfig = {
      networkName: "mainnet",
      chainId: 1,
      networkId: 1,
      hardfork: "muirGlacier",
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
      console.warn("Blocks receipt tries are different");

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
      }
    }
  });
});
