import { assert } from "chai";

import { FixtureSnapshotError } from "../src/errors";
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

  it("should throw the right error when an invalid snapshot is reverted", async function () {
    async function mineBlockFixture() {
      await mineBlock();
    }
    async function mineTwoBlocksFixture() {
      await mineBlock();
      await mineBlock();
    }

    await loadFixture(mineBlockFixture);
    await loadFixture(mineTwoBlocksFixture);
    await loadFixture(mineBlockFixture);
    await assert.isRejected(
      loadFixture(mineTwoBlocksFixture),
      FixtureSnapshotError
    );
  });
});
