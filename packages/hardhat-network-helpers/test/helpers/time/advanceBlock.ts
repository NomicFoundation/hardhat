import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../../src";
import { NumberLike } from "../../../src/types";
import { useEnvironment } from "../../test-utils";

describe("time#advanceBlock", function () {
  useEnvironment("simple");

  it("should increase the block height by the given number of blocks", async function () {
    const initialHeight = await hh.time.latestBlock();

    const newHeight = await hh.time.advanceBlock(3);

    const endHeight = await hh.time.latestBlock();

    assert.strictEqual(newHeight, endHeight);
    assert.strictEqual(initialHeight + 3, endHeight);
  });

  it("should throw if given a negative number", async function () {
    await assert.isRejected(hh.time.advanceBlock(-1));
  });

  describe("accepted parameter types for blocks number", function () {
    const nonceExamples: Array<[string, NumberLike]> = [
      ["number", 1],
      ["bigint", BigInt(1)],
      ["hex encoded", "0x1"],
      ["hex encoded with leading zeros", "0x01"],
      ["ethers's bignumber instances", ethers.BigNumber.from(1)],
      ["bn.js instances", new BN(1)],
    ];

    for (const [type, value] of nonceExamples) {
      it(`should accept an argument of type ${type}`, async function () {
        const initialHeight = await hh.time.latestBlock();
        const newHeight = await hh.time.advanceBlock(value);
        const endHeight = await hh.time.latestBlock();

        assert.strictEqual(newHeight, endHeight);
        assert.strictEqual(initialHeight + 1, endHeight);
      });
    }
  });
});
