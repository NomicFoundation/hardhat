import { assert } from "chai";
import { BN } from "ethereumjs-util";
import { ethers } from "ethers-v5";

import * as hh from "../../src";
import { NumberLike } from "../../src/types";
import { useEnvironment, rpcQuantityToNumber } from "../test-utils";

describe("setBalance", function () {
  useEnvironment("simple");
  const recipient = "0x000000000000000000000000000000000000bEEF";

  const getBalance = async (address: string) => {
    const balance = await this.ctx.hre.network.provider.send("eth_getBalance", [
      address,
    ]);

    return rpcQuantityToNumber(balance);
  };

  it("should allow setting the balance of a given address", async function () {
    await hh.setBalance(recipient, 1234567);

    assert.equal(await getBalance(recipient), 1234567);
  });

  describe("accepted parameter types for balance", function () {
    const balanceExamples: Array<[string, NumberLike, number]> = [
      ["number", 2000001, 2000001],
      ["bigint", BigInt(2000002), 2000002],
      ["hex encoded", "0x1e8483", 2000003],
      ["hex encoded with leading zeros", "0x01e240", 123456],
      ["ethers's bignumber instances", ethers.BigNumber.from(2000004), 2000004],
      ["bn.js instances", new BN(2000005), 2000005],
    ];

    for (const [type, value, expectedBalance] of balanceExamples) {
      it(`should accept balance of type ${type}`, async function () {
        await hh.setBalance(recipient, value);

        assert.equal(await getBalance(recipient), expectedBalance);
      });
    }

    it("should not accept strings that are not 0x-prefixed", async function () {
      await assert.isRejected(hh.setBalance("3", 1));
    });
  });
});
