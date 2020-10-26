import { HardhatNode } from "../../../../src/internal/hardhat-network/provider/node";
import { NodeConfig } from "../../../../src/internal/hardhat-network/provider/node-types";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BLOCK_GAS_LIMIT,
  DEFAULT_CHAIN_ID,
  DEFAULT_HARDFORK,
  DEFAULT_NETWORK_ID,
  DEFAULT_NETWORK_NAME,
} from "../helpers/providers";
import {assert} from "chai";

describe("HardhatNode", () => {
  const config: NodeConfig = {
    type: "local",
    automine: false,
    hardfork: DEFAULT_HARDFORK,
    networkName: DEFAULT_NETWORK_NAME,
    chainId: DEFAULT_CHAIN_ID,
    networkId: DEFAULT_NETWORK_ID,
    blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
    genesisAccounts: DEFAULT_ACCOUNTS,
  };
  let node: HardhatNode;

  beforeEach(async () => {
    [, node] = await HardhatNode.create(config);
    // tslint:disable-next-line:no-string-literal
  });

  describe("mineBlock", () => {
    it("can mine an empty block", async () => {
      const beforeBlock = await node.getLatestBlockNumber();
      await node.mineBlock();
      const currentBlock = await node.getLatestBlockNumber();
      assert.equal(currentBlock.toString(), beforeBlock.addn(1).toString());
    });
  });
});
