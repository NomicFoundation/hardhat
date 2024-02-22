import { assert } from "chai";

import * as hh from "../../src";
import { useEnvironment } from "../test-utils";

describe("setCoinbase", function () {
  useEnvironment("simple");
  const newCoinbase = "0x000000000000000000000000000000000000bEEF";

  const getCoinbase = async () => {
    const coinbase = await this.ctx.hre.network.provider.send(
      "eth_coinbase",
      []
    );

    return coinbase;
  };

  it("should allow setting the coinbase", async function () {
    await hh.setCoinbase(newCoinbase);

    assert.strictEqual(
      (await getCoinbase()).toLowerCase(),
      newCoinbase.toLowerCase()
    );
  });

  describe("invalid parameter types for coinbase", function () {
    const invalidCoinbaseExamples: Array<[string, any]> = [
      ["non-hex-encoded strings", "test"],
      ["hex strings missing 0x prefix", newCoinbase.slice(2)],
      ["numbers", 0xbeef],
    ];

    for (const [type, value] of invalidCoinbaseExamples) {
      it(`should not accept coinbase of type ${type}`, async function () {
        await assert.isRejected(hh.setCoinbase(value));
      });
    }
  });
});
