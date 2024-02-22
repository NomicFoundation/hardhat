import { assert } from "chai";

import * as hh from "../../src";
import { useEnvironment } from "../test-utils";

describe("dropTransaction", function () {
  useEnvironment("simple");
  const account = "0x000000000000000000000000000000000000bEEF";
  const recipient = "0x000000000000000000000000000000000000BEEe";

  it("should drop a given transaction from the mempool", async function () {
    await this.hre.network.provider.send("evm_setAutomine", [false]);
    await hh.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");
    await hh.impersonateAccount(account);
    const txHash = await this.hre.network.provider.send("eth_sendTransaction", [
      {
        from: account,
        to: recipient,
        value: "0x1",
      },
    ]);

    let pendingTxs = await this.hre.network.provider.send(
      "eth_pendingTransactions"
    );

    // ensure tx is in mempool
    assert.strictEqual(pendingTxs[0].hash, txHash);
    await hh.dropTransaction(txHash);
    pendingTxs = await this.hre.network.provider.send(
      "eth_pendingTransactions"
    );
    assert.strictEqual(pendingTxs.length, 0);
  });

  describe("invalid parameters for txHash", function () {
    const txHashExamples: Array<[string, string]> = [
      ["non-prefixed hex string", "beef"],
      ["hex string of incorrect length", "0xbeef"],
      ["non-hex string", "test"],
    ];

    for (const [type, value] of txHashExamples) {
      it(`should not accept txHash of type ${type}`, async function () {
        await assert.isRejected(hh.dropTransaction(value));
      });
    }
  });
});
