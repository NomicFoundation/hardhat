import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../src";
import { BlockTag, NumberLike } from "../../src/types";
import { useEnvironment } from "../test-utils";

describe("getStorageAt", function () {
  useEnvironment("simple");
  const account = "0x000000000000000000000000000000000000bEEF";
  const code =
    "0x000000000000000000000000000000000000000000000000000000000000beef";

  it("should get the storage of a given address", async function () {
    await hh.setStorageAt(account, "0x1", code);

    assert.strictEqual(await hh.getStorageAt(account, "0x1"), code);
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

        assert.strictEqual(await hh.getStorageAt(account, expectedIndex), code);
      });
    }
  });

  describe("accepted parameter types for block", function () {
    const blockExamples: Array<[string, NumberLike | BlockTag]> = [
      ["number", 1],
      ["bigint", BigInt(1)],
      ["hex encoded", "0x1"],
      ["hex encoded with leading zeros", "0x01"],
      ["ethers's bignumber instances", ethers.BigNumber.from(1)],
      ["bn.js instances", new BN(1)],
      ["block tag latest", "latest"],
      ["block tag earliest", "earliest"],
      ["block tag pending", "pending"],
    ];

    for (const [type, value] of blockExamples) {
      it(`should accept block of type ${type}`, async function () {
        await hh.setStorageAt(account, 1, code);
        await hh.mine();

        await assert.isFulfilled(hh.getStorageAt(account, 1, value));
      });
    }
  });
});
