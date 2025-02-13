import type { NetworkHelpers } from "../../src/types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { getBalance, initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - setBalance", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  const recipient = "0x000000000000000000000000000000000000bEEF";

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the balance of a given address", async function () {
    await networkHelpers.setBalance(recipient, 1234567);

    assert.equal(await getBalance(provider, recipient), 1234567);
  });

  describe("accepted parameter types for balance", function () {
    const balanceExamples: Array<[string, any, number]> = [
      ["number", 2000001, 2000001],
      ["bigint", BigInt(2000002), 2000002],
      ["hex encoded", "0x1e8483", 2000003],
      ["hex encoded with leading zeros", "0x01e240", 123456],
    ];

    for (const [type, value, expectedBalance] of balanceExamples) {
      it(`should accept balance of type ${type}`, async function () {
        await networkHelpers.setBalance(recipient, value);

        assert.equal(await getBalance(provider, recipient), expectedBalance);
      });
    }
  });

  it("should throw because the address is invalid", async function () {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.setBalance("0xCF", 1),
      HardhatError.ERRORS.NETWORK_HELPERS.INVALID_ADDRESS,
      {
        value: "0xCF",
      },
    );
  });
});
