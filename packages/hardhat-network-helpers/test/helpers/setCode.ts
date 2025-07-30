import { assert } from "chai";

import * as hh from "../../src";
import { useEnvironment } from "../test-utils";

describe("setCode", function () {
  useEnvironment("simple");
  const recipient = "0x000000000000000000000000000000000000bEEF";

  const getCode = async (address: string, block = "latest") => {
    const code = await this.ctx.hre.network.provider.send("eth_getCode", [
      address,
      block,
    ]);

    return code;
  };

  it("should allow setting the code of a given address", async function () {
    await hh.setCode(recipient, "0xa1a2a3");

    assert.equal(await getCode(recipient), "0xa1a2a3");
  });

  it("should allow setting the code of a given address to an empty string", async function () {
    await hh.setCode(recipient, "0x");

    assert.equal(await getCode(recipient), "0x");
  });

  describe("accepted parameter types for code", function () {
    it("should not accept strings that are not 0x-prefixed", async function () {
      await assert.isRejected(hh.setCode(recipient, "a1a2a3"));
    });

    it("should not accept non-hex strings", async function () {
      await assert.isRejected(hh.setCode(recipient, "g1g2g3"));
    });
  });
});
