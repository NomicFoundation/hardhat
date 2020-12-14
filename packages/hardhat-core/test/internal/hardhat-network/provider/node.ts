import { assert } from "chai";
import { BN } from "ethereumjs-util";
import * as path from "path";

import { rpcToBlockData } from "../../../../src/internal/hardhat-network/provider/fork/rpcToBlockData";
import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import { ForkedNodeConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import { Block } from "../../../../src/internal/hardhat-network/provider/types/Block";
import { makeForkClient } from "../../../../src/internal/hardhat-network/provider/utils/makeForkClient";

// tslint:disable no-string-literal

describe("HardhatNode", function () {
  it("should run a mainnet block and produce the same results", async function () {
    this.timeout(120000);

    const { ALCHEMY_URL } = process.env;

    if (ALCHEMY_URL === undefined || ALCHEMY_URL === "") {
      this.skip();
    }

    const forkCachePath = path.join(__dirname, ".hardhat_node_test_cache");

    const blockNumber = 9300077;
    const config: ForkedNodeConfig = {
      type: "forked",
      forkConfig: {
        jsonRpcUrl: ALCHEMY_URL,
        blockNumber,
      },
      forkCachePath,
      blockGasLimit: 9957390,
      genesisAccounts: [],
    };

    const [common, node] = await HardhatNode.create(config);
    const { forkClient } = await makeForkClient(config.forkConfig);

    const rpcBlock = await forkClient.getBlockByNumber(
      new BN(blockNumber + 1),
      true
    );

    if (rpcBlock === null) {
      assert.fail();
    }

    // TODO this has to be changed when the chainId PR is merged
    const block = new Block(rpcToBlockData(rpcBlock), { common });

    node["_vmTracer"].disableTracing();
    const result = await node["_vm"].runBlock({
      block,
      generate: true,
      skipBlockValidation: true,
    });

    await node["_saveBlockAsSuccessfullyRun"](block, result);

    const newBlock = await node.getBlockByNumber(new BN(blockNumber + 1));

    if (newBlock === undefined) {
      assert.fail();
    }

    assert.equal(
      newBlock.header.receiptTrie.toString("hex"),
      rpcBlock.receiptsRoot.toString("hex")
    );
  });
});
