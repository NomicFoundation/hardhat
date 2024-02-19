import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../src";
import { NumberLike } from "../../src/types";
import { useEnvironment } from "../test-utils";

describe("setPrevRandao", function () {
  useEnvironment("merge");

  const getPrevRandao = async () => {
    const block = await this.ctx.hre.network.provider.send(
      "eth_getBlockByNumber",
      ["latest", false]
    );

    return BigInt(block.mixHash);
  };

  it("should allow setting the next block's prevRandao", async function () {
    await hh.setPrevRandao(12345);
    await hh.mine();

    assert.equal(await getPrevRandao(), 12345n);
  });

  describe("accepted parameter types for next block's base fee per gas", function () {
    const prevRandaoExamples: Array<[string, NumberLike, bigint]> = [
      ["number", 2000001, 2000001n],
      ["bigint", BigInt(2000002), 2000002n],
      ["hex encoded", "0x1e8483", 2000003n],
      ["hex encoded with leading zeros", "0x01e240", 123456n],
      [
        "ethers's bignumber instances",
        ethers.BigNumber.from(2000004),
        2000004n,
      ],
      ["bn.js instances", new BN(2000005), 2000005n],
    ];

    for (const [type, value, expectedPrevRandao] of prevRandaoExamples) {
      it(`should accept blockGasLimit of type ${type}`, async function () {
        await hh.setPrevRandao(value);
        await hh.mine();

        assert.equal(await getPrevRandao(), expectedPrevRandao);
      });
    }

    it("should not accept strings that are not 0x-prefixed", async function () {
      await assert.isRejected(hh.setPrevRandao("3"));
    });
  });
});
