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

async function getBlockGasLimit(
  provider: EthereumProvider,
  blockNumber = "latest",
) {
  const block = await provider.request({
    method: "eth_getBlockByNumber",
    params: [blockNumber, false],
  });

  assertHardhatInvariant(
    typeof block === "object" &&
      block !== null &&
      "gasLimit" in block &&
      typeof block.gasLimit === "string",
    "block.gasLimit is not a string",
  );

  return rpcQuantityToNumber(block.gasLimit);
}

describe("network-helpers - setBlockGasLimit", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the block gas limit", async () => {
    await networkHelpers.setBlockGasLimit(1234567);
    await networkHelpers.mine();

    assert.equal(await getBlockGasLimit(provider), 1234567);
  });

  describe("accepted parameter types for block gas limit", () => {
    const blockGasLimitExamples: Array<[string, NumberLike, number]> = [
      ["number", 2000001, 2000001],
      ["bigint", BigInt(2000002), 2000002],
      ["hex encoded", "0x1e8483", 2000003],
      ["hex encoded with leading zeros", "0x01e240", 123456],
    ];

    for (const [type, value, expectedBlockGasLimit] of blockGasLimitExamples) {
      it(`should accept blockGasLimit of type ${type}`, async () => {
        await networkHelpers.setBlockGasLimit(value);
        await networkHelpers.mine();

        assert.equal(await getBlockGasLimit(provider), expectedBlockGasLimit);
      });
    }

    it("should not accept strings that are not 0x-prefixed", async () => {
      await assertRejectsWithHardhatError(
        async () => networkHelpers.setBlockGasLimit("3"),
        HardhatError.ERRORS.NETWORK_HELPERS.ONLY_ALLOW_0X_PREFIXED_STRINGS,
        {},
      );
    });
  });
});
