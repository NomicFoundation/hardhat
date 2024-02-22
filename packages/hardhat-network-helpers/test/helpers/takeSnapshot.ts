import { assert } from "chai";

import * as hh from "../../src";
import { useEnvironment, rpcQuantityToNumber } from "../test-utils";

describe("takeSnapshot", function () {
  useEnvironment("simple");

  const getBlockNumber = async () => {
    const blockNumber = await this.ctx.hre.network.provider.send(
      "eth_blockNumber"
    );

    return rpcQuantityToNumber(blockNumber);
  };

  it("should take a snapshot", async function () {
    const blockNumberBefore = await getBlockNumber();

    const snapshot = await hh.takeSnapshot();

    await hh.mine();
    assert.strictEqual(await getBlockNumber(), blockNumberBefore + 1);

    await snapshot.restore();
    assert.strictEqual(await getBlockNumber(), blockNumberBefore);
  });

  it("revert can be called more than once", async function () {
    const blockNumberBefore = await getBlockNumber();

    const snapshot = await hh.takeSnapshot();

    await hh.mine();
    assert.strictEqual(await getBlockNumber(), blockNumberBefore + 1);

    await snapshot.restore();
    assert.strictEqual(await getBlockNumber(), blockNumberBefore);

    await hh.mine();
    await hh.mine();
    assert.strictEqual(await getBlockNumber(), blockNumberBefore + 2);

    await snapshot.restore();
    assert.strictEqual(await getBlockNumber(), blockNumberBefore);
  });

  it("should throw if an invalid snapshot is restored", async function () {
    const snapshot1 = await hh.takeSnapshot();
    const snapshot2 = await hh.takeSnapshot();

    await snapshot1.restore();

    await assert.isRejected(snapshot2.restore());
  });
});
