import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers";

import * as hh from "../../src";
import { NumberLike } from "../../src/types";
import { useEnvironment } from "../test-utils";

describe("getStorageAt", function () {
  useEnvironment("simple");
  const account = "0x000000000000000000000000000000000000beef";
  const code =
    "0x000000000000000000000000000000000000000000000000000000000000beef";

  it("should get the storage of a given address", async function () {
    await hh.setStorageAt(account, "0x1", code);
    await hh.mine();

    assert.equal(await hh.getStorageAt(account, "0x1"), code);
  });

  describe("accepted parameter types for index", function () {
    const indexExamples: Array<[string, NumberLike, number]> = [
      ["number", 1, 1],
      ["bigint", BigInt(1), 1],
      ["hex encoded", "0x1", 1],
      ["hex encoded with leading zeros", "0x01", 1],
      ["ethers's bignumber instances", ethers.BigNumber.from(1), 1],
      ["bn.js instances", new BN(1), 1],
    ];

    for (const [type, value, expectedIndex] of indexExamples) {
      it(`should accept index of type ${type}`, async function () {
        await hh.setStorageAt(account, value, code);
        await hh.mine();

        assert.equal(await hh.getStorageAt(account, expectedIndex), code);
      });
    }
  });
});
