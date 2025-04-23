import type { NetworkHelpers } from "../../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - dropTransaction", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  const account = "0x000000000000000000000000000000000000bEEF";
  const recipient = "0x000000000000000000000000000000000000BEEe";

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());

    // Set auto mine so we can delay mining the function and test "dropTransaction"
    await provider.request({
      method: "evm_setAutomine",
      params: [false],
    });
  });

  it("should drop a given transaction from the mempool", async function () {
    await networkHelpers.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");
    await networkHelpers.impersonateAccount(account);

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: recipient,
          value: "0x1",
        },
      ],
    });

    assertHardhatInvariant(
      typeof txHash === "string",
      "txHash should be a string",
    );

    let pendingTxs = await provider.request({
      method: "eth_pendingTransactions",
    });

    assertHardhatInvariant(
      Array.isArray(pendingTxs),
      "pendingTxs should be an array",
    );

    // Ensure the transaction is in the mempool
    assert.equal(pendingTxs[0].hash, txHash);

    await networkHelpers.dropTransaction(txHash);

    pendingTxs = await provider.request({
      method: "eth_pendingTransactions",
    });

    assertHardhatInvariant(
      Array.isArray(pendingTxs),
      "pendingTxs should be an array",
    );

    assert.equal(pendingTxs.length, 0);
  });

  it(`should throw because the transaction hash is invalid`, async () => {
    await networkHelpers.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");
    await networkHelpers.impersonateAccount(account);

    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: recipient,
          value: "0x1",
        },
      ],
    });

    assertHardhatInvariant(
      typeof txHash === "string",
      "txHash should be a string",
    );

    await networkHelpers.mine(1);

    // eslint-disable-next-line no-restricted-syntax -- only used in test to verify error not thrown by Hardhat
    await assert.rejects(networkHelpers.dropTransaction(txHash));
  });

  it(`should throw because the transaction hash is invalid`, async function () {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.dropTransaction("0xaaa"),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_TX_HASH,
      {
        value: "0xaaa",
      },
    );
  });
});
