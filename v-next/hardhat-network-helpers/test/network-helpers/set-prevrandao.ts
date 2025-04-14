import type { NetworkHelpers, NumberLike } from "../../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

async function getPrevRandao(provider: EthereumProvider) {
  const block = await provider.request({
    method: "eth_getBlockByNumber",
    params: ["latest", false],
  });

  assertHardhatInvariant(
    typeof block === "object" &&
      block !== null &&
      "mixHash" in block &&
      typeof block.mixHash === "string",
    "block.mixHash is not a string",
  );

  return BigInt(block.mixHash);
}

describe("network-helpers - setPrevRandao", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the next block's prevRandao", async () => {
    await networkHelpers.setPrevRandao(12345);
    await networkHelpers.mine();

    assert.equal(await getPrevRandao(provider), 12345n);
  });

  describe("accepted parameter types for next block's prevRandao", () => {
    const prevRandaoExamples: Array<[string, NumberLike, bigint]> = [
      ["number", 2000001, 2000001n],
      ["bigint", BigInt(2000002), 2000002n],
      ["hex encoded", "0x1e8483", 2000003n],
      ["hex encoded with leading zeros", "0x01e240", 123456n],
    ];

    for (const [type, value, expectedPrevRandao] of prevRandaoExamples) {
      it(`should accept prevRandao of type ${type}`, async () => {
        await networkHelpers.setPrevRandao(value);
        await networkHelpers.mine();

        assert.equal(await getPrevRandao(provider), expectedPrevRandao);
      });
    }

    it("should not accept strings that are not 0x-prefixed", async () => {
      await assertRejectsWithHardhatError(
        async () => networkHelpers.setPrevRandao("3"),
        HardhatError.ERRORS.NETWORK_HELPERS.GENERAL
          .ONLY_ALLOW_0X_PREFIXED_STRINGS,
        {},
      );
    });
  });
});
