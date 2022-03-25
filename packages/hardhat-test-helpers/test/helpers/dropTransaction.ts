import { assert } from "chai";

import * as hh from "../../src";
import { useEnvironment, rpcQuantityToNumber } from "../test-utils";

describe("dropTransaction", function () {
  useEnvironment("simple");
  const account = "0x000000000000000000000000000000000000beef";
  const recipient = "0x000000000000000000000000000000000000beee";

  it("should drop a given transaction from the mempool", async function () {
    await this.hre.network.provider.send("evm_setAutomine", [false]);
    await hh.setBalance(account, "0xaaaaaaaaaaaaaaaaaaaaaa");
    await hh.impersonateAccount(account);
    await hh.mine();
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
    assert.equal(pendingTxs[0].hash, txHash);
    await hh.dropTransaction(txHash);
    pendingTxs = await this.hre.network.provider.send(
      "eth_pendingTransactions"
    );
    assert.equal(pendingTxs.length, 0);
  });
});
