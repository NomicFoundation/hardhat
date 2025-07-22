import type { NetworkHelpers, NumberLike } from "../../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork, rpcQuantityToNumber } from "../helpers/helpers.js";

async function getNonce(provider: EthereumProvider, address: string) {
  const nonce = await provider.request({
    method: "eth_getTransactionCount",
    params: [address],
  });

  assertHardhatInvariant(typeof nonce === "string", "nonce is not a string");

  return rpcQuantityToNumber(nonce);
}

describe("network-helpers - setNonce", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;
  const account = "0x000000000000000000000000000000000000bEEF";

  beforeEach(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should allow setting the nonce of an unused address", async () => {
    await networkHelpers.setNonce(account, 5);

    assert.equal(await getNonce(provider, account), 5);
  });

  it("should allow setting the nonce of a used address", async () => {
    await networkHelpers.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");

    await provider.request({
      method: "hardhat_impersonateAccount",
      params: [account],
    });

    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: "0x000000000000000000000000000000000000BEEe",
          value: "0x1",
        },
      ],
    });

    await networkHelpers.mine();

    assert.equal(await getNonce(provider, account), 1);

    await networkHelpers.setNonce(account, 5);

    assert.equal(await getNonce(provider, account), 5);
  });

  it("should not allow setting a nonce smaller than the current nonce", async () => {
    await networkHelpers.setNonce(account, 5);

    assert.equal(await getNonce(provider, account), 5);
  });

  describe("accepted parameter types for nonce", () => {
    const nonceExamples: Array<[string, NumberLike, number]> = [
      ["number", 2000001, 2000001],
      ["bigint", BigInt(2000002), 2000002],
      ["hex encoded", "0x1e8483", 2000003],
      ["hex encoded with leading zeros", "0x1e8484", 2000004],
    ];

    for (const [type, value, expectedNonce] of nonceExamples) {
      it(`should accept nonce of type ${type}`, async () => {
        await networkHelpers.setNonce(account, value);

        assert.equal(await getNonce(provider, account), expectedNonce);
      });
    }
  });

  it("should throw because the address is invalid", async () => {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.setNonce("0xCF", 1),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_ADDRESS,
      {
        value: "0xCF",
      },
    );
  });

  it("should throw because the nonce is invalid", async () => {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.setNonce(account, "CF"),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL
        .ONLY_ALLOW_0X_PREFIXED_STRINGS,
      {},
    );
  });
});
