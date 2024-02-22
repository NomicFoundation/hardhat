import { assert } from "chai";

import * as hh from "../../src";
import { useEnvironment, rpcQuantityToNumber } from "../test-utils";

describe("impersonateAccount", function () {
  useEnvironment("simple");
  const account = "0x000000000000000000000000000000000000bEEF";
  const recipient = "0x000000000000000000000000000000000000BEEe";

  const getBalance = async (address: string) => {
    const balance = await this.ctx.hre.network.provider.send("eth_getBalance", [
      address,
    ]);

    return rpcQuantityToNumber(balance);
  };

  it("should allow impersonating the given address", async function () {
    await hh.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");
    // ensure we're not already impersonating
    await assert.isRejected(
      this.hre.network.provider.send("eth_sendTransaction", [
        {
          from: account,
          to: recipient,
          value: "0x1",
        },
      ])
    );
    await hh.impersonateAccount(account);
    await this.hre.network.provider.send("eth_sendTransaction", [
      {
        from: account,
        to: recipient,
        value: "0x1",
      },
    ]);

    assert.strictEqual(await getBalance(recipient), 1);
  });
});
