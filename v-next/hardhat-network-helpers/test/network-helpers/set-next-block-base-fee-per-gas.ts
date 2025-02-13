import type { NetworkHelpers, NumberLike } from "../../src/types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork, rpcQuantityToNumber } from "../helpers/helpers.js";

async function getBaseFeePerGas(
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
      "baseFeePerGas" in block &&
      typeof block.baseFeePerGas === "string",
    "block.baseFeePerGas is not a string",
  );

  return rpcQuantityToNumber(block.baseFeePerGas);
}

describe("network-helpers - setNextBlockBaseFeePerGas", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the next block's base fee per gas", async () => {
    await networkHelpers.setNextBlockBaseFeePerGas(1234567);
    await networkHelpers.mine();

    assert.equal(await getBaseFeePerGas(provider), 1234567);
  });

  describe("accepted parameter types for next block's base fee per gas", () => {
    const blockBaseFeeExamples: Array<[string, NumberLike, number]> = [
      ["number", 2000001, 2000001],
      ["bigint", BigInt(2000002), 2000002],
      ["hex encoded", "0x1e8483", 2000003],
      ["hex encoded with leading zeros", "0x01e240", 123456],
    ];

    for (const [type, value, expectedBaseFeePerGas] of blockBaseFeeExamples) {
      it(`should accept base fee per gas of type ${type}`, async () => {
        await networkHelpers.setNextBlockBaseFeePerGas(value);
        await networkHelpers.mine();

        assert.equal(await getBaseFeePerGas(provider), expectedBaseFeePerGas);
      });
    }

    it("should throw because the the string is not 0x-prefixed", async () => {
      await assertRejectsWithHardhatError(
        async () => networkHelpers.setNextBlockBaseFeePerGas("3"),
        HardhatError.ERRORS.NETWORK_HELPERS.ONLY_ALLOW_0X_PREFIXED_STRINGS,
        {},
      );
    });
  });
});
