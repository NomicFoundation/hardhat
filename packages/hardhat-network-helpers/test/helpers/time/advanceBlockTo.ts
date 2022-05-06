import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#advanceBlockTo", function () {
  useEnvironment("simple");

  it("should increase the block height to the given block number", async function () {
    const initialHeight = await hh.time.latestBlock();

    await hh.time.advanceBlockTo(initialHeight + 3);

    const endHeight = await hh.time.latestBlock();

    assert.equal(initialHeight + 3, endHeight);
  });

  it("should throw if given a number equal to the current height", async function () {
    const initialHeight = await hh.time.latestBlock();

    await assert.isRejected(hh.time.advanceBlockTo(initialHeight));
  });

  it("should throw if given a number lower than the current height", async function () {
    const initialHeight = await hh.time.latestBlock();

    await assert.isRejected(hh.time.advanceBlockTo(initialHeight - 1));
  });

  describe("accepted parameter types for block number", function () {
    it(`should accept an argument of type bigint`, async function () {
      const initialHeight = await hh.time.latestBlock();

      await hh.time.advanceBlockTo(BigInt(initialHeight) + BigInt(3));

      const endHeight = await hh.time.latestBlock();

      assert.equal(initialHeight + 3, endHeight);
    });

    it(`should accept an argument of type ethers's bignumber`, async function () {
      const initialHeight = await hh.time.latestBlock();

      await hh.time.advanceBlockTo(ethers.BigNumber.from(initialHeight).add(3));

      const endHeight = await hh.time.latestBlock();

      assert.equal(initialHeight + 3, endHeight);
    });

    it(`should accept an argument of type hex string`, async function () {
      const initialHeight = await hh.time.latestBlock();

      const targetHeight = ethers.BigNumber.from(initialHeight).add(3);
      await hh.time.advanceBlockTo(targetHeight.toHexString());

      const endHeight = await hh.time.latestBlock();

      assert.equal(initialHeight + 3, endHeight);
    });

    it(`should accept an argument of type bn.js`, async function () {
      const initialHeight = await hh.time.latestBlock();

      await hh.time.advanceBlockTo(new BN(initialHeight).addn(3));

      const endHeight = await hh.time.latestBlock();

      assert.equal(initialHeight + 3, endHeight);
    });
  });
});
