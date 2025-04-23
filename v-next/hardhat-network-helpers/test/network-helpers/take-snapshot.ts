import type { NetworkHelpers } from "../../src/types.js";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { getBlockNumber, initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - takeSnapshot", () => {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  before(async () => {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("should take a snapshot", async () => {
    const blockNumberBefore = await getBlockNumber(provider);

    const snapshot = await networkHelpers.takeSnapshot();

    await networkHelpers.mine();
    assert.equal(await getBlockNumber(provider), blockNumberBefore + 1);

    await snapshot.restore();
    assert.equal(await getBlockNumber(provider), blockNumberBefore);
  });

  it("revert can be called more than once", async () => {
    const blockNumberBefore = await getBlockNumber(provider);

    const snapshot = await networkHelpers.takeSnapshot();

    await networkHelpers.mine();
    assert.equal(await getBlockNumber(provider), blockNumberBefore + 1);

    await snapshot.restore();
    assert.equal(await getBlockNumber(provider), blockNumberBefore);

    await networkHelpers.mine();
    await networkHelpers.mine();
    assert.equal(await getBlockNumber(provider), blockNumberBefore + 2);

    await snapshot.restore();
    assert.equal(await getBlockNumber(provider), blockNumberBefore);
  });

  it("should throw if an invalid snapshot is restored", async () => {
    const snapshot1 = await networkHelpers.takeSnapshot();
    const snapshot2 = await networkHelpers.takeSnapshot();

    await snapshot1.restore();

    await assertRejectsWithHardhatError(
      async () => snapshot2.restore(),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.INVALID_SNAPSHOT,
      {},
    );
  });
});
