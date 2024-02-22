import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../src";
import { NumberLike } from "../../src/types";
import { useEnvironment, rpcQuantityToNumber } from "../test-utils";

describe("setBlockGasLimit", function () {
  useEnvironment("simple");

  const getBlockGasLimit = async (blockNumber = "latest") => {
    const block = await this.ctx.hre.network.provider.send(
      "eth_getBlockByNumber",
      [blockNumber, false]
    );

    return rpcQuantityToNumber(block.gasLimit);
  };

  it("should allow to set the block gas limit", async function () {
    await hh.setBlockGasLimit(1234567);
    await hh.mine();

    assert.strictEqual(await getBlockGasLimit(), 1234567);
  });

  describe("accepted parameter types for block gas limit", function () {
    const blockGasLimitExamples: Array<[string, NumberLike, number]> = [
      ["number", 2000001, 2000001],
      ["bigint", BigInt(2000002), 2000002],
      ["hex encoded", "0x1e8483", 2000003],
      ["hex encoded with leading zeros", "0x01e240", 123456],
      ["ethers's bignumber instances", ethers.BigNumber.from(2000004), 2000004],
      ["bn.js instances", new BN(2000005), 2000005],
    ];

    for (const [type, value, expectedBlockGasLimit] of blockGasLimitExamples) {
      it(`should accept blockGasLimit of type ${type}`, async function () {
        await hh.setBlockGasLimit(value);
        await hh.mine();

        assert.strictEqual(await getBlockGasLimit(), expectedBlockGasLimit);
      });
    }

    it("should not accept strings that are not 0x-prefixed", async function () {
      await assert.isRejected(hh.setBlockGasLimit("3"));
    });
  });
});
