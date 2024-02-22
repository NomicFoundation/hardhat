import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../../src";
import { NumberLike } from "../../../src/types";
import { useEnvironment } from "../../test-utils";

describe("time#increase", function () {
  describe("simple project", function () {
    useEnvironment("simple");

    it("should mine a new block with the timestamp increased by a given number of seconds", async function () {
      const initialBlockNumber = await hh.time.latestBlock();
      const initialTimestamp = await hh.time.latest();

      const newTimestamp = initialTimestamp + 10000;

      const returnedTimestamp = await hh.time.increase(10000);

      const endBlockNumber = await hh.time.latestBlock();
      const endTimestamp = await hh.time.latest();

      assert.strictEqual(endBlockNumber, initialBlockNumber + 1);
      assert.strictEqual(newTimestamp, endTimestamp);
      assert.strictEqual(returnedTimestamp, endTimestamp);
      assert(endTimestamp - initialTimestamp === 10000);
    });

    it("should throw if given zero number of seconds", async function () {
      await assert.isRejected(hh.time.increase(0));
    });

    it("should throw if given a negative number of seconds", async function () {
      await assert.isRejected(hh.time.increase(-1));
    });

    describe("accepted parameter types for number of seconds", function () {
      const nonceExamples: Array<[string, NumberLike]> = [
        ["number", 100],
        ["bigint", BigInt(100)],
        ["hex encoded", "0x64"],
        ["ethers's bignumber instances", ethers.BigNumber.from(100)],
        ["bn.js instances", new BN(100)],
      ];

      for (const [type, value] of nonceExamples) {
        it(`should accept an argument of type ${type}`, async function () {
          const initialTimestamp = await hh.time.latest();

          await hh.time.increase(value);

          const endTimestamp = await hh.time.latest();

          assert(endTimestamp - initialTimestamp === 100);
        });
      }
    });
  });

  describe("blocks with same timestamp", function () {
    useEnvironment("allow-blocks-same-timestamp");

    it("should not throw if given zero number of seconds", async function () {
      const initialBlockNumber = await hh.time.latestBlock();
      const initialTimestamp = await hh.time.latest();

      const returnedTimestamp = await hh.time.increase(0);

      const endBlockNumber = await hh.time.latestBlock();
      const endTimestamp = await hh.time.latest();

      assert.strictEqual(endBlockNumber, initialBlockNumber + 1);
      assert.strictEqual(returnedTimestamp, endTimestamp);
      assert.strictEqual(endTimestamp, initialTimestamp);
    });

    it("should throw if given a negative number of seconds", async function () {
      await assert.isRejected(hh.time.increase(-1));
    });
  });
});
