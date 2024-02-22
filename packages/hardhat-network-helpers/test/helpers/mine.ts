import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../src";
import { NumberLike } from "../../src/types";
import { useEnvironment, rpcQuantityToNumber } from "../test-utils";

describe("mine", function () {
  useEnvironment("simple");

  const getBlockNumber = async () => {
    const blockNumber = await this.ctx.hre.network.provider.send(
      "eth_blockNumber"
    );

    return rpcQuantityToNumber(blockNumber);
  };

  const getBlockTimestamp = async (blockNumber = "latest") => {
    const block = await this.ctx.hre.network.provider.send(
      "eth_getBlockByNumber",
      [blockNumber, false]
    );

    return rpcQuantityToNumber(block.timestamp);
  };

  it("should mine a single block by default", async function () {
    const blockNumberBefore = await getBlockNumber();

    await hh.mine();

    assert.strictEqual(await getBlockNumber(), blockNumberBefore + 1);
  });

  it("should mine the given number of blocks", async function () {
    const blockNumberBefore = await getBlockNumber();

    await hh.mine(100);

    assert.strictEqual(await getBlockNumber(), blockNumberBefore + 100);
  });

  it("should accept an interval", async function () {
    const blockNumberBefore = await getBlockNumber();
    const blockTimestampBefore = await getBlockTimestamp();

    await hh.mine(100, {
      interval: 600,
    });

    assert.strictEqual(await getBlockNumber(), blockNumberBefore + 100);
    assert.strictEqual(
      await getBlockTimestamp(),
      blockTimestampBefore + 1 + 99 * 600
    );
  });

  describe("accepted parameter types for blocks", function () {
    const blocksExamples: Array<[string, NumberLike, number]> = [
      ["number", 100, 100],
      ["bigint", BigInt(100), 100],
      ["hex encoded", "0x64", 100],
      ["hex encoded with leading zeros", "0x0A", 10],
      ["ethers's bignumber instances", ethers.BigNumber.from(100), 100],
      ["bn.js instances", new BN(100), 100],
    ];

    for (const [type, value, expectedMinedBlocks] of blocksExamples) {
      it(`should accept blocks of type ${type}`, async function () {
        const blockNumberBefore = await getBlockNumber();
        await hh.mine(value);
        assert.strictEqual(
          await getBlockNumber(),
          blockNumberBefore + expectedMinedBlocks
        );
      });
    }

    it("should not accept strings that are not 0x-prefixed", async function () {
      await assert.isRejected(hh.mine("3"));
    });
  });

  describe("accepted parameter types for interval", function () {
    const intervalExamples: Array<[string, NumberLike, number]> = [
      ["number", 60, 60],
      ["bigint", BigInt(60), 60],
      ["hex encoded", "0x3c", 60],
      ["hex encoded with leading zeros", "0x0A", 10],
      ["ethers's bignumber instances", ethers.BigNumber.from(60), 60],
      ["bn.js instances", new BN(60), 60],
    ];

    for (const [type, value, expectedInterval] of intervalExamples) {
      it(`should accept intervals of type ${type}`, async function () {
        const blockTimestampBefore = await getBlockTimestamp();
        await hh.mine(100, {
          interval: value,
        });
        assert.strictEqual(
          await getBlockTimestamp(),
          blockTimestampBefore + 1 + 99 * expectedInterval
        );
      });
    }

    it("should not accept strings that are not 0x-prefixed", async function () {
      await assert.isRejected(
        hh.mine(100, {
          interval: "3",
        })
      );
    });
  });
});
