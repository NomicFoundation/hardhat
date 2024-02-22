import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../../src";
import { useEnvironment } from "../../test-utils";

describe("time#increaseTo", function () {
  describe("simple project", function () {
    useEnvironment("simple");

    it("should mine a new block with the given timestamp", async function () {
      const initialBlockNumber = await hh.time.latestBlock();
      const initialTimestamp = await hh.time.latest();

      const newTimestamp = initialTimestamp + 10000;

      await hh.time.increaseTo(newTimestamp);

      const endBlockNumber = await hh.time.latestBlock();
      const endTimestamp = await hh.time.latest();

      assert.equal(endBlockNumber, initialBlockNumber + 1);
      assert.equal(newTimestamp, endTimestamp);
      assert(endTimestamp - initialTimestamp === 10000);
    });

    it("should throw if given a timestamp that is equal to the current block timestamp", async function () {
      const initialTimestamp = await hh.time.latest();

      await assert.isRejected(hh.time.increaseTo(initialTimestamp));
    });

    it("should throw if given a timestamp that is less than the current block timestamp", async function () {
      const initialTimestamp = await hh.time.latest();

      await assert.isRejected(hh.time.increaseTo(initialTimestamp - 1));
    });

    describe("accepted parameter types for timestamp", function () {
      it(`should accept an argument of type bigint`, async function () {
        const initialTimestamp = await hh.time.latest();

        const newTimestamp = initialTimestamp + 3600;

        await hh.time.increaseTo(BigInt(newTimestamp));

        const endTimestamp = await hh.time.latest();

        assert.equal(newTimestamp, endTimestamp);
        assert(endTimestamp - initialTimestamp === 3600);
      });

      it(`should accept an argument of type ethers's bignumber`, async function () {
        const initialTimestamp = await hh.time.latest();

        const newTimestamp = initialTimestamp + 3600;

        await hh.time.increaseTo(ethers.BigNumber.from(newTimestamp));

        const endTimestamp = await hh.time.latest();

        assert.equal(newTimestamp, endTimestamp);
        assert(endTimestamp - initialTimestamp === 3600);
      });

      it(`should accept an argument of type hex string`, async function () {
        const initialTimestamp = await hh.time.latest();

        const newTimestamp = initialTimestamp + 3600;

        await hh.time.increaseTo(
          ethers.BigNumber.from(newTimestamp).toHexString()
        );

        const endTimestamp = await hh.time.latest();

        assert.equal(newTimestamp, endTimestamp);
        assert(endTimestamp - initialTimestamp === 3600);
      });

      it(`should accept an argument of type bn.js`, async function () {
        const initialTimestamp = await hh.time.latest();

        const newTimestamp = initialTimestamp + 3600;

        await hh.time.increaseTo(new BN(newTimestamp));

        const endTimestamp = await hh.time.latest();

        assert.equal(newTimestamp, endTimestamp);
        assert(endTimestamp - initialTimestamp === 3600);
      });

      it(`should accept an argument of type [Date]`, async function () {
        const initialTimestamp = await hh.time.latest();

        const newTimestamp = initialTimestamp + 3600;
        // multiply by 1000 because Date accepts Epoch millis
        await hh.time.increaseTo(new Date(newTimestamp * 1000));

        const endTimestamp = await hh.time.latest();

        assert.equal(newTimestamp, endTimestamp);
        assert(endTimestamp - initialTimestamp === 3600);
      });
    });
  });

  describe("blocks with same timestamp", function () {
    useEnvironment("allow-blocks-same-timestamp");

    it("should not throw if given a timestamp that is equal to the current block timestamp", async function () {
      const initialBlockNumber = await hh.time.latestBlock();
      const initialTimestamp = await hh.time.latest();

      await hh.time.increaseTo(initialTimestamp);

      const endBlockNumber = await hh.time.latestBlock();
      const endTimestamp = await hh.time.latest();

      assert.equal(endBlockNumber, initialBlockNumber + 1);
      assert.equal(endTimestamp, initialTimestamp);
    });

    it("should throw if given a timestamp that is less than the current block timestamp", async function () {
      const initialTimestamp = await hh.time.latest();

      await assert.isRejected(hh.time.increaseTo(initialTimestamp - 1));
    });
  });
});
