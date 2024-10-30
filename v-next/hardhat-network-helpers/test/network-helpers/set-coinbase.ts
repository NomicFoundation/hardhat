import type { NetworkHelpers } from "../../src/types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

async function getCoinbase(provider: EthereumProvider) {
  const coinbase = await provider.request({
    method: "eth_coinbase",
    params: [],
  });

  assertHardhatInvariant(
    typeof coinbase === "string",
    "coinbase is not a string",
  );

  return coinbase;
}

describe("network-helpers - setCoinbase", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;
  const newCoinbase = "0x000000000000000000000000000000000000bEEF";

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the coinbase", async () => {
    await networkHelpers.setCoinbase(newCoinbase);

    assert.equal(
      (await getCoinbase(provider)).toLowerCase(),
      newCoinbase.toLowerCase(),
    );
  });

  it(`should throw because the address is invalid`, async () => {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.setCoinbase("0x123"),
      HardhatError.ERRORS.NETWORK_HELPERS.INVALID_ADDRESS,
      { value: "0x123" },
    );
  });
});
