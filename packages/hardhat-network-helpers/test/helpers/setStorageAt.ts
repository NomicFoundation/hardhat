import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../src";
import { toPaddedRpcQuantity } from "../../src/utils";
import { NumberLike } from "../../src/types";
import { useEnvironment } from "../test-utils";

describe("setStorageAt", function () {
  useEnvironment("simple");
  const account = "0x000000000000000000000000000000000000bEEF";
  const code =
    "0x000000000000000000000000000000000000000000000000000000000000beef";

  const getStorageAt = async (
    address: string,
    index: NumberLike,
    block = "latest"
  ) => {
    const hexIndex = toPaddedRpcQuantity(index, 32);
    const data = await this.ctx.hre.network.provider.send("eth_getStorageAt", [
      address,
      hexIndex,
      block,
    ]);

    return data;
  };

  it("should allow setting the data at a specific storage index of a given address", async function () {
    await hh.setStorageAt(account, "0x1", code);

    assert.equal(await getStorageAt(account, "0x1"), code);
  });

  describe("accepted parameter types for index", function () {
    const indexExamples: Array<[string, NumberLike, number]> = [
      ["number", 1, 1],
      ["bigint", BigInt(1), 1],
      ["hex encoded", "0x1", 1],
      ["hex encoded with leading zeros", "0x01", 1],
      ["hex encoded with several leading zeros", "0x001", 1],
      ["ethers's bignumber instances", ethers.BigNumber.from(1), 1],
      ["bn.js instances", new BN(1), 1],
    ];

    for (const [type, value, expectedIndex] of indexExamples) {
      it(`should accept index of type ${type}`, async function () {
        await hh.setStorageAt(account, value, code);

        assert.equal(await getStorageAt(account, expectedIndex), code);
      });
    }

    it("should accept data that is not 64 bytes long", async function () {
      await hh.setStorageAt(account, "0x1", "0xbeef");

      assert.equal(await getStorageAt(account, "0x1"), code);
    });
  });
});
