import type { NetworkHelpers } from "../src/internal/network-helpers/network-helpers.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { loadFixture } from "../src/load-fixture.js";

import { initializeNetwork } from "./helpers/helpers.js";

describe("loadFixture", function () {
  let networkHelpers: NetworkHelpers;
  let provider: EthereumProvider;

  before(async function () {
    ({ provider, networkHelpers } = await initializeNetwork());
  });

  it("calls the fixture the first time it's used", async function () {
    let calledCount = 0;

    async function mineBlockFixture() {
      calledCount++;
      await networkHelpers.mine();
    }

    const blockNumberBefore = await networkHelpers.time.latestBlock();

    await loadFixture(mineBlockFixture, provider);

    const blockNumberAfter = await networkHelpers.time.latestBlock();

    assert.equal(calledCount, 1);
    assert.equal(blockNumberAfter, blockNumberBefore + 1);
  });

  it("doesn't call the fixture the second time it's used", async function () {
    let calledCount = 0;

    async function mineBlockFixture() {
      calledCount++;
      await networkHelpers.mine();
    }

    const blockNumberBefore = await networkHelpers.time.latestBlock();

    await loadFixture(mineBlockFixture, provider);
    assert.equal(calledCount, 1);
    assert.equal(
      await networkHelpers.time.latestBlock(),
      blockNumberBefore + 1,
    );

    await networkHelpers.mine();
    await networkHelpers.mine();
    assert.equal(
      await networkHelpers.time.latestBlock(),
      blockNumberBefore + 3,
    );

    await loadFixture(mineBlockFixture, provider);
    assert.equal(calledCount, 1);
    assert.equal(
      await networkHelpers.time.latestBlock(),
      blockNumberBefore + 1,
    );
  });

  it("the result of the fixture is returned", async function () {
    async function mineBlockFixture() {
      await networkHelpers.mine();

      return 123;
    }

    assert.equal(await loadFixture(mineBlockFixture, provider), 123);
    assert.equal(await loadFixture(mineBlockFixture, provider), 123);
  });

  it("should take snapshot again when trying to revert to future state", async function () {
    let calledCount = 0;
    async function mineBlockFixture() {
      await networkHelpers.mine();
    }
    async function mineTwoBlocksFixture() {
      calledCount++;
      await networkHelpers.mine();
      await networkHelpers.mine();
    }

    await loadFixture(mineBlockFixture, provider);
    await loadFixture(mineTwoBlocksFixture, provider);
    await loadFixture(mineBlockFixture, provider);
    await loadFixture(mineTwoBlocksFixture, provider);
    assert.equal(calledCount, 2);
  });

  it("should take snapshot again when trying to revert to future state (edge case)", async function () {
    // This tests is meant to check that snapshot ids are compared as numbers
    // and not as strings.
    // We run 16 fixtures, so that the last one has a snapshot id of 0x10, and
    // then we run again the second one (with a snapshot id of 0x2). The last
    // one should be removed because 0x2 <= 0x10, but this won't happen if they
    // are compared as strings.

    // keep track of how many times each fixture is called
    const calledCount: Map<number, number> = new Map();
    const fixturesFunctions = [...Array(16)].map((x, i) => {
      calledCount.set(i, 0);
      return async function mineBlockFixture() {
        const v = calledCount.get(i);
        assertHardhatInvariant(v !== undefined, "The value should be defined");
        calledCount.set(i, v + 1);
      };
    });

    // run all fixtures and check they were called once
    for (const fixtureFunction of fixturesFunctions) {
      await loadFixture(fixtureFunction, provider);
    }
    for (let i = 0; i < fixturesFunctions.length; i++) {
      assert.equal(calledCount.get(i), 1);
    }

    // we run the second fixture again, this should remove all the ones that
    // are after it
    await loadFixture(fixturesFunctions[1], provider);
    assert.equal(calledCount.get(1), 1);

    // the last fixture should be run again
    await loadFixture(fixturesFunctions[15], provider);
    assert.equal(calledCount.get(15), 2);

    // the first one shouldn't be removed
    await loadFixture(fixturesFunctions[0], provider);
    assert.equal(calledCount.get(0), 1);
  });

  it("should throw when an anonymous regular function is used", async function () {
    await assertRejectsWithHardhatError(
      async () => loadFixture(async function () {}, provider),
      HardhatError.ERRORS.NETWORK_HELPERS.FIXTURE_ANONYMOUS_FUNCTION_ERROR,
      {},
    );
  });

  it("should throw when an anonymous arrow function is used", async function () {
    await assertRejectsWithHardhatError(
      async () => loadFixture(async () => {}, provider),
      HardhatError.ERRORS.NETWORK_HELPERS.FIXTURE_ANONYMOUS_FUNCTION_ERROR,
      {},
    );
  });
});
