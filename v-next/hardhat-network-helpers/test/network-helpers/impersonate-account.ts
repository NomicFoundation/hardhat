import type { NetworkHelpers } from "../../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { getBalance, initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - impersonateAccount", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  const account = "0x000000000000000000000000000000000000bEEF";
  const recipient = "0x000000000000000000000000000000000000BEEe";

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow impersonating the given address", async () => {
    const recipientBalance = await getBalance(provider, recipient);

    await networkHelpers.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");

    // Ensure we're not already impersonating.
    // If we are not impersonating, the following code should fail (as expected).
    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify error not thrown by Hardhat
    await assert.rejects(
      provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: recipient,
            value: "0x1",
          },
        ],
      }),
    );

    await networkHelpers.impersonateAccount(account);

    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: recipient,
          value: "0x1",
        },
      ],
    });

    assert.equal(await getBalance(provider, recipient), recipientBalance + 1);
  });

  it("should throw because the address is not valid", async () => {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.setBalance("0xaa", 1),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_ADDRESS,
      {
        value: "0xaa",
      },
    );
  });
});
