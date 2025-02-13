import type { NetworkHelpers } from "../../src/types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { getBalance, initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - stopImpersonatingAccount", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;
  const account = "0x000000000000000000000000000000000000bEEF";
  const recipient = "0x000000000000000000000000000000000000BEEe";

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should stop impersonating the address being impersonated", async () => {
    await networkHelpers.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");

    // Ensure we're not already impersonating.
    // If we are not impersonating, the following code should fail (as expected).
    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify an error that is not thrown by Hardhat
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

    assert.equal(await getBalance(provider, recipient), 1);

    await networkHelpers.stopImpersonatingAccount(account);

    // It should throw because the account is not impersonating anymore
    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify an error that is not thrown by Hardhat
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
  });
});
