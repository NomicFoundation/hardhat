import type { NetworkHelpers } from "../../src/types.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";

import { toBigInt } from "../../src/internal/conversion.js";
import { initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - mineUpTo", () => {
  let networkHelpers: NetworkHelpers;

  before(async () => {
    ({ networkHelpers } = await initializeNetwork());
  });

  it("should increase the block height to the given block number", async () => {
    const initialHeight = await networkHelpers.time.latestBlock();

    await networkHelpers.mineUpTo(initialHeight + 3);

    const endHeight = await networkHelpers.time.latestBlock();

    assert.equal(initialHeight + 3, endHeight);
  });

  it("should throw if given a number equal to the current height", async () => {
    const initialHeight = await networkHelpers.time.latestBlock();

    await assertRejectsWithHardhatError(
      async () => networkHelpers.mineUpTo(initialHeight),
      HardhatError.ERRORS.NETWORK_HELPERS.BLOCK_NUMBER_SMALLER_THAN_CURRENT,
      {
        newValue: await toBigInt(initialHeight),
        currentValue: await toBigInt(initialHeight),
      },
    );
  });

  describe("accepted parameter types for block number", () => {
    it("should accept an argument of type bigint", async () => {
      const initialHeight = await networkHelpers.time.latestBlock();

      await networkHelpers.mineUpTo(BigInt(initialHeight) + BigInt(3));

      const endHeight = await networkHelpers.time.latestBlock();

      assert.equal(initialHeight + 3, endHeight);
    });

    it("should accept an argument of type ethers's bignumber", async () => {
      const initialHeight = await networkHelpers.time.latestBlock();

      await networkHelpers.mineUpTo((await toBigInt(initialHeight)) + 3n);

      const endHeight = await networkHelpers.time.latestBlock();

      assert.equal(initialHeight + 3, endHeight);
    });

    it("should accept an argument of type hex string", async () => {
      const initialHeight = await networkHelpers.time.latestBlock();
      const targetHeight = (await toBigInt(initialHeight)) + 3n;

      await networkHelpers.mineUpTo(numberToHexString(targetHeight));

      const endHeight = await networkHelpers.time.latestBlock();

      assert.equal(initialHeight + 3, endHeight);
    });
  });
});
