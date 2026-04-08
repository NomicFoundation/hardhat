import type { NetworkHelpers } from "../../src/types.js";
import type { NetworkConnection } from "hardhat/types/network";

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { initializeNetwork } from "../helpers/helpers.js";

describe("network-helpers - loadFixture", () => {
  let networkHelpers: NetworkHelpers;

  before(async () => {
    ({ networkHelpers } = await initializeNetwork());
  });

  it("calls the fixture the first time it's used", async function () {
    let calledCount = 0;

    async function mineBlockFixture() {
      calledCount++;
      await networkHelpers.mine();
    }

    const blockNumberBefore = await networkHelpers.time.latestBlock();

    await networkHelpers.loadFixture(mineBlockFixture);

    const blockNumberAfter = await networkHelpers.time.latestBlock();

    assert.equal(calledCount, 1);
    assert.equal(blockNumberAfter, blockNumberBefore + 1);
  });

  it("should have the connection object", async function () {
    async function checkConnectionFixture(
      connection: NetworkConnection<"generic">,
    ) {
      assert.ok(
        connection.networkName !== undefined,
        "networkName should be defined",
      );
      assert.ok(
        connection.networkConfig !== undefined,
        "networkConfig should be defined",
      );
      assert.ok(
        connection.provider !== undefined,
        "provider should be defined",
      );
    }

    await networkHelpers.loadFixture(checkConnectionFixture);
  });

  it("doesn't call the fixture the second time it's used", async function () {
    let calledCount = 0;

    async function mineBlockFixture() {
      calledCount++;
      await networkHelpers.mine();
    }

    const blockNumberBefore = await networkHelpers.time.latestBlock();

    await networkHelpers.loadFixture(mineBlockFixture);
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

    await networkHelpers.loadFixture(mineBlockFixture);
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

    assert.equal(await networkHelpers.loadFixture(mineBlockFixture), 123);
    assert.equal(await networkHelpers.loadFixture(mineBlockFixture), 123);
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

    await networkHelpers.loadFixture(mineBlockFixture);
    await networkHelpers.loadFixture(mineTwoBlocksFixture);
    await networkHelpers.loadFixture(mineBlockFixture);
    await networkHelpers.loadFixture(mineTwoBlocksFixture);
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
      await networkHelpers.loadFixture(fixtureFunction);
    }
    for (let i = 0; i < fixturesFunctions.length; i++) {
      assert.equal(calledCount.get(i), 1);
    }

    // we run the second fixture again, this should remove all the ones that
    // are after it
    await networkHelpers.loadFixture(fixturesFunctions[1]);
    assert.equal(calledCount.get(1), 1);

    // the last fixture should be run again
    await networkHelpers.loadFixture(fixturesFunctions[15]);
    assert.equal(calledCount.get(15), 2);

    // the first one shouldn't be removed
    await networkHelpers.loadFixture(fixturesFunctions[0]);
    assert.equal(calledCount.get(0), 1);
  });

  it("should throw when an anonymous regular function is used", async function () {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.loadFixture(async function () {}),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL
        .FIXTURE_ANONYMOUS_FUNCTION_ERROR,
      {},
    );
  });

  it("should throw when an anonymous arrow function is used", async function () {
    await assertRejectsWithHardhatError(
      async () => networkHelpers.loadFixture(async () => {}),
      HardhatError.ERRORS.NETWORK_HELPERS.GENERAL
        .FIXTURE_ANONYMOUS_FUNCTION_ERROR,
      {},
    );
  });

  describe("multiple different connections should use different fixtures", () => {
    // This suite verifies that each new network connection gets its own "snapshots" array.
    // Because we create a fresh "networkHelpers" instance for every test,
    // the fixture should run for each test and not be cached across connections.

    let calledCount = 0;

    async function mineBlockFixture() {
      calledCount++;
    }

    beforeEach(async () => {
      ({ networkHelpers } = await initializeNetwork());
    });

    it("should execute the fixture the first time", async () => {
      await networkHelpers.loadFixture(mineBlockFixture);

      // Executing the fixture should increment `calledCount` to 1.
      assert.equal(calledCount, 1);
    });

    it("should execute the fixture the second time", async () => {
      await networkHelpers.loadFixture(mineBlockFixture);

      // Loading the fixture again (with a new connection) should increment `calledCount` to 2.
      assert.equal(calledCount, 2);
    });
  });
});
