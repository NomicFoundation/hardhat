import { assert } from "chai";

import { FixtureAnonymousFunctionError } from "../src/errors";
import { loadFixture } from "../src/loadFixture";
import { useEnvironment, rpcQuantityToNumber } from "./test-utils";

describe("loadFixture", function () {
  useEnvironment("simple");

  const mineBlock = async () => {
    await this.ctx.hre.network.provider.request({
      method: "evm_mine",
    });
  };

  const getBlockNumber = async () => {
    const blockNumber = await this.ctx.hre.network.provider.send(
      "eth_blockNumber"
    );

    return rpcQuantityToNumber(blockNumber);
  };

  it("calls the fixture the first time it's used", async function () {
    let calledCount = 0;

    async function mineBlockFixture() {
      calledCount++;
      await mineBlock();
    }

    const blockNumberBefore = await getBlockNumber();

    await loadFixture(mineBlockFixture);

    const blockNumberAfter = await getBlockNumber();

    assert.equal(calledCount, 1);
    assert.equal(blockNumberAfter, blockNumberBefore + 1);
  });

  it("doesn't call the fixture the second time it's used", async function () {
    let calledCount = 0;

    async function mineBlockFixture() {
      calledCount++;
      await mineBlock();
    }

    const blockNumberBefore = await getBlockNumber();

    await loadFixture(mineBlockFixture);
    assert.equal(calledCount, 1);
    assert.equal(await getBlockNumber(), blockNumberBefore + 1);

    await mineBlock();
    await mineBlock();
    assert.equal(await getBlockNumber(), blockNumberBefore + 3);

    await loadFixture(mineBlockFixture);
    assert.equal(calledCount, 1);
    assert.equal(await getBlockNumber(), blockNumberBefore + 1);
  });

  it("the result of the fixture is returned", async function () {
    async function mineBlockFixture() {
      await mineBlock();

      return 123;
    }

    assert.equal(await loadFixture(mineBlockFixture), 123);
    assert.equal(await loadFixture(mineBlockFixture), 123);
  });

  it("should take snapshot again when trying to revert to future state", async function () {
    let calledCount = 0;
    async function mineBlockFixture() {
      await mineBlock();
    }
    async function mineTwoBlocksFixture() {
      calledCount++;
      await mineBlock();
      await mineBlock();
    }

    await loadFixture(mineBlockFixture);
    await loadFixture(mineTwoBlocksFixture);
    await loadFixture(mineBlockFixture);
    await loadFixture(mineTwoBlocksFixture);
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
        calledCount.set(i, calledCount.get(i)! + 1);
      };
    });

    // run all fixtures and check they were called once
    for (const fixtureFunction of fixturesFunctions) {
      await loadFixture(fixtureFunction);
    }
    for (let i = 0; i < fixturesFunctions.length; i++) {
      assert.equal(calledCount.get(i), 1);
    }

    // we run the second fixture again, this should remove all the ones that
    // are after rit
    await loadFixture(fixturesFunctions[1]);
    assert.equal(calledCount.get(1), 1);

    // the last fixture should be run again
    await loadFixture(fixturesFunctions[15]);
    assert.equal(calledCount.get(15), 2);

    // the first one shouldn't be removed
    await loadFixture(fixturesFunctions[0]);
    assert.equal(calledCount.get(0), 1);
  });

  it("should throw when an anonymous regular function is used", async function () {
    await assert.isRejected(
      loadFixture(async function () {}),
      FixtureAnonymousFunctionError
    );
  });

  it("should throw when an anonymous arrow function is used", async function () {
    await assert.isRejected(
      loadFixture(async () => {}),
      FixtureAnonymousFunctionError
    );
  });
});
