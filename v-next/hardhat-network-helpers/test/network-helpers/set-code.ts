import type { NetworkHelpers } from "../../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

async function getCode(
  provider: EthereumProvider,
  address: string,
  block = "latest",
) {
  const code = await provider.request({
    method: "eth_getCode",
    params: [address, block],
  });
  return code;
}

describe("network-helpers - setCode", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;
  const recipient = "0x000000000000000000000000000000000000bEEF";

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the code of a given address", async () => {
    await networkHelpers.setCode(recipient, "0xa1a2a3");
    assert.equal(await getCode(provider, recipient), "0xa1a2a3");
  });

  it("should allow setting the code of a given address to an empty string", async function () {
    await networkHelpers.setCode(recipient, "0x");

    assert.equal(await getCode(provider, recipient), "0x");
  });

  describe("accepted parameter types for code", () => {
    it("should not accept strings that are not 0x-prefixed", async () => {
      await assertRejectsWithHardhatError(
        async () => networkHelpers.setCode(recipient, "a1a2a3"),
        HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_HEX_STRING,
        { value: "a1a2a3" },
      );
    });

    it("should not accept invalid addresses", async () => {
      await assertRejectsWithHardhatError(
        async () => networkHelpers.setCode("0x123", "0xaaa"),
        HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_ADDRESS,
        {
          value: "0x123",
        },
      );
    });
  });
});
