import type { NetworkHelpers, NumberLike } from "../../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork, rpcQuantityToNumber } from "../helpers/helpers.js";

describe("network-helpers - mine", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  const getBlockNumber = async () => {
    const blockNumber = await provider.request({
      method: "eth_blockNumber",
    });

    assertHardhatInvariant(
      typeof blockNumber === "string",
      "blockNumber is not a string",
    );

    return rpcQuantityToNumber(blockNumber);
  };

  const getBlockTimestamp = async (blockNumber = "latest") => {
    const block = await provider.request({
      method: "eth_getBlockByNumber",
      params: [blockNumber, false],
    });

    assertHardhatInvariant(
      typeof block === "object" &&
        block !== null &&
        "timestamp" in block &&
        typeof block.timestamp === "string",
      "block.timestamp is not a string",
    );

    return rpcQuantityToNumber(block.timestamp);
  };

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should mine a single block by default", async () => {
    const blockNumberBefore = await getBlockNumber();

    await networkHelpers.mine();

    assert.equal(await getBlockNumber(), blockNumberBefore + 1);
  });

  it("should mine the given number of blocks", async () => {
    const blockNumberBefore = await getBlockNumber();

    await networkHelpers.mine(100);

    assert.equal(await getBlockNumber(), blockNumberBefore + 100);
  });

  it("should accept an interval", async () => {
    const blockNumberBefore = await getBlockNumber();
    const blockTimestampBefore = await getBlockTimestamp();

    await networkHelpers.mine(100, {
      interval: 600,
    });

    assert.equal(await getBlockNumber(), blockNumberBefore + 100);
    assert.equal(
      await getBlockTimestamp(),
      blockTimestampBefore + 1 + 99 * 600,
    );
  });

  describe("accepted parameter types for blocks", () => {
    const blocksExamples: Array<[string, NumberLike, number]> = [
      ["number", 100, 100],
      ["bigint", BigInt(100), 100],
      ["bigint with n notation", 100n, 100],
      ["hex encoded", "0x64", 100],
      ["hex encoded with leading zeros", "0x0A", 10],
    ];

    for (const [type, value, expectedMinedBlocks] of blocksExamples) {
      it(`should accept blocks of type ${type}`, async () => {
        const blockNumberBefore = await getBlockNumber();
        await networkHelpers.mine(value);
        assert.equal(
          await getBlockNumber(),
          blockNumberBefore + expectedMinedBlocks,
        );
      });
    }
  });

  it("should throw because the string is not 0x-prefixed", async () => {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.mine("3"),
      HardhatError.ERRORS.NETWORK_HELPERS.ONLY_ALLOW_0X_PREFIXED_STRINGS,
      {},
    );
  });

  describe("accepted parameter types for interval", function () {
    const intervalExamples: Array<[string, NumberLike, number]> = [
      ["number", 60, 60],
      ["bigint", BigInt(60), 60],
      ["bigint with n notation", 60n, 60],
      ["hex encoded", "0x3c", 60],
      ["hex encoded with leading zeros", "0x0A", 10],
    ];

    for (const [type, value, expectedInterval] of intervalExamples) {
      it(`should accept intervals of type ${type}`, async () => {
        const blockTimestampBefore = await getBlockTimestamp();
        await networkHelpers.mine(100, {
          interval: value,
        });
        assert.equal(
          await getBlockTimestamp(),
          blockTimestampBefore + 1 + 99 * expectedInterval,
        );
      });
    }
  });

  it("should throw because the string is not 0x-prefixed", async () => {
    await assertRejectsWithHardhatError(
      async () =>
        networkHelpers.mine(100, {
          interval: "3",
        }),
      HardhatError.ERRORS.NETWORK_HELPERS.ONLY_ALLOW_0X_PREFIXED_STRINGS,
      {},
    );
  });
});
