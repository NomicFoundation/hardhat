const assert = require("assert");

describe("test suite 2", function () {
  it("should start with block number 0", async function () {
    const blockNumber = await network.provider.send("eth_blockNumber");

    assert(blockNumber === "0x0");

    // send a tx to increase the block number
    const [a] = await network.provider.send("eth_accounts");
    await network.provider.send("eth_sendTransaction", [
      {
        from: a,
        to: a,
      },
    ]);
  });
});
